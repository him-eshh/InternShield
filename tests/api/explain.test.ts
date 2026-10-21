import { beforeEach, describe, expect, it, vi } from "vitest";
import { fallbackExplanation, hasBannedWord } from "@/lib/explainFallback";
import { resetServerState } from "@/lib/server/cache";
import type { ExplainRequest } from "@/lib/types";
import { groqErr, groqOk, req } from "./helpers";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));

import { POST } from "@/app/api/explain/route";

const input: ExplainRequest = {
  level: "high",
  flags: [
    { title: "Asks you to deposit a check", quote: "Once you deposit the check", why: "Fake check scams are common." },
    { title: "Moves you to WhatsApp", quote: "add our hiring manager on WhatsApp", why: "Private chats are hard to verify." },
  ],
};
let ip = 0;
const call = (body: unknown = input) => POST(req("explain", body, { ip: `13.0.0.${++ip}` }));

beforeEach(() => {
  resetServerState();
  h.create.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
});

describe("explain route", () => {
  it("uses 120b first and returns the AI text", async () => {
    h.create.mockReturnValue(groqOk("This message has several warning signs worth taking seriously."));
    const { status, data } = await (await call()).json();
    expect(status).toBe("done");
    expect(data.source).toBe("ai");
    const params = h.create.mock.calls[0][0];
    expect(params.model).toBe("openai/gpt-oss-120b");
    expect(params.max_completion_tokens).toBeLessThanOrEqual(300);
    expect(params.response_format).toBeUndefined();
  });

  it("never sends more than 6 flags and no raw message", async () => {
    h.create.mockReturnValue(groqOk("Calm summary."));
    const flags = Array.from({ length: 9 }, (_, i) => ({ title: `Flag ${i}`, quote: null, why: "w" }));
    await call({ level: "medium", flags, message: "SECRET RAW MESSAGE" });
    const user = h.create.mock.calls[0][0].messages[1].content as string;
    expect(user.split("\n").length).toBe(1 + 6);
    expect(user).not.toContain("SECRET");
  });

  it("falls back when the AI output has a banned word", async () => {
    h.create.mockReturnValue(groqOk("This recruiter seems legit and the offer looks safe."));
    const { status, data } = await (await call()).json();
    expect(status).toBe("done");
    expect(data.source).toBe("fallback");
    expect(hasBannedWord(data.text)).toBe(false);
  });

  it("falls back (still done) when both models are limited", async () => {
    h.create.mockReturnValue(groqErr(429, { "retry-after": "20" }));
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).data.source).toBe("fallback");
  });

  it("falls back on a Groq timeout", async () => {
    h.create.mockReturnValue({
      withResponse: () => Promise.reject(Object.assign(new Error("timed out"), { name: "TimeoutError" })),
    });
    expect((await (await call()).json()).data.source).toBe("fallback");
  });

  it("caches by flag set", async () => {
    h.create.mockReturnValue(groqOk("Cached summary."));
    await call();
    const again = await (await call()).json();
    expect(again.data.text).toBe("Cached summary.");
    expect(h.create).toHaveBeenCalledTimes(1);
  });

  it("uses the fallback once the daily explain cap (2x DAILY_CHECK_CAP) is reached", async () => {
    vi.stubEnv("DAILY_CHECK_CAP", "1");
    h.create.mockReturnValue(groqOk("Fresh summary."));
    const mk = (n: number) => ({ level: "low", flags: [{ title: `Flag ${n}`, quote: null, why: "w" }] });
    expect((await (await call(mk(1))).json()).data.source).toBe("ai");
    expect((await (await call(mk(2))).json()).data.source).toBe("ai");
    const third = await call(mk(3));
    expect(third.status).toBe(200);
    expect((await third.json()).data.source).toBe("fallback");
    expect(h.create).toHaveBeenCalledTimes(2);
  });

  it("falls back when the output was cut off (finish_reason length)", async () => {
    h.create.mockReturnValue({
      withResponse: () =>
        Promise.resolve({
          data: { choices: [{ finish_reason: "length", message: { content: "Half a sent" } }] },
          response: { headers: { get: () => null } },
        }),
    });
    expect((await (await call()).json()).data.source).toBe("fallback");
  });

  it("rejects an invalid level (400)", async () => {
    expect((await call({ level: "safe", flags: [] })).status).toBe(400);
  });
});

describe("fallbackExplanation", () => {
  it("never contains a banned word, for any level", () => {
    for (const level of ["low", "medium", "high"] as const) {
      expect(hasBannedWord(fallbackExplanation({ level, flags: [] }))).toBe(false);
      expect(hasBannedWord(fallbackExplanation({ level, flags: input.flags }))).toBe(false);
    }
  });

  it("uses pre-written sentences for known flags and the flag's own why otherwise", () => {
    const text = fallbackExplanation({
      level: "medium",
      flags: [...input.flags, { title: "Something new", quote: null, why: "A custom reason" }],
    });
    expect(text).toMatch(/deposit a check/);
    expect(text).toMatch(/private chat app/);
    expect(text).toMatch(/A custom reason\./);
  });
});
