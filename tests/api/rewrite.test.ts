import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { cleanRewrite } from "@/lib/server/rewrite";
import { groqErr, groqOk, req } from "./helpers";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));

import { POST } from "@/app/api/rewrite/route";

const body = {
  text: "Built a website for a student club",
  instruction: "Make it match the posting",
  posting: { company: "Acme", role: "Web Intern", description: "Build React pages." },
};
let ip = 0;
const call = (b: unknown = body, opts: { origin?: string | null; raw?: string } = {}) =>
  POST(req("rewrite", b, { ip: `14.0.0.${++ip}`, ...opts }));

beforeEach(() => {
  resetServerState();
  h.create.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
});

describe("rewrite route", () => {
  it("rejects a foreign origin and a missing origin (403)", async () => {
    expect((await call(body, { origin: "https://evil.example" })).status).toBe(403);
    expect((await call(body, { origin: null })).status).toBe(403);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("rejects a body over 16 KB (413)", async () => {
    const res = await call({ ...body, text: "a".repeat(17_000) });
    expect(res.status).toBe(413);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("returns cleaned text, qwen first, 250 tokens, labeled data blocks", async () => {
    h.create.mockReturnValue(groqOk("<think>hmm</think>- **Built** a website for a student club using the posting's wording"));
    const res = await call();
    const json = await res.json();
    expect(json.status).toBe("done");
    expect(json.data.text).toBe("Built a website for a student club using the posting's wording");
    const params = h.create.mock.calls[0][0];
    expect(params.model).toBe("qwen/qwen3.8-27b");
    expect(params.max_completion_tokens).toBe(250);
    expect(params.response_format).toBeUndefined();
    const user = params.messages[1].content as string;
    expect(user).toContain("RESUME TEXT:\nBuilt a website");
    expect(user).toContain("POSTING ROLE:\nWeb Intern");
  });

  it("uses the default instruction when none is given", async () => {
    h.create.mockReturnValue(groqOk("Reworded."));
    await call({ text: "Did a thing", posting: { company: null, role: null, description: null } });
    expect(h.create.mock.calls[0][0].messages[1].content).toContain("INSTRUCTION:\nMake it match the posting");
  });

  it.each([
    ["empty text", { ...body, text: "" }],
    ["text over 600", { ...body, text: "a".repeat(601) }],
    ["non-string text", { ...body, text: 5 }],
    ["instruction over 200", { ...body, instruction: "a".repeat(201) }],
    ["company over 120", { ...body, posting: { ...body.posting, company: "a".repeat(121) } }],
    ["description over 2000", { ...body, posting: { ...body.posting, description: "a".repeat(2001) } }],
    ["non-string role", { ...body, posting: { ...body.posting, role: 3 } }],
  ])("rejects %s (400)", async (_n, b) => {
    expect((await call(b)).status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("returns 429 limit with the daily message once REWRITE_DAILY_CAP is reached", async () => {
    vi.stubEnv("REWRITE_DAILY_CAP", "1");
    h.create.mockReturnValue(groqOk("Reworded."));
    expect((await call()).status).toBe(200);
    const res = await call();
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.reason).toBe("limit");
    expect(json.message).toMatch(/resting for today/);
    expect(h.create).toHaveBeenCalledTimes(1);
  });

  it("maps Groq failures to calm failed bodies", async () => {
    h.create.mockReturnValue(groqErr(500));
    const err = await call();
    expect(err.status).toBe(502);
    expect((await err.json()).status).toBe("failed");

    h.create.mockReturnValue({
      withResponse: () => Promise.reject(Object.assign(new Error("timed out"), { name: "TimeoutError" })),
    });
    const t = await call();
    expect(t.status).toBe(504);
    expect((await t.json()).reason).toBe("timeout");

    h.create.mockReturnValue(groqErr(429, { "retry-after": "20" }));
    const l = await call();
    expect(l.status).toBe(429);
    expect((await l.json()).reason).toBe("limit");
  });

  it("fails when the cleaned text is empty", async () => {
    h.create.mockReturnValue(groqOk("<think>only thoughts</think>"));
    const res = await call();
    expect(res.status).toBe(502);
    expect((await res.json()).status).toBe("failed");
  });

  it("does not log the resume text", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    h.create.mockReturnValue(groqOk("Reworded."));
    await call();
    expect(JSON.stringify(log.mock.calls)).not.toContain("student club");
    log.mockRestore();
  });
});

describe("cleanRewrite", () => {
  it("strips fences, bullets, emphasis and wrapping quotes, and collapses to one paragraph", () => {
    expect(cleanRewrite('```\n"Led a team.\n\nShipped on time."\n```')).toBe("Led a team. Shipped on time.");
    expect(cleanRewrite("* First\n* Second")).toBe("First Second");
    expect(cleanRewrite("“Quoted line”")).toBe("Quoted line");
  });

  it("trims to 600 characters", () => {
    expect(cleanRewrite("word ".repeat(300)).length).toBeLessThanOrEqual(600);
  });
});
