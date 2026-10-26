// Groq calls with per-model fallback (spec.md > Model Fallback, Token Budget).
import Groq from "groq-sdk";
import { cacheGet, cacheSet } from "./cache";
import { classify, OUTSIDE_TIMEOUT_MS } from "./http";

/** "interview" = questions and hints; "interviewFeedback" = the graded feedback JSON. */
type GroqTask = "extract" | "rewrite" | "transcribe" | "interview" | "interviewFeedback" | "intel";

export const MODEL_20B = "openai/gpt-oss-20b";
export const MODEL_120B = "openai/gpt-oss-120b";
/** Preview vision model (api-facts.md > Vision). Its own per-model budget, so Tier 2 doesn't eat the core's. */
export const MODEL_VISION = "qwen/qwen3.8-27b";

// Model ids can be swapped from env when Groq retires a Preview model (standing #4). Read per call.
const envModel = (name: string, fallback: string) => process.env[name]?.trim() || fallback;

/** Models tried in order; duplicates dropped. Load is split across per-model buckets. */
export function modelOrder(task: GroqTask): string[] {
  const vision = envModel("VISION_MODEL", MODEL_VISION);
  const interview = envModel("INTERVIEW_MODEL", MODEL_VISION);
  const order: Record<GroqTask, string[]> = {
    extract: [MODEL_20B, MODEL_120B],
    // gpt-oss-20b only when the rewrite model fails (rewrite is capped at REWRITE_DAILY_CAP, a small share of 20b's budget).
    rewrite: [envModel("REWRITE_MODEL", MODEL_VISION), MODEL_20B],
    transcribe: [vision], // the only vision model; no fallback model
    interview: [MODEL_20B, interview], // short questions: cheap gpt-oss-20b first
    interviewFeedback: [interview, MODEL_120B, MODEL_20B],
    intel: [MODEL_20B, MODEL_120B], // company intel from search snippets (lib/server/companyIntel.ts)
  };
  return [...new Set(order[task])];
}

const isQwen = (model: string) => model.startsWith("qwen/");
/** One in-place wait on a 429 when Groq asks for at most this long. */
const MAX_RETRY_WAIT_S = 5;

interface GroqRequest {
  system: string;
  user: string;
  /** Strict JSON schema; omit for plain text. */
  schema?: object;
  maxTokens: number;
  /** Image data URLs sent with the user turn (vision model only, max 3). */
  images?: string[];
  /** On finish_reason "length", return the text so far with partial: true instead of failing. */
  allowTruncated?: boolean;
}

/** Outcome<string> plus what transcribe needs: partial output and the upstream HTTP status of a failure. */
type GroqOutcome =
  | { ok: true; data: string; partial?: boolean }
  | { ok: false; reason: "timeout" | "limit" | "error"; retryAfter?: number; status?: number; modelMissing?: boolean };

/** Qwen 3 may still emit a <think> block in content; drop it. */
function stripThinking(s: string): string {
  return s.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").trim();
}

