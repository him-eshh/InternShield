// Answer impact (v3 contract; shell stream owns after setup): what one answer, added detail or edited
// message changed in the report, so the UI never shows a dead-end "no score impacted".
import type { Report, RiskLevel } from "./types";

export type AnswerImpact = {
  kind: "question" | "detail" | "message";
  /** What the user did, e.g. "You said they asked for a deposit". */
  label: string;
  scoreBefore: number;
  scoreAfter: number;
  levelBefore: RiskLevel;
  levelAfter: RiskLevel;
  /** Flags that appeared / went away. */
  added: { id: string; title: string }[];
  removed: { id: string; title: string }[];
  /** A fact the answer confirmed even when nothing moved (e.g. "Company website checked"). */
  confirmed?: string;
};

/**
 * Before/after diff of two reports. Basic version; TODO(shell): `confirmed` copy for answers that move nothing,
 * and flags whose points changed without appearing or going away.
 */
export function diffReports(before: Report, after: Report, kind: AnswerImpact["kind"], label: string): AnswerImpact {
  const ids = (r: Report) => new Set(r.flags.map((f) => f.id));
  const was = ids(before);
  const now = ids(after);
  return {
    kind,
    label,
    scoreBefore: before.score,
    scoreAfter: after.score,
    levelBefore: before.level,
    levelAfter: after.level,
    added: after.flags.filter((f) => !was.has(f.id)).map(({ id, title }) => ({ id, title })),
    removed: before.flags.filter((f) => !now.has(f.id)).map(({ id, title }) => ({ id, title })),
  };
}
