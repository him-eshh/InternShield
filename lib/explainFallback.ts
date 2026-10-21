// Pre-written explanation + banned-word filter (spec.md > Explain Route).
// Stub from Slice 1; api-builder owns and fills in per-flag sentences.
import type { ExplainRequest } from "./types";

const BANNED = /\b(safe|safely|safety|legit|legitimate|guaranteed?)\b/i;

export function hasBannedWord(text: string): boolean {
  return BANNED.test(text);
}

export function fallbackExplanation({ level, flags }: ExplainRequest): string {
  if (flags.length === 0) {
    return "We didn't find any red flags in this message. That isn't a guarantee, so apply through the company's official careers page.";
  }
  const lead =
    level === "high"
      ? "This message shows strong signs of a scam."
      : level === "medium"
        ? "This message has some warning signs worth double checking."
        : "We didn't find red flags, but a few details are worth a look.";
  return [lead, ...flags.slice(0, 6).map((f) => f.why)].join(" ");
}
