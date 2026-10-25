// Deterministic checks every suggested edit must pass (brief R3), shared by the browser and /api/rewrite.
// Order of cost: cheap string rules first, the fact guard last.
import { guardRewrite } from "./resumeGuard";
import { canon, termRe } from "./resumeGuard";
import { docLines } from "./resumeModel";
import { adjectiveStack, bannedIn, emDashCount, styleIssues } from "./resumeTells";
import { LINE_GROWTH, MAX_EDITS, TOTAL_GROWTH, type ResumeDoc, type ResumeLine } from "./resumeTypes";

export type EditFailure = "empty" | "unchanged" | "multiline" | "length" | "rewrite" | "fact" | "tell" | "dash" | "stack" | "style";

export interface EditCheck {
  ok: boolean;
  failures: EditFailure[];
  /** Short detail for logs and the retry prompt ("number 40%", "word leveraged"). */
  details: string[];
}

export interface CheckInput {
  /** The whole resume as text (facts live here). */
  resume: string;
  original: string;
  proposed: string;
  /** Terms the user confirmed with "I have this". */
  facts?: string[];
  posting?: string | null;
}

const words = (s: string) => canon(s).trim().split(" ").filter(Boolean);

/** The share of the original's words that survive in the proposed line (0..1). */
export function keptShare(original: string, proposed: string): number {
  const a = words(original);
  if (!a.length) return 1;
  const b = new Set(words(proposed));
  return a.filter((w) => b.has(w)).length / a.length;
}

export function checkEdit(i: CheckInput): EditCheck {
  const failures: EditFailure[] = [];
  const details: string[] = [];
  const fail = (f: EditFailure, d?: string) => {
    if (!failures.includes(f)) failures.push(f);
    if (d) details.push(d);
  };
  const proposed = (i.proposed ?? "").trim();
  const original = (i.original ?? "").trim();
  if (!proposed) {
    fail("empty");
    return { ok: false, failures, details };
  }
  if (/[\r\n]/.test(proposed)) fail("multiline");
  if (canon(proposed) === canon(original) && proposed === original) fail("unchanged");
  if (proposed.length > Math.floor(original.length * LINE_GROWTH)) fail("length", `${proposed.length} > ${Math.floor(original.length * LINE_GROWTH)} chars`);
  if (keptShare(original, proposed) < 0.5) fail("rewrite", "keeps under half of the original words");

  const banned = bannedIn(proposed);
  if (banned.length) fail("tell", `word ${banned.join(", ")}`);
  if (emDashCount(proposed) > emDashCount(original)) fail("dash");
  if (adjectiveStack(proposed) && !adjectiveStack(original)) fail("stack");
  const style = styleIssues(original, proposed);
  if (style.length) fail("style", style.join(", "));

  if (!failures.length || failures.every((f) => f === "style" || f === "stack")) {
    const g = guardRewrite({ resume: i.resume, original, rewrite: proposed, posting: i.posting ?? null, facts: i.facts, level: "internship", noBuzzwords: true });
    if (g.tier === "block") fail("fact", g.issues.map((x) => `${x.kind} ${x.token}`).join(", "));
    else if (g.warnings.length) fail("fact", g.warnings.map((w) => `${w.kind} ${w.token}`).join(", "));
  }
  return { ok: failures.length === 0, failures, details };
}

/** Posting keywords this edit brings in: present in the proposed line, absent from the original. */
export function addedKeywords(keywords: string[], original: string, proposed: string): string[] {
  const before = canon(original);
  const after = canon(proposed);
  return keywords.filter((k) => {
    const re = termRe(k);
    return re.test(after) && !re.test(before);
  });
}

/** Lines the tool may rewrite: bullets only (never headings, names, contact, role or date lines). */
export function editableLines(doc: ResumeDoc): ResumeLine[] {
  return docLines(doc).filter((l) => l.kind === "bullet" && l.text.split(/\s+/).length >= 5);
}

/** Total length of the edited text vs the original must stay within +3%. */
export function withinTotalBudget(doc: ResumeDoc, texts: Map<string, string>): boolean {
  const lines = docLines(doc);
  const before = lines.reduce((n, l) => n + l.text.length, 0);
  const after = lines.reduce((n, l) => n + (texts.get(l.id) ?? l.text).length, 0);
  return after <= before * TOTAL_GROWTH;
}

export { MAX_EDITS };
