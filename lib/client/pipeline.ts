// The relay (spec.md > How the Checklist Steps Run (and Fail)).
// A step can never throw past this file: every failure becomes a StepResult.
import { EXAMPLES } from "../examples";
import { fallbackExplanation } from "../explainFallback";
import { score } from "../scoring/score";
import type {
  ApiResponse,
  CompanyData,
  CompanyRequest,
  ExplainRequest,
  Facts,
  PostingData,
  PostingRequest,
  Profile,
  Report,
  ScoreInput,
  SenderData,
  SenderRequest,
  Source,
  Stage,
  StepResult,
  StepResults,
} from "../types";
import { MAX_MESSAGE_CHARS, type ExtractRequest } from "../types";

export type StepKey = "extract" | "company" | "sender" | "posting" | "explain";
export type LineState = "pending" | "running" | "done" | "failed" | "skipped";

export const STEP_LABELS: Record<StepKey, string> = {
  extract: "Reading the message",
  company: "Searching for the company's careers page",
  sender: "Checking the sender's email domain",
  posting: "Looking for the real job posting",
  explain: "Writing the explanation",
};

export const TIMEOUTS: Record<StepKey, number> = {
  extract: 20_000,
  company: 10_000,
  sender: 10_000,
  posting: 10_000,
  explain: 10_000,
};

export interface PipelineInput {
  text: string;
  form: { sender: string | null; company: string | null };
  source: Source | null;
  stage: Stage | null;
  profile: Profile | null;
  resumeText: string | null;
  exampleId?: "scam" | "real" | null;
}

export interface Explanation {
  text: string;
  source: "ai" | "fallback";
}

export interface PipelineDeps {
  fetch?: typeof fetch;
  /** Called as each line changes. `result` is the StepResult when the line settles. */
  onLine?: (key: StepKey, state: LineState, result?: StepResult<unknown>) => void;
  timeouts?: Partial<Record<StepKey, number>>;
  /** Dev only: which route to force-fail (`?fail=extract` etc.). Defaults to the page URL. */
  failParam?: string | null;
  /** Print the status table (dev). Defaults to NODE_ENV !== "production". */
  log?: boolean;
}

export interface PipelineOutcome {
  /** extract said "not a job message": no score, show the friendly screen. */
  notJob: boolean;
  steps: StepResults;
  facts: Facts | null;
  /** Everything score() was given except answers (quick questions re-score with these). */
  scoreInput: ScoreInput;
  report: Report | null;
  explanation: Explanation | null;
  /** Example run where at least one live step failed and a saved result was used. */
  usedSaved: boolean;
  /** Steps a Retry could still help with. */
  retryable: StepKey[];
  /** Longest retryAfter (seconds) among limited steps, else null. */
  retryAfter: number | null;
  /** Any step was limited (429). */
  limited: boolean;
}

const isDev = () => typeof process !== "undefined" && process.env.NODE_ENV !== "production";

function devFailParam(deps: PipelineDeps): string | null {
  if (deps.failParam !== undefined) return deps.failParam;
  if (typeof window === "undefined" || !isDev()) return null;
  return new URLSearchParams(window.location.search).get("fail");
}

async function call<T>(key: StepKey, url: string, body: unknown, deps: PipelineDeps): Promise<StepResult<T>> {
  const doFetch = deps.fetch ?? globalThis.fetch;
  const ctl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctl.abort();
  }, deps.timeouts?.[key] ?? TIMEOUTS[key]);
  const fail = devFailParam(deps);
  const target = isDev() && fail === key ? `${url}?fail=1` : url;
  try {
    const res = await doFetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    let json: ApiResponse<T> | null = null;
    try {
      json = (await res.json()) as ApiResponse<T>;
    } catch {
      json = null;
    }
    if (res.status === 429) {
      return { status: "failed", reason: "limit", retryAfter: json && json.status === "failed" ? json.retryAfter : undefined };
    }
    if (json && json.status === "done" && res.ok) return { status: "done", data: json.data };
    if (json && json.status === "failed") return { status: "failed", reason: json.reason, retryAfter: json.retryAfter };
    return { status: "failed", reason: "error" };
  } catch {
    return { status: "failed", reason: timedOut ? "timeout" : "error" };
  } finally {
    clearTimeout(timer);
  }
}

