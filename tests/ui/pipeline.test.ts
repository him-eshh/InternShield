import { describe, expect, it } from "vitest";
import { EXAMPLES } from "@/lib/examples";
import { runPipeline, type PipelineInput } from "@/lib/client/pipeline";
import type { Facts } from "@/lib/types";

const scamFacts = (EXAMPLES.scam.savedSteps.extract as { data: Facts }).data;

const input: PipelineInput = {
  text: EXAMPLES.scam.text,
  form: { sender: null, company: null },
  source: "handshake",
  stage: "offer",
  profile: null,
  resumeText: null,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const done = (data: unknown) => json({ status: "done", data });
const hang = (init?: RequestInit) =>
  new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });

type Handler = (init?: RequestInit) => Response | Promise<Response>;
function makeFetch(routes: Record<string, Handler>) {
  const calls: string[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    const path = String(url).split("?")[0];
    calls.push(path);
    const h = routes[path];
    return h ? h(init) : json({ status: "failed", reason: "error" }, 500);
  }) as typeof fetch;
  return { fn, count: (p: string) => calls.filter((c) => c === p).length };
}

const senderData = { email: "x@gmail.com", domain: "gmail.com", freeEmail: true, registeredAt: null, hasMx: true, hunter: null };
const explain = () => done({ text: "ok", source: "ai" });
const opts = { log: false, failParam: null, timeouts: { company: 40 } } as const;

describe("runPipeline", () => {
  it("step 2 timeout skips step 4, still scores, and retry re-runs only steps 2 and 4", async () => {
    const first = makeFetch({
      "/api/extract": () => done(scamFacts),
      "/api/company": hang,
      "/api/sender": () => done(senderData),
      "/api/explain": explain,
    });
    const a = await runPipeline(input, { ...opts, fetch: first.fn });
    expect(a.steps.company).toEqual({ status: "failed", reason: "timeout", code: "TIMEOUT" });
    expect(a.steps.posting).toEqual({ status: "skipped", reason: "needs step 2" });
    expect(a.steps.sender.status).toBe("done");
    expect(a.report).not.toBeNull();
    expect(a.retryable).toEqual(["company", "posting"]);

    const second = makeFetch({
      "/api/company": () => done({ officialDomain: "brightline.com", careersUrl: null }),
      "/api/posting": () => done({ found: false, url: null, title: null, location: null, pay: null, postedDate: null, onOfficialDomain: false }),
      "/api/explain": explain,
    });
    const b = await runPipeline(input, { ...opts, fetch: second.fn }, a.steps);
    expect(second.count("/api/extract")).toBe(0);
    expect(second.count("/api/sender")).toBe(0);
    expect(second.count("/api/company")).toBe(1);
    expect(second.count("/api/posting")).toBe(1);
    expect(b.steps.company.status).toBe("done");
    expect(b.steps.posting.status).toBe("done");
    expect(b.steps.extract).toBe(a.steps.extract);
  });

  it("a 429 becomes failed:limit with retryAfter from the body", async () => {
    const f = makeFetch({
      "/api/extract": () => json({ status: "failed", reason: "limit", retryAfter: 30, message: "slow down" }, 429),
      "/api/explain": explain,
    });
    const out = await runPipeline(input, { ...opts, fetch: f.fn });
    expect(out.steps.extract).toEqual({ status: "failed", reason: "limit", retryAfter: 30, code: "RATE_LIMITED" });
    expect(out.steps.company).toEqual({ status: "skipped", reason: "needs step 1" });
    expect(out.limited).toBe(true);
    expect(out.retryAfter).toBe(30);
    expect(out.report).not.toBeNull(); // backstop still scores the raw text
  });

  it("never throws when fetch rejects", async () => {
    const fn = (async () => {
      throw new TypeError("network down");
    }) as typeof fetch;
    const out = await runPipeline(input, { ...opts, fetch: fn });
    expect(out.steps.extract).toEqual({ status: "failed", reason: "error", code: "UNKNOWN" });
    expect(out.report).not.toBeNull();
    expect(out.explanation).toBeNull(); // the report doesn't wait for it
    expect((await out.pendingExplanation)?.source).toBe("fallback");
  });

  it("stops on a message that is not a job message", async () => {
    const f = makeFetch({ "/api/extract": () => done({ ...scamFacts, isJobMessage: false }) });
    const out = await runPipeline({ ...input, text: "Lunch is at noon tomorrow." }, { ...opts, fetch: f.fn });
    expect(out.notJob).toBe(true);
    expect(out.report).toBeNull();
    expect(f.count("/api/company")).toBe(0);
    expect(f.count("/api/explain")).toBe(0);
  });

  it.each([
    "An employer viewed your profile on Handshake.",
    "You are invited to apply for our internship through Greenhouse.",
    "Your application status has changed. View details in Workday.",
    "Let's talk next week. Alex Example | Recruiter | Example Company",
  ])("continues after a false non-job answer for hiring mail: %s", async (text) => {
    const bare: Facts = { ...scamFacts, isJobMessage: false, company: null, sender: { name: null, email: null, phone: null }, asks: [] };
    const f = makeFetch({ "/api/extract": () => done(bare), "/api/explain": explain });
    const out = await runPipeline({ ...input, text, source: "email", stage: null }, { ...opts, fetch: f.fn });
    expect(out.notJob).toBe(false);
    expect(out.facts?.isJobMessage).toBe(true);
    expect(out.report).not.toBeNull();
    expect(out.report?.level).toBe("low");
    await out.pendingExplanation;
  });

  it("does not let a non-job model answer hide a raw payment request", async () => {
    const text = "To start this internship, you must pay a $40 registration fee today.";
    const f = makeFetch({ "/api/extract": () => done({ ...scamFacts, isJobMessage: false }), "/api/explain": explain });
    const out = await runPipeline({ ...input, text }, { ...opts, fetch: f.fn });
    expect(out.notJob).toBe(false);
    expect(out.report?.score).toBeGreaterThanOrEqual(85);
    expect(out.report?.flags.some((flag) => flag.id === "pay_fee")).toBe(true);
  });

  it("skips company/sender with 'missing input' when facts have none and the form is empty", async () => {
    const bare = { ...scamFacts, company: null, sender: { name: null, email: null, phone: null } };
    const f = makeFetch({ "/api/extract": () => done(bare), "/api/explain": explain });
    const out = await runPipeline(input, { ...opts, fetch: f.fn });
    expect(out.steps.company).toEqual({ status: "skipped", reason: "missing input" });
    expect(out.steps.sender).toEqual({ status: "skipped", reason: "missing input" });
    expect(out.steps.posting).toEqual({ status: "skipped", reason: "needs step 2" });
  });

  it("examples fall back to saved steps when live steps fail", async () => {
    const f = makeFetch({}); // every route answers 500
    const ex = EXAMPLES.real;
    const out = await runPipeline(
      { ...input, text: ex.text, form: ex.form, source: ex.source, stage: ex.stage, exampleId: "real" },
      { ...opts, fetch: f.fn },
    );
    expect(out.usedSaved).toBe(true);
    expect(out.steps).toEqual(ex.savedSteps);
  });

  it("falls back to the pre-written explanation when explain fails", async () => {
    const f = makeFetch({ "/api/extract": () => done(scamFacts), "/api/explain": () => json({ status: "failed", reason: "error" }, 500) });
    const out = await runPipeline(input, { ...opts, fetch: f.fn });
    const ex = await out.pendingExplanation;
    expect(ex?.source).toBe("fallback");
    expect(ex?.text.length).toBeGreaterThan(0);
  });
});
