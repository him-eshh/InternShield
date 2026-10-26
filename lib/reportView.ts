// Pure view helpers for the report screen (ordering, short copy, ring ticks).
import { severityOf as flagSeverity } from "@/lib/scoring/flagInfo";
import { WEIGHTS } from "@/lib/scoring/rules";
import type { Flag, Report, RiskLevel } from "@/lib/types";

export type Severity = "critical" | "high" | "medium" | "low";
const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Severity of a flag. Uses the flag's own value; older fixtures get the same default lib/scoring/flagInfo assigns. */
export function severityOf(flag: Flag): Severity {
  return flag.severity && flag.severity in RANK ? flag.severity : flagSeverity(flag);
}

export const SEVERITY_LABEL: Record<Severity, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

/** Red flags first, most severe first (then most points); good signs last. Stable and non-mutating. */
export function sortFlags(flags: Flag[]): Flag[] {
  return flags
    .map((f, i) => ({ f, i }))
    .sort((a, b) => {
      const ra = a.f.kind === "red" ? RANK[severityOf(a.f)] : 9;
      const rb = b.f.kind === "red" ? RANK[severityOf(b.f)] : 9;
      return ra - rb || b.f.points - a.f.points || a.i - b.i;
    })
    .map((x) => x.f);
}

export const reds = (flags: Flag[]): Flag[] => sortFlags(flags).filter((f) => f.kind === "red");
export const goods = (flags: Flag[]): Flag[] => flags.filter((f) => f.kind === "good");

/** The three most severe red flags. */
export function topReasons(flags: Flag[], n = 3): Flag[] {
  return reds(flags).slice(0, n);
}

/** One line under the verdict. No reassurance wording, never a "safe" verdict. */
export function actionLine(level: RiskLevel): string {
  if (level === "high") return "Don't reply, pay, or click anything. Block the sender and report it.";
  if (level === "medium") return "Check the company's own website before you reply or share anything.";
  return "Still confirm the role on the company's own site before you share personal details.";
}

/** One boolean per check: true = ran. Honest: never more ticks than checks that exist, capped at 14. */
export function coverageTicks(coverage: Report["coverage"], max = 14): boolean[] {
  const total = Math.max(1, Math.round(coverage.total));
  const ran = Math.max(0, Math.min(total, Math.round(coverage.ran)));
  if (total <= max) return Array.from({ length: total }, (_, i) => i < ran);
  const on = Math.round((ran / total) * max);
  return Array.from({ length: max }, (_, i) => i < on);
}

/** Why the shown score isn't the plain sum of the rule weights on the cards (critical floor, good-sign cap, 0-100), else null. */
export function scoreMathNote(report: Pick<Report, "score" | "flags">): string | null {
  const red = report.flags.filter((f) => f.kind === "red").reduce((n, f) => n + f.points, 0);
  const good = report.flags.filter((f) => f.kind === "good").reduce((n, f) => n + f.points, 0);
  const sum = Math.round(red + good);
  if (sum === report.score) return null;
  if (report.flags.some((f) => f.critical) && report.score > sum) return `The rule weights add up to ${sum}. A critical sign sets the score to at least ${WEIGHTS.criticalFloor}.`;
  if (sum > 100) return `The rule weights add up to ${sum}. The score stops at 100.`;
  if (sum < 0) return `The rule weights add up to ${sum}. The score doesn't go below 0.`;
  return `The rule weights add up to ${sum}. Good signs lower the score by at most ${-WEIGHTS.goodSignCap}.`;
}

/** "+12" / "-8" / "0" for the delta chip. */
export function deltaLabel(from: number, to: number): string {
  const d = Math.round(to) - Math.round(from);
  return d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "0";
}

/** Screen-reader sentence when the score moves. */
export function deltaAnnouncement(from: number, to: number): string {
  const d = Math.round(to) - Math.round(from);
  if (d === 0) return `Risk stays at ${to}`;
  return `Risk ${d > 0 ? "up" : "down"} ${Math.abs(d)}, now ${to}`;
}
