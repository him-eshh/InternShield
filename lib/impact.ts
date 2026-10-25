// Answer impact (v3 report stream): what one answer, added detail or edited
// message changed in the report, so the UI never shows a dead-end "no score impacted".
import { LEVEL_LABELS, type Report, type RiskLevel } from "./types";

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
  changed: { id: string; title: string; before: number; after: number }[];
  /** A fact the answer confirmed even when nothing moved (e.g. "Company website checked"). */
  confirmed?: string;
};

/**
 * Compare evidence by stable signal ID, including changed weights and unchanged-score confirmation.
 */
export function diffReports(before: Report, after: Report, kind: AnswerImpact["kind"] = "detail", label = "Updated details"): AnswerImpact {
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
    changed: after.flags.flatMap((f) => {
      const old = before.flags.find((x) => x.id === f.id);
      return old && old.points !== f.points ? [{ id: f.id, title: f.title, before: old.points, after: f.points }] : [];
    }),
    confirmed: before.score === after.score && before.level === after.level ? label : undefined,
  };
}

/** Shared copy for every kind of addition, including useful confirmation when the score stays put. */
export function impactCopy(impact: AnswerImpact): string {
  const { label, scoreBefore, scoreAfter, levelAfter } = impact;
  const result = scoreBefore === scoreAfter && impact.levelBefore === levelAfter
    ? `Confirmed: ${impact.confirmed ?? label}. Score unchanged at ${scoreAfter}, still ${LEVEL_LABELS[levelAfter]}.`
    : `Score ${scoreBefore} \u2192 ${scoreAfter}, now ${LEVEL_LABELS[levelAfter]}.`;
  const signals = [
    ...impact.added.map((f) => `+ ${f.title}`),
    ...impact.removed.map((f) => `\u2212 ${f.title}`),
    ...impact.changed.map((f) => `${f.title}: ${f.before} \u2192 ${f.after} points`),
  ];
  return [`Added: ${label}.`, result, ...signals].join("\n");
}
