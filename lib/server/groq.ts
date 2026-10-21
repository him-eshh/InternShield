// Groq calls with per-model fallback (spec.md > Model Fallback, Token Budget).
import Groq from "groq-sdk";
import { cacheGet, cacheSet } from "./cache";
import { classify, OUTSIDE_TIMEOUT_MS, type Outcome } from "./http";

export type GroqTask = "extract" | "explain";

export const MODEL_20B = "openai/gpt-oss-20b";
export const MODEL_120B = "openai/gpt-oss-120b";

const ORDER: Record<GroqTask, string[]> = {
  extract: [MODEL_20B, MODEL_120B],
  explain: [MODEL_120B, MODEL_20B],
};

export interface GroqRequest {
  system: string;
  user: string;
  /** Strict JSON schema; omit for plain text. */
  schema?: object;
  maxTokens: number;
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

export async function callGroq(task: GroqTask, req: GroqRequest): Promise<Outcome<string>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, reason: "error" };
  const client = new Groq({ apiKey, maxRetries: 0 }) as unknown as Client;

  let limited = false;
  let retryAfter: number | undefined;
  let hardError = false;
  const deadline = Date.now() + TOTAL_DEADLINE_MS; // shared across models and retries

  for (const model of ORDER[task]) {
    if (restingFor(model)) {
      limited = true;
      continue;
    }
    const params: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      temperature: 0,
      max_completion_tokens: req.maxTokens,
      reasoning_effort: "low",
      ...(req.schema
        ? { response_format: { type: "json_schema", json_schema: { name: "facts", strict: true, schema: req.schema } } }
        : {}),
    };

    // Up to 2 attempts per model: the retry is for a schema-mismatch 400 only.
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
        if (data.choices?.[0]?.finish_reason === "length") {
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
        const text = data.choices?.[0]?.message?.content;
        if (typeof text === "string" && text.trim()) return { ok: true, data: text };
        hardError = true;
        break;
      } catch (err) {
        const e = err as { status?: number; headers?: HeadersLike };
        if (e?.status === 429) {
          const secs = parseSeconds(header(e.headers, "retry-after"), 30);
          rest(model, secs);
          limited = true;
          retryAfter = Math.min(retryAfter ?? secs, secs);
          break; // other model
        }
        if (e?.status === 400 && req.schema && attempt === 0) continue; // schema mismatch: retry once
        if (classify(err) === "timeout") return { ok: false, reason: "timeout" };
        hardError = true;
        break;
      }
    }
  }

  if (limited && !hardError) {
    // Every model was out or resting: the user-facing "limit" case.
    return { ok: false, reason: "limit", retryAfter: retryAfter ?? 30 };
  }
  return { ok: false, reason: "error" };
}
