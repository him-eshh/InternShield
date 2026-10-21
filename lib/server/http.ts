// Response helpers shared by every route. Bodies are lib/types ApiResponse shapes.
import type { ApiResponse, FailReason } from "@/lib/types";

export const OUTSIDE_TIMEOUT_MS = 8000;

export type Outcome<T> =
  | { ok: true; data: T }
  | { ok: false; reason: FailReason; retryAfter?: number };

const STATUS: Record<FailReason, number> = { timeout: 504, limit: 429, error: 502 };

export const MESSAGES = {
  busy: "InternShield is busy right now. Please try again in a moment.",
  daily: "InternShield is resting for today. Please come back tomorrow.",
  timeout: "That took too long. Please try again.",
  error: "Something went wrong on our side. Please try again.",
  bad: "We couldn't read that request.",
  origin: "This request isn't allowed from here.",
  big: "That message is too long to check.",
} as const;

export function done<T>(data: T): Response {
  const body: ApiResponse<T> = { status: "done", data };
  return Response.json(body);
}

export function failed(
  reason: FailReason,
  opts: { status?: number; retryAfter?: number; message?: string } = {},
): Response {
  const body: ApiResponse<never> = {
    status: "failed",
    reason,
    ...(opts.retryAfter ? { retryAfter: opts.retryAfter } : {}),
    message:
      opts.message ?? (reason === "timeout" ? MESSAGES.timeout : reason === "limit" ? MESSAGES.busy : MESSAGES.error),
  };
  const headers: Record<string, string> = {};
  if (opts.retryAfter) headers["Retry-After"] = String(opts.retryAfter);
  return Response.json(body, { status: opts.status ?? STATUS[reason], headers });
}

export function fromOutcome<T>(o: Outcome<T>): Response {
  if (o.ok) return done(o.data);
  return failed(o.reason, {
    retryAfter: o.retryAfter,
    message: o.reason === "limit" && (o.retryAfter ?? 0) > 3600 ? MESSAGES.daily : undefined,
  });
}

/** Rejects with a TimeoutError if the promise takes longer than ms. */
export function withTimeout<T>(p: Promise<T>, ms = OUTSIDE_TIMEOUT_MS): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    t = setTimeout(() => {
      const e = new Error("timeout");
      e.name = "TimeoutError";
      reject(e);
    }, ms);
  });
  return Promise.race([p, timer]).finally(() => clearTimeout(t));
}

export function classify(err: unknown): FailReason {
  const e = err as { name?: string; message?: string } | null;
  const s = `${e?.name ?? ""} ${e?.message ?? ""}`.toLowerCase();
  return /timeout|timed out|abort/.test(s) ? "timeout" : "error";
}

export function normalizeFetchInit(init: RequestInit = {}): RequestInit {
  return { ...init, signal: init.signal ?? AbortSignal.timeout(OUTSIDE_TIMEOUT_MS) };
}