function lineState(r: StepResult<unknown>): LineState {
  return r.status;
}

const looksLikeEmail = (s: string | null | undefined): s is string => !!s && /\S+@\S+\.\S+/.test(s);

/** Steps a Retry could help with (failed, or skipped because an earlier step didn't finish). */
export function retryableSteps(steps: StepResults): StepKey[] {
  const out: StepKey[] = [];
  if (steps.extract.status === "failed") out.push("extract");
  const upstreamBroken = (r: StepResult<unknown>) => r.status !== "done";
  for (const k of ["company", "sender"] as const) {
    const r = steps[k];
    if (r.status === "failed" || (r.status === "skipped" && r.reason === "needs step 1" && steps.extract.status !== "done")) out.push(k);
  }
  const p = steps.posting;
  if (p.status === "failed" || (p.status === "skipped" && p.reason === "needs step 2" && upstreamBroken(steps.company))) out.push("posting");
  return out;
}

export async function fetchExplanation(
  report: Report,
  deps: Pick<PipelineDeps, "fetch" | "timeouts" | "failParam"> = {},
): Promise<Explanation> {
  const req: ExplainRequest = {
    level: report.level,
    flags: report.flags.slice(0, 6).map((f) => ({ title: f.title, quote: f.quote, why: f.why })),
  };
  const res = await call<{ text: string; source: "ai" | "fallback" }>("explain", "/api/explain", req, deps);
  if (res.status === "done" && res.data?.text) return { text: res.data.text, source: res.data.source };
  return { text: fallbackExplanation(req), source: "fallback" };
}

/**
 * Runs the whole checklist. `prev` holds results from an earlier run: steps already "done" are reused
 * and only failed/skipped steps run again (Retry). Never throws.
 */
