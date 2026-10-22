// Keyword gap, no LLM (findings 03 Ranked plan #2): posting terms from the skill list + alias map,
// Required vs Preferred from cue phrases, three buckets. Counts only, never an "ATS score".
import { ALIASES, canon, SKILLS, termRe } from "./resumeGuard";
import type { GapTerm, KeywordGap } from "./types";

/** Each term once, grouped with its aliases (group[0] is the canonical name). */
const GROUPS: { names: string[]; res: RegExp[] }[] = (() => {
  const grouped = new Set(ALIASES.flat().map((n) => canon(n).trim()));
  const singles = SKILLS.filter((s) => !grouped.has(canon(s).trim())).map((s) => [s]);
  return [...ALIASES, ...singles].map((names) => ({ names, res: names.map(termRe) }));
})();

const PREFERRED = /\b(?:prefer(?:red|ably)?|nice[- ]to[- ]have|a plus|is a plus|bonus|ideally|desirable|desired|not required)\b/i;
const REQUIRED = /\b(?:must|required|requirements?|minimum|need to|you have|you'll need|qualifications|essential)\b/i;

/** Lines of the posting tagged required/preferred; a cue-only header ("Nice to have:") carries to the lines below. */
function taggedLines(posting: string): { text: string; preferred: boolean }[] {
  let mode: boolean | null = null; // null = no header yet
  const out: { text: string; preferred: boolean }[] = [];
  for (const raw of posting.split(/\n|(?<=[.;])\s+/)) {
    const line = raw.trim();
    if (!line) continue;
    const pref = PREFERRED.test(line);
    const req = !pref && REQUIRED.test(line);
    const header = line.length <= 60 && /:\s*$/.test(line);
    if (header && (pref || req)) mode = pref;
    else if (header) mode = null;
    out.push({ text: line, preferred: pref || (!req && mode === true) });
  }
  return out;
}

/** Posting terms in three buckets. `facts` = terms the user said they have (count as found). */
export function keywordGap(posting: string, resume: string, facts: string[] = []): KeywordGap {
  const mine = canon([resume, ...facts].join("\n"));
  const required: GapTerm[] = [];
  const preferred: GapTerm[] = [];
  const seen = new Map<number, GapTerm & { preferred: boolean }>();
  for (const line of taggedLines(posting ?? "")) {
    const c = canon(line.text);
    GROUPS.forEach((g, gi) => {
      const at = g.res.findIndex((re) => re.test(c));
      if (at < 0) return;
      const prev = seen.get(gi);
      if (prev) {
        prev.preferred &&= line.preferred; // named as required anywhere -> required
        return;
      }
      const term = g.names[at];
      const exact = g.res[at].test(mine);
      const alias = exact ? -1 : g.res.findIndex((re) => re.test(mine));
      seen.set(gi, {
        term,
        bucket: exact ? "found" : alias >= 0 ? "alias" : "missing",
        ...(alias >= 0 && !exact ? { alias: g.names[alias] } : {}),
        preferred: line.preferred,
      });
    });
  }
  for (const { preferred: p, ...t } of seen.values()) (p ? preferred : required).push(t);
  return { required, preferred };
}

/** "6 of 8 required terms in your resume" (an alias counts as in it). */
export function gapCount(terms: GapTerm[]): { have: number; total: number } {
  return { have: terms.filter((t) => t.bucket !== "missing").length, total: terms.length };
}