type HeadersLike = { get?: (k: string) => string | null } & Record<string, unknown>;
interface Completion {
  choices?: { finish_reason?: string | null; message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}
interface Client {
  chat: {
    completions: {
      create(
        params: Record<string, unknown>,
        opts: { signal: AbortSignal },
      ): { withResponse(): Promise<{ data: Completion; response: { headers?: HeadersLike } }> };
    };
  };
}

const TOTAL_DEADLINE_MS = 15_000;
const NEAR_OUT_TOKENS = 1200;
const NEAR_OUT_REQUESTS = 2;

function header(h: HeadersLike | undefined | null, name: string): string | null {
  if (!h) return null;
  if (typeof h.get === "function") return h.get(name);
  const v = h[name];
  return typeof v === "string" ? v : null;
}

/** "30", "2m59.56s", "7.66s" -> seconds. */
function parseSeconds(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const plain = Number(v);
  if (Number.isFinite(plain)) return Math.max(1, Math.ceil(plain));
  const m = /^(?:(\d+)h)?(?:(\d+)m(?!s))?(?:([\d.]+)s)?$/.exec(v.trim());
  if (!m) return fallback;
  const total = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return total > 0 ? Math.ceil(total) : fallback;
}

function rest(model: string, seconds: number): void {
  cacheSet(`rest:${model}`, true, seconds * 1000);
}
function restingFor(model: string): boolean {
  return cacheGet<boolean>(`rest:${model}`) === true;
}

export async function callGroq(task: GroqTask, req: GroqRequest): Promise<GroqOutcome> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, reason: "error" };
  const client = new Groq({ apiKey, maxRetries: 0 }) as unknown as Client;

  let limited = false;
  let retryAfter: number | undefined;
  let hardError = false;
  let errStatus: number | undefined;
  const deadline = Date.now() + TOTAL_DEADLINE_MS; // shared across models and retries

  for (const model of modelOrder(task)) {
    if (restingFor(model)) {
      limited = true;
      continue;
    }
    const userContent = req.images?.length
      ? [{ type: "text", text: req.user }, ...req.images.slice(0, 3).map((url) => ({ type: "image_url", image_url: { url } }))]
      : req.user;
    const params: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: userContent },
      ],
      temperature: 0,
      max_completion_tokens: req.maxTokens,
      // gpt-oss: lowest effort. Qwen 3: no thinking (its reasoning tokens would count too).
      ...(isQwen(model) ? { reasoning_effort: "none" } : model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
      ...(req.schema
        ? { response_format: { type: "json_schema", json_schema: { name: "facts", strict: true, schema: req.schema } } }
        : {}),
    };

    // Up to 2 attempts per model: a schema-mismatch 400, a rejected reasoning param, or one short 429 wait.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const remaining = deadline - Date.now();
        if (remaining <= 0) return { ok: false, reason: "timeout" };
        const { data, response } = await client.chat.completions
          .create(params, { signal: AbortSignal.timeout(Math.min(OUTSIDE_TIMEOUT_MS, remaining)) })
          .withResponse();

        const remTokens = header(response?.headers, "x-ratelimit-remaining-tokens");
        const remReqs = header(response?.headers, "x-ratelimit-remaining-requests");
        const tokensLow = remTokens !== null && Number(remTokens) < NEAR_OUT_TOKENS;
        const reqsLow = remReqs !== null && Number(remReqs) < NEAR_OUT_REQUESTS;
        if (tokensLow || reqsLow) {
          const reset = reqsLow
            ? header(response?.headers, "x-ratelimit-reset-requests")
            : header(response?.headers, "x-ratelimit-reset-tokens");
          rest(model, parseSeconds(reset, 20));
        }
        const truncated = data.choices?.[0]?.finish_reason === "length";
        if (truncated && !req.allowTruncated) {
          hardError = true; // truncated output is unusable
          break;
        }
        if (process.env.NODE_ENV === "development") {
          // Token numbers only. Never message text.
          console.log("[groq]", {
            task,
            model,
            promptTokens: data.usage?.prompt_tokens,
            completionTokens: data.usage?.completion_tokens,
          });
        }
        const raw = data.choices?.[0]?.message?.content;
        // Only Qwen thinks in-band; never touch gpt-oss output (a message quoting "<think>" must not cut extract JSON).
        const text = typeof raw === "string" ? (isQwen(model) ? stripThinking(raw) : raw.trim()) : "";
        if (text) return truncated ? { ok: true, data: text, partial: true } : { ok: true, data: text };
        hardError = true;
        break;
      } catch (err) {
        const e = err as { status?: number; headers?: HeadersLike };
        if (e?.status === 429) {
          const secs = parseSeconds(header(e.headers, "retry-after"), 30);
          if (attempt === 0 && secs <= MAX_RETRY_WAIT_S && Date.now() + secs * 1000 < deadline) {
            await new Promise((r) => setTimeout(r, secs * 1000));
            continue; // honor retry-after once on the same model
          }
          rest(model, secs);
          limited = true;
          retryAfter = Math.min(retryAfter ?? secs, secs);
          break; // other model
        }
        if (e?.status === 400 && req.schema && attempt === 0) continue; // schema mismatch: retry once
        if (e?.status === 400 && isQwen(model) && attempt === 0 && "reasoning_effort" in params) {
          // ponytail: Preview model; if it rejects the reasoning param, retry once without it.
          delete params.reasoning_effort;
          continue;
        }
        if (classify(err) === "timeout") return { ok: false, reason: "timeout" };
        if (typeof e?.status === "number") errStatus = e.status;
        hardError = true;
        break;
      }
    }
  }

  if (limited && !hardError) {
    // Every model was out or resting: the user-facing "limit" case.
    return { ok: false, reason: "limit", retryAfter: retryAfter ?? 30 };
  }
  return {
    ok: false,
    reason: "error",
    ...(errStatus ? { status: errStatus } : {}),
    ...(errStatus === 404 ? { modelMissing: true } : {}),
  };
}
