// Answer impact : what one answer, added detail or edited
// message changed in the report, so the UI never shows a dead-end "no score impacted".
import { LEVEL_LABELS, type Report, type RiskLevel } from "./types";

type ImpactSign = { id: string; title: string; kind: "red" | "good" };

export type AnswerImpact = {
  kind: "question" | "detail" | "message";
  /** What the user did, e.g. "They asked for a deposit". */
  label: string;
  /** The question that was answered, when kind is "question". */
  question?: string;
  scoreBefore: number;
  scoreAfter: number;
  levelBefore: RiskLevel;
  levelAfter: RiskLevel;
  /** Signs that appeared / went away. A sign never sits in both lists. */
  added: ImpactSign[];
  removed: ImpactSign[];
  changed: { id: string; title: string; before: number; after: number }[];
  /** A fact the answer confirmed even when nothing moved (e.g. "Company website checked"). */
  confirmed?: string;
};

/** The engine reuses one finding under several ids/titles (by sender type, pay wording...). Same family = same flag. */
const FAMILY: Record<string, string> = {
  free_email_established: "free_email",
  free_email_startup: "free_email",
  vague_high_pay: "vague_easy_pay",
  real_domain: "official_domain",
};

/** One wording per family, so a flag reads the same wherever it shows. */
const CANON_TITLE: Record<string, string> = {
  free_email: "Sent from a free email account",
  vague_easy_pay: "Vague duties, easy pay, no experience needed",
  official_domain: "Sent from the company's real website",
  posting_found: "The role is on the company's own careers site",
};

const familyOf = (id: string) => FAMILY[id] ?? id;

/** Last-resort key for the same sentence worded two ways ("account" vs "address", "high" vs "easy" pay). */
const titleKey = (title: string) =>
  title.toLowerCase().replace(/\baddress\b/g, "account").replace(/\b(high|easy)\b/g, "easy").replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();

function canonicalTitle(id: string, title: string): string {
  return CANON_TITLE[familyOf(id)] ?? title;
}

/**
 * Compare evidence by stable signal family, including changed weights and unchanged-score confirmation.
 * The same flag under two ids or wordings is neither added nor removed.
 */
export function diffReports(before: Report, after: Report, kind: AnswerImpact["kind"] = "detail", label = "Updated details", question?: string): AnswerImpact {
  const keys = (f: { id: string; title: string }) => [familyOf(f.id), `t:${titleKey(canonicalTitle(f.id, f.title))}`];
  const was = new Set(before.flags.flatMap(keys));
  const now = new Set(after.flags.flatMap(keys));
  const sign = (f: Report["flags"][number]): ImpactSign => ({ id: f.id, title: canonicalTitle(f.id, f.title), kind: f.kind });
  const uniq = (xs: ImpactSign[]) => xs.filter((x, i) => xs.findIndex((y) => familyOf(y.id) === familyOf(x.id)) === i);
  const present = (set: Set<string>) => (f: Report["flags"][number]) => keys(f).some((k) => set.has(k));
  const changed = after.flags.flatMap((f) => {
    const old = before.flags.find((x) => keys(x).some((k) => keys(f).includes(k)));
    // A weight of 0 is a critical flag that decides the level on its own; "0 to 40" says nothing, so skip it.
    return old && old.points !== f.points && old.points !== 0 && f.points !== 0
      ? [{ id: f.id, title: canonicalTitle(f.id, f.title), before: old.points, after: f.points }]
      : [];
  });
  return {
    kind,
    label,
    question,
    scoreBefore: before.score,
    scoreAfter: after.score,
    levelBefore: before.level,
    levelAfter: after.level,
    added: uniq(after.flags.filter((f) => !present(was)(f)).map(sign)),
    removed: uniq(before.flags.filter((f) => !present(now)(f)).map(sign)),
    changed,
    confirmed: before.score === after.score && before.level === after.level ? label : undefined,
  };
}

/** "Score 100 → 100, still Strong signs of a scam": one coherent line whether or not the number moved. */
export function scoreLine(impact: AnswerImpact): string {
  const { scoreBefore, scoreAfter, levelBefore, levelAfter } = impact;
  return `Score ${scoreBefore} → ${scoreAfter}, ${levelBefore === levelAfter ? "still" : "now"} ${LEVEL_LABELS[levelAfter]}`;
}

export type ImpactLine = { tone: "new" | "gone" | "weight" | "none"; text: string };

/** One line per change. New reasons are "new", never a plus beside a minus for the same thing. */
export function impactLines(impact: AnswerImpact): ImpactLine[] {
  const lines: ImpactLine[] = [
    ...impact.added.map((f): ImpactLine => ({ tone: "new", text: `${f.kind === "red" ? "New warning sign" : "New good sign"}: ${f.title}` })),
    ...impact.removed.map((f): ImpactLine => ({ tone: "gone", text: `${f.kind === "red" ? "No longer flagged" : "No longer counted as a good sign"}: ${f.title}` })),
    ...impact.changed.map((f): ImpactLine => ({ tone: "weight", text: `${f.title} now counts for ${f.after > f.before ? "more" : "less"}` })),
  ];
  return lines.length ? lines : [{ tone: "none", text: "Nothing new turned up, so the evidence stays as it was." }];
}

/** Plain-text version (screen readers, copy): the same facts the card shows. */
export function impactCopy(impact: AnswerImpact): string {
  const what = impact.question ? `${impact.question} ${impact.label}` : impact.label;
  return [`You added: ${what}.`, `${scoreLine(impact)}.`, ...impactLines(impact).map((l) => `${l.text}.`)].join("\n");
}
