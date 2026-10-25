// AI-tell filter (brief R3, findings 03 §8). Pure; used by the browser and by /api/rewrite.
// A suggested edit that sounds machine-written is dropped, never shown.

/** Words and phrases that read as AI-written. Stems cover the common endings. */
const BANNED: [RegExp, string][] = [
  [/\bspearhead(?:ed|ing|s)?\b/i, "spearheaded"],
  [/\bleverag(?:e|ed|es|ing)\b/i, "leveraged"],
  [/\butili[sz](?:e|ed|es|ing)\b/i, "utilized"],
  [/\bpassionate\b/i, "passionate"],
  [/\bsynerg(?:y|ies|ize|ized)\b/i, "synergy"],
  [/\bcutting[- ]edge\b/i, "cutting-edge"],
  [/\bdynamic\b/i, "dynamic"],
  [/\bresults?[- ]driven\b/i, "results-driven"],
  [/\borchestrat(?:e|ed|es|ing)\b/i, "orchestrated"],
  [/\bseamless(?:ly)?\b/i, "seamlessly"],
  [/\brobust(?:ly)?\b/i, "robust"],
  [/\binnovati(?:ve|vely|on)\b/i, "innovative"],
  [/\bproven track record\b/i, "proven track record"],
  [/\bin today'?s? (?:fast[- ]paced|digital|competitive)\b/i, "in today's fast-paced"],
  [/\bdr(?:ove|ive|iving|iven) (?:real |meaningful |measurable |significant )?impact\b/i, "drove impact"],
  [/\bshowcas(?:e|ed|es|ing)\b/i, "showcasing"],
  [/\bdemonstrat(?:e|ed|es|ing)\b/i, "demonstrating"],
];

const EM_DASH = /[—―]/g;
export const emDashCount = (s: string) => (s.match(EM_DASH) ?? []).length;

// Match typographic spellings and invisible separators without changing the user's displayed text.
const tellText = (text: string) => text.normalize("NFKC")
  .replace(/[\u2010-\u2015\u2212]/g, "-")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
  .replace(/\s+/g, " ");

/** Banned words found in the text, by their listed name. */
export function bannedIn(text: string): string[] {
  const normalized = tellText(text);
  return BANNED.filter(([re]) => re.test(normalized)).map(([, name]) => name);
}

/** Adjectives that pile up in machine-written bullets. Three in a row is a stack. */
const ADJECTIVES = new Set(
  (
    "strong dynamic innovative scalable robust seamless efficient effective comprehensive collaborative cross-functional " +
    "high-impact impactful data-driven meaningful critical key significant substantial valuable strategic streamlined " +
    "powerful intuitive cutting-edge actionable measurable sustainable holistic proactive detail-oriented fast-paced " +
    "high-performing high-quality reliable flexible modern advanced exceptional outstanding successful extensive"
  ).split(" "),
);

/** True when three or more stacked adjectives appear in a row (commas and "and" between them allowed). */
export function adjectiveStack(text: string): boolean {
  const words = tellText(text).toLowerCase().replace(/[^a-z\s,-]/g, " ").split(/[\s,]+/).filter((w) => w && w !== "and");
  let run = 0;
  for (const w of words) {
    run = ADJECTIVES.has(w) ? run + 1 : 0;
    if (run >= 3) return true;
  }
  return false;
}

const IRREGULAR_PAST = new Set(
  "built led ran wrote made drove taught sold brought kept held won grew cut set put got took gave saw met found began chose spoke".split(" "),
);

type Tense = "past" | "gerund" | "base" | "third";

/** Tense of the opening verb, null when the line does not open with one we can tell. */
function openingTense(line: string): Tense | null {
  const w = (line.trim().match(/^[A-Za-z]+/)?.[0] ?? "").toLowerCase();
  if (w.length < 3) return null;
  if (IRREGULAR_PAST.has(w) || /(?:ed)$/.test(w)) return "past";
  if (/ing$/.test(w)) return "gerund";
  if (/(?:ies|[^s]s)$/.test(w) && !/ss$/.test(w)) return "third";
  return "base";
}

const FIRST_PERSON = /\b(?:i|my|me|we|our|us)\b/i;

interface StyleIssue {
  kind: "tense" | "person" | "punctuation" | "case";
}

/** Style of the user's own bullet must survive: tense, person, final punctuation, capital start. */
export function styleIssues(original: string, proposed: string): StyleIssue["kind"][] {
  const out: StyleIssue["kind"][] = [];
  const a = openingTense(original);
  const b = openingTense(proposed);
  if (a && b && a !== b) out.push("tense");
  const person = (s: string) => s.match(FIRST_PERSON)?.[0].toLowerCase() ?? "";
  if (person(original) !== person(proposed)) out.push("person");
  const endsDot = (s: string) => s.trim().match(/[.!?]$/)?.[0] ?? "";
  if (endsDot(original) !== endsDot(proposed)) out.push("punctuation");
  const cap = (s: string) => /^[A-Z]/.test(s.trim());
  if (cap(original) !== cap(proposed)) out.push("case");
  return out;
}
