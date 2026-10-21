import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { cleanTranscript } from "@/lib/server/transcribe";
import { MAX_IMAGE_DATA_URL } from "@/lib/tiers/types";
import { groqErr, groqOk, req } from "./helpers";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));

import { POST } from "@/app/api/transcribe/route";

const IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
let ip = 0;
const call = (b: unknown = { image: IMG }, opts: { origin?: string | null; raw?: string } = {}) =>
  POST(req("transcribe", b, { ip: `15.0.0.${++ip}`, ...opts }));

beforeEach(() => {
  resetServerState();
  h.create.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
});

describe("transcribe route", () => {
  it("rejects a foreign origin (403)", async () => {
    expect((await call({ image: IMG }, { origin: "https://evil.example" })).status).toBe(403);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("rejects a body over 3 MB (413)", async () => {
    const res = await call({ image: `data:image/png;base64,${"A".repeat(3 * 1024 * 1024 + 10)}` });
    expect(res.status).toBe(413);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("rejects a data URL over MAX_IMAGE_DATA_URL but under the body cap (413)", async () => {
    const res = await call({ image: `data:image/png;base64,${"A".repeat(MAX_IMAGE_DATA_URL)}` });
    expect(res.status).toBe(413);
    expect(h.create).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong mime", { image: "data:image/gif;base64,AAAA" }],
    ["no base64 marker", { image: "data:image/png,AAAA" }],
    ["plain url", { image: "https://example.com/a.png" }],
    ["bad characters", { image: "data:image/png;base64,AA AA<" }],
    ["empty payload", { image: "data:image/png;base64," }],
    ["not a string", { image: 12 }],
    ["missing", {}],
  ])("rejects %s (400)", async (_n, b) => {
    const res = await call(b);
    expect(res.status).toBe(400);
    expect((await res.json()).status).toBe("failed");
    expect(h.create).not.toHaveBeenCalled();
  });

  it("sends the image to qwen with 1200 tokens and returns stripped text", async () => {
    h.create.mockReturnValue(groqOk("<think>looking</think>```\nHi, this is Pat from Acme.\n```"));
    const json = await (await call()).json();
    expect(json).toEqual({ status: "done", data: { text: "Hi, this is Pat from Acme." } });
    const params = h.create.mock.calls[0][0];
    expect(params.model).toBe("qwen/qwen3.8-27b");
    expect(params.max_completion_tokens).toBe(1200);
    const parts = params.messages[1].content as { type: string; image_url?: { url: string } }[];
    expect(parts[1]).toEqual({ type: "image_url", image_url: { url: IMG } });
  });

  it("empty transcript fails with the calm no-text message", async () => {
    h.create.mockReturnValue(groqOk("```\n```"));
    const res = await call();
    const json = await res.json();
    expect(json.status).toBe("failed");
    expect(json.message).toBe("We couldn't find any text in that image.");
  });

  it("returns 429 limit with the daily message once TRANSCRIBE_DAILY_CAP is reached", async () => {
    vi.stubEnv("TRANSCRIBE_DAILY_CAP", "1");
    h.create.mockReturnValue(groqOk("Some text"));
    expect((await call()).status).toBe(200);
    const res = await call();
    expect(res.status).toBe(429);
    expect((await res.json()).message).toMatch(/resting for today/);
    expect(h.create).toHaveBeenCalledTimes(1);
  });

  it("maps Groq failures to failed bodies (no fallback model)", async () => {
    h.create.mockReturnValue(groqErr(500));
    const err = await call();
    expect(err.status).toBe(502);
    expect((await err.json()).status).toBe("failed");

    h.create.mockReturnValue(groqErr(429, { "retry-after": "20" }));
    const l = await call();
    expect(l.status).toBe(429);
    expect((await l.json()).reason).toBe("limit");
  });

  it("never logs the image or the transcript", async () => {
    const spies = (["log", "info", "warn", "error"] as const).map((k) => vi.spyOn(console, k).mockImplementation(() => {}));
    h.create.mockReturnValue(groqOk("Secret transcript words"));
    await call();
    h.create.mockReturnValue(groqErr(500));
    await call();
    for (const s of spies) {
      const out = JSON.stringify(s.mock.calls);
      expect(out).not.toContain("iVBORw0KGgo");
      expect(out).not.toContain("Secret transcript");
      s.mockRestore();
    }
  });

  it("does not cache: the same image is sent to the model twice", async () => {
    h.create.mockReturnValue(groqOk("Some text"));
    await call();
    await call();
    expect(h.create).toHaveBeenCalledTimes(2);
  });
});

describe("cleanTranscript", () => {
  it("strips fences and trims to 4,000 characters", () => {
    expect(cleanTranscript("```text\nHello\n```")).toBe("Hello");
    expect(cleanTranscript("a".repeat(5000)).length).toBe(4000);
  });
});
