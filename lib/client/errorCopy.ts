// Short user-facing copy per typed API error code. Generic text only for unmapped codes.
import type { ApiErrorCode, FailReason } from "@/lib/types";

const COPY: Partial<Record<ApiErrorCode, string>> = {
  RATE_LIMITED: "We're busy. Try again in a moment.",
  DAILY_CAP: "InternShield is resting for today.",
  TIMEOUT: "That took too long. Try again.",
  UPSTREAM: "A lookup service didn't answer. Try again.",
  BAD_INPUT: "We couldn't read that request.",
  TOO_LARGE: "That message is too long to check.",
  MODEL_UNAVAILABLE: "The AI is unavailable right now. Try again soon.",
  NOT_FOUND: "Nothing found.",
};
const GENERIC = "Something went wrong. Try again.";

/** Older servers send no code; fall back on the coarse reason. */
const FROM_REASON: Record<FailReason, ApiErrorCode> = { limit: "RATE_LIMITED", timeout: "TIMEOUT", error: "UNKNOWN" };

export function errorCopy(code?: ApiErrorCode, reason?: FailReason): string {
  const c = code ?? (reason ? FROM_REASON[reason] : "UNKNOWN");
  return COPY[c] ?? GENERIC;
}

const NOTE: Partial<Record<ApiErrorCode, string>> = {
  RATE_LIMITED: "busy, try again soon",
  DAILY_CAP: "resting for today",
  TIMEOUT: "took too long",
};

/** Lowercase note after a checklist line ("Looking up the company — took too long"). */
export function stepNote(code?: ApiErrorCode, reason?: string): string {
  const c = code ?? (reason === "limit" || reason === "timeout" || reason === "error" ? FROM_REASON[reason] : undefined);
  return (c && NOTE[c]) ?? "couldn't check";
}
