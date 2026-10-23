import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { callGroq, modelOrder, MODEL_120B, MODEL_20B, MODEL_VISION } from "@/lib/server/groq";
import { joinStrips } from "@/lib/server/transcribe";
import { groqErr, groqOk, req } from "./helpers";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));

import { POST } from "@/app/api/transcribe/route";

const IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
const models = () => h.create.mock.calls.map((c) => (c[0] as { model: string }).model);
const ask = { system: "s", user: "u", maxTokens: 50 };

beforeEach(() => {
  resetServerState();
  h.create.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
});

describe("model ids from env", () => {
  it("defaults: questions on 20b first, feedback on qwen then 120b", () => {
    expect(modelOrder("interview")).toEqual([MODEL_20B, MODEL_VISION]);
    expect(modelOrder("interviewFeedback")).toEqual([MODEL_VISION, MODEL_120B, MODEL_20B]);
    expect(modelOrder("transcribe")).toEqual([MODEL_VISION]);
  });

  it("VISION_MODEL, INTERVIEW_MODEL, REWRITE_MODEL override the defaults", async () => {
    vi.stubEnv("VISION_MODEL", "qwen/next-vl");
    vi.stubEnv("INTERVIEW_MODEL", MODEL_120B);
    vi.stubEnv("REWRITE_MODEL", "qwen/rewriter");
    expect(modelOrder("interviewFeedback")).toEqual([MODEL_120B, MODEL_20B]);
    expect(modelOrder("rewrite")[0]).toBe("qwen/rewriter");
    h.create.mockReturnValue(groqOk("text"));
    await callGroq("transcribe", ask);
    expect(models()).toEqual(["qwen/next-vl"]);
  });
});

describe("fallback and 429", () => {
  it("404 model not found on qwen falls back to the next model", async () => {
    h.create.mockReturnValueOnce(groqErr(404)).mockReturnValueOnce(groqOk('{"ok":true}'));
    const r = await callGroq("interviewFeedback", ask);
    expect(r).toEqual({ ok: true, data: '{"ok":true}' });
    expect(models()).toEqual([MODEL_VISION, MODEL_120B]);
  });

  it("404 on the only model reports modelMissing", async () => {
    h.create.mockReturnValue(groqErr(404));
    const r = await callGroq("transcribe", ask);
    expect(r).toMatchObject({ ok: false, reason: "error", modelMissing: true });
  });

  it("a short retry-after is honored once on the same model", async () => {
    h.create.mockReturnValueOnce(groqErr(429, { "retry-after": "1" })).mockReturnValueOnce(groqOk("hi"));
    const r = await callGroq("transcribe", ask);
    expect(r).toEqual({ ok: true, data: "hi" });
    expect(models()).toEqual([MODEL_VISION, MODEL_VISION]);
  });

  it("a long retry-after moves on, then maps to RATE_LIMITED", async () => {
    h.create.mockReturnValue(groqErr(429, { "retry-after": "40" }));
    const res = await POST(req("transcribe", { image: IMG }, { ip: "16.0.0.1" }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toMatchObject({ status: "failed", code: "RATE_LIMITED", retryAfter: 40 });
    expect(h.create).toHaveBeenCalledTimes(1);
  });
});

describe("two strips per request", () => {
  it("sends both strips in order and merges the overlap", async () => {
    h.create.mockReturnValue(
      groqOk("Hi Sam, this is Jordan from Northwind.\nWe loved your profile.\n=== IMAGE 2 ===\nWe loved your profile.\nCan you start Monday?"),
    );
    const res = await POST(req("transcribe", { images: [IMG, IMG] }, { ip: "16.0.0.2" }));
    const body = await res.json();
    expect(body.data.text).toBe("Hi Sam, this is Jordan from Northwind.\nWe loved your profile.\nCan you start Monday?");
    const content = (h.create.mock.calls[0][0] as { messages: { content: unknown }[] }).messages[1].content as unknown[];
    expect(content).toHaveLength(3);
  });

  it("rejects 3 strips and non-strings", async () => {
    for (const images of [[IMG, IMG, IMG], [IMG, 5], []]) {
      const res = await POST(req("transcribe", { images }, { ip: `16.0.1.${images.length}` }));
      expect((await res.json()).code).toBe("BAD_INPUT");
    }
    expect(h.create).not.toHaveBeenCalled();
  });

  it("joinStrips keeps the text as is without the marker", () => {
    expect(joinStrips("a\nb")).toBe("a\nb");
  });
});
