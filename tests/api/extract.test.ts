import { beforeEach, describe, expect, it, vi } from "vitest";
import { EXAMPLES } from "@/lib/examples";
import { resetServerState } from "@/lib/server/cache";
import { groqErr, groqOk, MESSAGE, modelFacts, req } from "./helpers";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));

import { POST } from "@/app/api/extract/route";

async function call(message = MESSAGE, ip = "1.1.1.1", extra: Record<string, unknown> = {}) {
  const res = await POST(req("extract", { message, sender: null, company: null, ...extra }, { ip }));
  return { res, body: await res.json() };
}

beforeEach(() => {
  resetServerState();
  h.create.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
});

describe("extract route", () => {
  it("keeps facts with real quotes", async () => {
    h.create.mockReturnValue(groqOk(modelFacts()));
    const { res, body } = await call();
    expect(res.status).toBe(200);
    expect(body.status).toBe("done");
    expect(body.data.role.value).toBe("Software Intern");
    expect(body.data.asks).toHaveLength(1);
  });

  it("drops facts whose quote is not in the message", async () => {
    h.create.mockReturnValue(
      groqOk(
        modelFacts({
          role: { value: "Intern", quote: "an invented quote" },
          asks: [
            { kind: "gift_cards", quote: "buy a gift card" },
            { kind: "pay_fee", quote: "pay a registration fee" },
          ],
          pressure: [{ quote: "act within 24 hours" }],
          interview: { status: "none_hired_directly", quote: "no interview needed" },
          dutiesVague: { quote: "simple tasks" },
        }),
      ),
    );
    const { body } = await call();
    expect(body.data.role).toBeNull();
    expect(body.data.company.value).toBe("Acme Robotics");
    expect(body.data.asks).toEqual([{ kind: "gift_cards", quote: "buy a gift card" }]);
    expect(body.data.pressure).toEqual([]);
    expect(body.data.interview).toEqual({ status: "none_hired_directly", quote: null });
    expect(body.data.dutiesVague).toBeNull();
  });

  it("keeps sender email/phone only when they appear in the message", async () => {
    const msg = `${MESSAGE} Write to pat@acme-robotics.com or call +1 (213) 555-0147.`;
    h.create.mockReturnValue(
      groqOk(modelFacts({ sender: { name: "Pat", email: "pat@acme-robotics.com", phone: "2135550147" } })),
    );
    expect((await call(msg)).body.data.sender).toEqual({ name: "Pat", email: "pat@acme-robotics.com", phone: "2135550147" });

    h.create.mockReturnValue(
      groqOk(modelFacts({ sender: { name: "Pat", email: "ceo@made-up.com", phone: "999 999 9999" } })),
    );
    expect((await call(`${msg} x`, "2.2.2.2")).body.data.sender).toEqual({ name: "Pat", email: null, phone: null });
  });

  it("passes isJobMessage false through as done", async () => {
    h.create.mockReturnValue(groqOk(JSON.stringify({ isJobMessage: false })));
    const { res, body } = await call("Happy birthday! See you at dinner on Friday.");
    expect(res.status).toBe(200);
    expect(body.data.isJobMessage).toBe(false);
  });

  it("sends strict json_schema, low reasoning, and never leaks the key", async () => {
    h.create.mockReturnValue(groqOk(modelFacts()));
    const { body } = await call();
    const params = h.create.mock.calls[0][0];
    expect(params.model).toBe("openai/gpt-oss-20b");
    expect(params.response_format.json_schema.strict).toBe(true);
    expect(params.reasoning_effort).toBe("low");
    expect(JSON.stringify(body)).not.toContain("test-key");
  });

  it("on 429 marks the model resting and tries the other model", async () => {
    h.create.mockReturnValueOnce(groqErr(429, { "retry-after": "30" })).mockReturnValueOnce(groqOk(modelFacts()));
    const { res, body } = await call();
    expect(res.status).toBe(200);
    expect(body.status).toBe("done");
    expect(h.create.mock.calls.map((c) => c[0].model)).toEqual(["openai/gpt-oss-20b", "openai/gpt-oss-120b"]);

    // 20b is resting now: the next (different) message goes straight to 120b.
    h.create.mockReset();
    h.create.mockReturnValue(groqOk(modelFacts()));
    await call(`${MESSAGE} Reply soon.`, "2.2.2.2");
    expect(h.create.mock.calls.map((c) => c[0].model)).toEqual(["openai/gpt-oss-120b"]);
  });

  it("skips a model whose remaining tokens are nearly out", async () => {
    h.create.mockReturnValue(groqOk(modelFacts(), { "x-ratelimit-remaining-tokens": "100", "x-ratelimit-reset-tokens": "5s" }));
    await call();
    h.create.mockClear();
    await call(`${MESSAGE} Reply soon.`, "2.2.2.2");
    expect(h.create.mock.calls[0][0].model).toBe("openai/gpt-oss-120b");
  });

  it("returns failed limit (429) when both models are limited", async () => {
    h.create.mockReturnValue(groqErr(429, { "retry-after": "45" }));
    const { res, body } = await call();
    expect(res.status).toBe(429);
    expect(body).toMatchObject({ status: "failed", reason: "limit", retryAfter: 45 });
    expect(h.create).toHaveBeenCalledTimes(2);
  });

  it("retries once on a schema-mismatch 400", async () => {
    h.create.mockReturnValueOnce(groqErr(400)).mockReturnValueOnce(groqOk(modelFacts()));
    const { body } = await call();
    expect(body.status).toBe("done");
    expect(h.create).toHaveBeenCalledTimes(2);
    expect(h.create.mock.calls[1][0].model).toBe("openai/gpt-oss-20b");
  });

  it("maps a timeout to failed timeout (504)", async () => {
    h.create.mockReturnValue({
      withResponse: () => Promise.reject(Object.assign(new Error("The operation timed out"), { name: "TimeoutError" })),
    });
    const { res, body } = await call();
    expect(res.status).toBe(504);
    expect(body).toMatchObject({ status: "failed", reason: "timeout" });
  });

  it("maps other failures to failed error and never throws", async () => {
    h.create.mockReturnValue(groqErr(500));
    const { res, body } = await call();
    expect(res.status).toBe(502);
    expect(body).toMatchObject({ status: "failed", reason: "error" });
  });

  it("caches repeats without a second Groq call", async () => {
    h.create.mockReturnValue(groqOk(modelFacts()));
    await call();
    await call();
    expect(h.create).toHaveBeenCalledTimes(1);
  });

  it("example text and cache hits do not count toward the daily cap", async () => {
    vi.stubEnv("DAILY_CHECK_CAP", "1");
    h.create.mockReturnValue(groqOk(modelFacts()));
    // Three example runs (different form values dodge the cache) use no cap.
    for (const [i, company] of ["A", "B", "C"].entries()) {
      const { res } = await call(EXAMPLES.scam.text, `3.3.3.${i}`, { company });
      expect(res.status).toBe(200);
    }
    // First real check takes the single slot, its repeat is a cache hit.
    expect((await call(MESSAGE, "4.4.4.4")).res.status).toBe(200);
    expect((await call(MESSAGE, "4.4.4.5")).res.status).toBe(200);
    // A different live check is over the cap.
    const over = await call(`${MESSAGE} Reply soon.`, "4.4.4.6");
    expect(over.res.status).toBe(429);
    expect(over.body).toMatchObject({ status: "failed", reason: "limit" });
    expect(over.body.message).toMatch(/resting for today/);
  });
});