export async function runPipeline(
  input: PipelineInput,
  deps: PipelineDeps = {},
  prev?: Partial<StepResults>,
): Promise<PipelineOutcome> {
  const text = input.text.slice(0, MAX_MESSAGE_CHARS);
  const line = (k: StepKey, s: LineState, r?: StepResult<unknown>) => {
    try {
      deps.onLine?.(k, s, r);
    } catch {
      /* UI callback errors must not break the run */
    }
  };
  const settle = <T>(k: StepKey, r: StepResult<T>): StepResult<T> => {
    line(k, lineState(r), r);
    return r;
  };
  const reuse = <K extends keyof StepResults>(k: K): StepResults[K] | null => {
    const p = prev?.[k];
    return p && p.status === "done" ? (p as StepResults[K]) : null;
  };

  // Step 1: extract
  let extract: StepResults["extract"];
  const reusedExtract = reuse("extract");
  if (reusedExtract) {
    extract = settle("extract", reusedExtract);
  } else {
    line("extract", "running");
    const body: ExtractRequest = { message: text, sender: input.form.sender, company: input.form.company };
    extract = settle("extract", await call<Facts>("extract", "/api/extract", body, deps));
  }
  const facts = extract.status === "done" ? extract.data : null;

  if (facts && !facts.isJobMessage) {
    const steps: StepResults = {
      extract,
      company: { status: "skipped", reason: "needs step 1" },
      sender: { status: "skipped", reason: "needs step 1" },
      posting: { status: "skipped", reason: "needs step 2" },
    };
    return {
      notJob: true,
      steps,
      facts,
      scoreInput: buildScoreInput(input, text, facts, steps),
      report: null,
      explanation: null,
      usedSaved: false,
      retryable: [],
      retryAfter: null,
      limited: false,
    };
  }

  // Steps 2 and 3, at the same time
  const companyName = facts?.company?.value?.trim() || input.form.company?.trim() || null;
  const senderEmail = looksLikeEmail(facts?.sender.email) ? facts!.sender.email : looksLikeEmail(input.form.sender) ? input.form.sender : null;
  const missing = (): StepResult<never> =>
    extract.status === "done" ? { status: "skipped", reason: "missing input" } : { status: "skipped", reason: "needs step 1" };

  const runCompany = async (): Promise<StepResults["company"]> => {
    const r = reuse("company");
    if (r) return settle("company", r);
    if (!companyName) return settle("company", missing());
    line("company", "running");
    const body: CompanyRequest = { company: companyName };
    return settle("company", await call<CompanyData | null>("company", "/api/company", body, deps));
  };
  const runSender = async (): Promise<StepResults["sender"]> => {
    const r = reuse("sender");
    if (r) return settle("sender", r);
    if (!senderEmail) return settle("sender", missing());
    line("sender", "running");
    const body: SenderRequest = { email: senderEmail };
    return settle("sender", await call<SenderData>("sender", "/api/sender", body, deps));
  };
  const [company, sender] = await Promise.all([runCompany(), runSender()]);

  // Step 4: needs the official website from step 2
  let posting: StepResults["posting"];
  const reusedPosting = reuse("posting");
  if (reusedPosting) {
    posting = settle("posting", reusedPosting);
  } else if (company.status === "done" && company.data?.officialDomain && companyName) {
    line("posting", "running");
    const body: PostingRequest = { company: companyName, role: facts?.role?.value ?? null, officialDomain: company.data.officialDomain };
    posting = settle("posting", await call<PostingData>("posting", "/api/posting", body, deps));
  } else {
    posting = settle("posting", { status: "skipped", reason: "needs step 2" });
  }

  let steps: StepResults = { extract, company, sender, posting };

  // Example runs: live first, then saved results for any step that failed.
  let usedSaved = false;
  const saved = input.exampleId ? EXAMPLES[input.exampleId].savedSteps : null;
  if (saved) {
    const next: StepResults = { ...steps };
    const put = <K extends keyof StepResults>(k: K) => {
      next[k] = saved[k];
    };
    for (const k of ["extract", "company", "sender", "posting"] as const) {
      if (steps[k].status === "failed") {
        put(k);
        usedSaved = true;
      }
    }
    // A step skipped only because an earlier one failed can now use its saved result too.
    if (usedSaved) {
      for (const k of ["company", "sender", "posting"] as const) {
        const live = steps[k];
        if (live.status === "skipped" && live.reason !== "missing input") put(k);
      }
    }
    steps = next;
    for (const k of ["extract", "company", "sender", "posting"] as const) line(k, lineState(steps[k]), steps[k]);
  }

  const finalFacts = steps.extract.status === "done" ? steps.extract.data : null;
  const scoreInput = buildScoreInput(input, text, finalFacts, steps);
  const report = score({ ...scoreInput, answers: {} });

  // Step 5: explanation (falls back to pre-written sentences)
  line("explain", "running");
  const explanation = await fetchExplanation(report, deps);
  line("explain", "done");

  const limits = (["extract", "company", "sender", "posting"] as const)
    .map((k) => steps[k])
    .filter((r): r is Extract<StepResult<unknown>, { status: "failed" }> => r.status === "failed" && r.reason === "limit");
  const retryAfter = limits.length ? Math.max(0, ...limits.map((r) => r.retryAfter ?? 0)) : null;

  if (deps.log ?? isDev()) {
    try {
      console.table(
        (["extract", "company", "sender", "posting"] as const).map((k): { step: string; status: string; detail: string } => ({
          step: k,
          status: steps[k].status,
          detail: steps[k].status === "done" ? "ok" : (steps[k] as { reason: string }).reason,
        })).concat([{ step: "explain", status: "done", detail: explanation.source }]),
      );
    } catch {
      /* console.table unavailable */
    }
  }

  return {
    notJob: false,
    steps,
    facts: finalFacts,
    scoreInput,
    report,
    explanation,
    usedSaved,
    retryable: retryableSteps(steps),
    retryAfter,
    limited: limits.length > 0,
  };
}

function buildScoreInput(input: PipelineInput, text: string, facts: Facts | null, steps: StepResults): ScoreInput {
  return {
    text,
    facts,
    steps,
    profile: input.profile,
    resumeText: input.resumeText,
    source: input.source,
    stage: input.stage,
    answers: {},
    form: input.form,
  };
}
