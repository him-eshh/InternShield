// Usage Guard (spec.md > Usage Guard). Called first in every route.
import { MAX_MESSAGE_CHARS } from "@/lib/types";
import { MINUTE, takeCount } from "./cache";
import { failed, MESSAGES } from "./http";

type RouteName = "extract" | "company" | "sender" | "posting" | "explain" | "rewrite" | "transcribe" | "interview" | "wikidata" | "intel";

export type GuardResult =
  | { ok: true; body: Record<string, unknown>; ip: string }
  | { ok: false; response: Response };

const MAX_BODY_BYTES = 16 * 1024;
/** Transcribe carries one browser-compressed screenshot as a data URL (Vercel's body limit is 4.5 MB). */
const MAX_IMAGE_BODY_BYTES = 3.6 * 1024 * 1024; // two-strip tall screenshots, base64 (findings A2)

// Per-visitor limits for the tier AI routes: [per minute, per day].
const VISITOR_LIMITS: Partial<Record<RouteName, [number, number]>> = {
  rewrite: [4, 15],
  transcribe: [2, 6],
  interview: [6, 30],
  intel: [4, 20],
};

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function allowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  return (raw ? raw.split(",") : ["http://localhost:3000"]).map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
}

function clientIp(req: Request): string {
  // Vercel overwrites this header at its edge. Outside Vercel production there
  // is no trusted proxy contract, so use one conservative shared visitor bucket.
  const header = process.env.VERCEL
    ? req.headers.get("x-vercel-forwarded-for")
    : process.env.NODE_ENV === "production" ? null : req.headers.get("x-forwarded-for");
  const first = header?.split(",")[0]?.trim();
  return first || "shared";
}

/** Read only up to the route cap, including when Content-Length is absent or false. */
async function readLimitedText(req: Request, maxBytes: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      void reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

function reject(status: number, message: string): GuardResult {
  return { ok: false, response: failed("error", { status, message }) };
}

function limited(retryAfter: number): GuardResult {
  return {
    ok: false,
    response: failed("limit", {
      status: 429,
      retryAfter,
      message: retryAfter > 3600 ? MESSAGES.daily : MESSAGES.busy,
    }),
  };
}

export async function guard(req: Request, route: RouteName): Promise<GuardResult> {
  // Dev-only failure switch: ?fail=1 acts like a timed-out step.
  if (process.env.NODE_ENV !== "production") {
    try {
      if (new URL(req.url).searchParams.get("fail") === "1") {
        return { ok: false, response: failed("timeout", { status: 504 }) };
      }
    } catch {
      /* bad URL: fall through */
    }
  }

  const origin = req.headers.get("origin")?.replace(/\/$/, "");
  if (!origin || !allowedOrigins().includes(origin)) return reject(403, MESSAGES.origin);

  const maxBytes = route === "transcribe" ? MAX_IMAGE_BODY_BYTES : MAX_BODY_BYTES;
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return reject(413, MESSAGES.big);

  let text: string;
  try {
    const bounded = await readLimitedText(req, maxBytes);
    if (bounded === null) return reject(413, MESSAGES.big);
    text = bounded;
  } catch {
    return reject(400, MESSAGES.bad);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return reject(400, MESSAGES.bad);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reject(400, MESSAGES.bad);
  const b = body as Record<string, unknown>;
  if (typeof b.message === "string" && b.message.length > MAX_MESSAGE_CHARS) return reject(413, MESSAGES.big);

  const ip = clientIp(req);
  const visitor = VISITOR_LIMITS[route];
  if (visitor) {
    const m = takeCount(`ip:min:${route}:${ip}`, visitor[0], MINUTE);
    if (!m.ok) return limited(m.retryAfter);
    const d = takeCount(`ip:day:${route}:${ip}`, visitor[1], "day");
    if (!d.ok) return limited(d.retryAfter);
  } else if (route === "extract") {
    const m = takeCount(`ip:min:extract:${ip}`, 3, MINUTE);
    if (!m.ok) return limited(m.retryAfter);
    const d = takeCount(`ip:day:extract:${ip}`, 20, "day");
    if (!d.ok) return limited(d.retryAfter);
  } else {
    const m = takeCount(`ip:min:other:${ip}`, 20, MINUTE);
    if (!m.ok) return limited(m.retryAfter);
  }
  return { ok: true, body: b, ip };
}

/** Counts one live (uncached, non-example) check against DAILY_CHECK_CAP. */
export function takeCheck(): { ok: true } | { ok: false; retryAfter: number } {
  const r = takeCount("global:checks", envInt("DAILY_CHECK_CAP", 120), "day");
  return r.ok ? { ok: true } : { ok: false, retryAfter: r.retryAfter };
}

/** Counts one live resume rewrite against REWRITE_DAILY_CAP (site-wide). */
export function takeRewrite(): { ok: true } | { ok: false; retryAfter: number } {
  const r = takeCount("global:rewrite", envInt("REWRITE_DAILY_CAP", 30), "day");
  return r.ok ? { ok: true } : { ok: false, retryAfter: r.retryAfter };
}

/** Counts one live screenshot transcription against TRANSCRIBE_DAILY_CAP (site-wide). */
export function takeTranscribe(): { ok: true } | { ok: false; retryAfter: number } {
  const r = takeCount("global:transcribe", envInt("TRANSCRIBE_DAILY_CAP", 12), "day");
  return r.ok ? { ok: true } : { ok: false, retryAfter: r.retryAfter };
}

/** Counts one live interview call (question, hint or feedback) against INTERVIEW_DAILY_CAP (site-wide). */
export function takeInterview(): { ok: true } | { ok: false; retryAfter: number } {
  const r = takeCount("global:interview", envInt("INTERVIEW_DAILY_CAP", 50), "day");
  return r.ok ? { ok: true } : { ok: false, retryAfter: r.retryAfter };
}

/** Counts one Tavily call against TAVILY_DAILY_CAP (free plan: 1,000 credits/month). */
export function takeTavily(): { ok: true } | { ok: false; retryAfter: number } {
  const r = takeCount("global:tavily", envInt("TAVILY_DAILY_CAP", 30), "day");
  return r.ok ? { ok: true } : { ok: false, retryAfter: r.retryAfter };
}

/** Counts one uncached company-intel lookup against INTEL_DAILY_CAP (site-wide), so intel can't eat the check flow's Tavily budget. */
export function takeIntel(): { ok: true } | { ok: false; retryAfter: number } {
  const r = takeCount("global:intel", envInt("INTEL_DAILY_CAP", 15), "day");
  return r.ok ? { ok: true } : { ok: false, retryAfter: r.retryAfter };
}

/** Counts one Wikidata lookup against WIKIDATA_DAILY_CAP (site-wide). */
export function takeWikidata(): { ok: true } | { ok: false; retryAfter: number } {
  const r = takeCount("global:wikidata", envInt("WIKIDATA_DAILY_CAP", 300), "day");
  return r.ok ? { ok: true } : { ok: false, retryAfter: r.retryAfter };
}
