// STUB from Slice 1 — engine-builder replaces this with the real engine.
// The exported signatures are the contract the UI and eval depend on.
import type { Report, ScoreInput } from "../types";

export function score(input: ScoreInput): Report {
  void input;
  return {
    score: 0,
    level: "low",
    flags: [],
    groups: { sender: [], message: [], offer: [] },
    couldntCheck: [],
    coverage: { ran: 0, total: 0, missingImportant: [] },
    questions: [],
    postingMatch: null,
    thinMessage: false,
  };
}

/** One line saying why the score changed after a quick-question answer, or null if it didn't. */
export function describeChange(prev: Report, next: Report): string | null {
  return prev.score === next.score ? null : `Score went from ${prev.score} to ${next.score}.`;
}
