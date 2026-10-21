import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { groqOk, MESSAGE, modelFacts, req } from "./helpers";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));

import { POST as explain } from "@/app/api/explain/route";
import { POST as extract } from "@/app/api/extract/route";

beforeEach(() => {
  resetServerState();
  h.create.mockReset();
  h.create.mockReturnValue(groqOk(modelFacts()));
  vi.unstubAllEnvs();
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
});

describe("usage guard", () => {
  it("rejects an origin that is not allowed (403) before calling anything", async () => {
    const res = await extract(req("extract", { message: MESSAGE }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect((await res.json()).status).toBe("failed");
    expect(h.create).not.toHaveBeenCalled();
  });

  it("rejects a missing origin", async () => {
    const res = await extract(req("extract", { message: MESSAGE }, { origin: null }));
    expect(res.status).toBe(403);
  });

  it("honors a custom ALLOWED_ORIGINS list", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://a.example, https://b.example");
    const ok = await extract(req("extract", { message: MESSAGE }, { origin: "https://b.example" }));
    expect(ok.status).toBe(200);
    const no = await extract(req("extract", { message: MESSAGE }, { origin: "http://localhost:3000", ip: "5.5.5.5" }));
    expect(no.status).toBe(403);
  });

  it("rejects an oversize body (413)", async () => {
    const res = await explain(req("explain", { level: "low", flags: [], pad: "x".repeat(9000) }));
    expect(res.status).toBe(413);
  });

  it("rejects a message over 4000 characters (413)", async () => {
    const res = await extract(req("extract", { message: "a".repeat(4001) }));
    expect(res.status).toBe(413);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("rejects bad JSON (400)", async () => {
    const res = await extract(req("extract", null, { raw: "{nope" }));
    expect(res.status).toBe(400);
  });

  it("allows 3 checks a minute per visitor, then 429 with retryAfter", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await extract(req("extract", { message: MESSAGE }, { ip: "7.7.7.7, 10.0.0.1" }))).status).toBe(200);
    }
    const res = await extract(req("extract", { message: MESSAGE }, { ip: "7.7.7.7" }));
    const body = await res.json();
    expect(res.status).toBe(429);
    expect(body).toMatchObject({ status: "failed", reason: "limit" });
    expect(body.retryAfter).toBeGreaterThan(0);
    // A different visitor is unaffected.
    expect((await extract(req("extract", { message: MESSAGE }, { ip: "8.8.8.8" }))).status).toBe(200);
  });

  it("?fail=1 returns failed timeout (504) without calling anything", async () => {
    const res = await extract(req("extract", { message: MESSAGE }, { query: "?fail=1" }));
    expect(res.status).toBe(504);
    expect(await res.json()).toMatchObject({ status: "failed", reason: "timeout" });
    expect(h.create).not.toHaveBeenCalled();
  });

  it("?fail=1 is ignored in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await extract(req("extract", { message: MESSAGE }, { query: "?fail=1" }));
    expect(res.status).toBe(200);
  });
});
