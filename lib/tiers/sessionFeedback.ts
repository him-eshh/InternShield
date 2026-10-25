// Question-type-aware feedback and follow-ups for the practice session. Pure, no model calls.
// Coding answers are judged by tests first, SQL by the result set (NULLs, joins, grouping), behavioral by STAR.
import { getSqlProblem } from "./sql";
import type { Current, PlanItem } from "./session";
import type { AnswerFeedback, AnswerLevel, RoundKind, SessionSummary, SessionTurn } from "./types";

export type QuestionType = "coding" | "sql" | "behavioral" | "discussion";
export interface Check {
  id: string;
  ok: boolean;
  text: string;
  /** For a failed test check: what to do next, phrased as advice. */
  fix?: string;
}

export function questionType(item: Pick<PlanItem, "kind" | "round">): QuestionType {
  if (item.kind === "sql" || item.round === "sql") return "sql";
  if (item.kind === "code" || item.kind === "debug" || item.round === "coding" || item.round === "debugging") return "coding";
  if (item.round === "design" || item.round === "case" || item.round === "challenge" || item.round === "finance") return "discussion";
  return "behavioral";
}
export const TYPE_LABEL: Record<QuestionType, string> = { coding: "Code review", sql: "SQL review", behavioral: "Answer feedback (STAR)", discussion: "Answer feedback" };

// ---------- Follow-ups ----------
export const FOLLOWUP_POOLS: Record<QuestionType, string[]> = {
  coding: [
    "Which edge case would break your solution first, and what does your code do with it?",
    "What are the time and space complexity, and where does the cost come from?",
    "Is there a different approach? What would you trade off to use it?",
    "Walk me through your code on an empty or one-element input.",
    "How would you test this beyond the examples you were given?",
  ],
  sql: [
    "How does your query treat NULL values in these columns?",
    "Which columns would you index to speed this up, and why?",
    "Could your joins produce duplicate rows? How would you check?",
    "What changes if a row has no match in the joined table (INNER versus LEFT JOIN)?",
    "How would you verify the result on a much larger table?",
  ],
  behavioral: [
    "What was the measurable result, and how did you know it worked?",
    "What did you learn, and what would you do differently next time?",
    "What happened next? Did the change last?",
    "What was your own part, as opposed to the team's?",
    "Who disagreed with you, and how did you handle it?",
  ],
  discussion: [
    "What would break first as the load grows, and what is your fix?",
    "Which trade-off did you accept, and why?",
    "What would you ask the stakeholder before committing to this answer?",
  ],
};
const SCALE = /\b(?:ten|10)\s*(?:x|times)\b|\bat scale\b|\bscal(?:e|es|ing)\b|\bmillions? of\b/i;
const CODE_WORDS = /\bcomplexity|big.?o\b|edge case|algorithm\b/i;
/** Does a follow-up belong to this kind of question? "Ten times the scale" never fits a tiny warm-up or a SQL exercise. */
export function followUpFits(type: QuestionType, q: string): boolean {
  if (type === "coding" || type === "sql") return !SCALE.test(q);
  if (type === "behavioral") return !SCALE.test(q) && !CODE_WORDS.test(q);
  return true;
}
const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
};
/** The model's follow-up when it fits the question type, else a pool question not asked yet (stable per question). */
export function fitFollowUp(type: QuestionType, q: string, key: string, asked: string[]): string {
  if (followUpFits(type, q)) return q;
  const left = FOLLOWUP_POOLS[type].filter((p) => !asked.includes(p));
  return left.length ? left[hash(key) % left.length] : "";
}

// ---------- Checks ----------
const approachOf = (answer: string) => answer.split(/\n\n(?:Code|Query):\n/)[0].trim();
const words = (s: string) => (s.match(/[\p{L}\p{N}'’]+/gu) ?? []).length;
const HAS_NUMBER = /\d|%|\b(?:one|two|three|four|five|ten|hundred|thousand|million|half|double|twice)\b/i;
const EDGE = /edge|empty|none|null|zero|negative|duplicate|single|corner|boundary|one element|no match|nothing/i;
const COMPLEXITY = /\bO\s*\(|linear|quadratic|constant time|logarithmic|log n|time complexity|space complexity/i;
const compact = (v: string, max = 80) => (v.length > max ? `${v.slice(0, max - 1)}…` : v);

function codingChecks(c: Current): Check[] {
  const out: Check[] = [];
  const text = approachOf(c.answer ?? "");
  const code = c.code && c.code.language !== "sql" ? c.code : null;
  if (code) {
    const ok = code.passed === code.total;
    const f = code.detail?.failed;
    out.push({ id: "tests", ok, text: ok ? `All ${code.total} hidden tests passed.` : `${code.passed} of ${code.total} hidden tests passed.${f ? ` First failure: input ${compact(f.input)}, expected ${compact(f.expected)}, got ${compact(f.got)}.` : ""}`, ...(ok ? {} : { fix: f ? `Fix the first failing case: input ${compact(f.input)}, expected ${compact(f.expected)}, got ${compact(f.got)}.` : "Get the failing hidden tests passing before you polish." }) });
  }
  out.push(EDGE.test(text) ? { id: "edge", ok: true, text: "You named an edge case." } : { id: "edge", ok: false, text: "Name one edge case (empty input, one element, duplicates) and say what your code returns for it." });
  out.push(COMPLEXITY.test(text) ? { id: "complexity", ok: true, text: "You stated the complexity." } : { id: "complexity", ok: false, text: "State the time and space complexity, like O(n), and where the cost comes from." });
  if (code) {
    const runs = c.inner?.stats?.runsBeforeSubmit ?? 0;
    out.push(runs > 0 ? { id: "verify", ok: true, text: "You ran the examples before submitting." } : { id: "verify", ok: false, text: "Run the examples (and one case of your own) before you submit." });
  } else out.push(words(text) >= 25 ? { id: "depth", ok: true, text: "Your explanation had enough detail to follow." } : { id: "depth", ok: false, text: "Explain in 3 or 4 sentences: the idea, one example, then the cost." });
  return out;
}

function sqlChecks(c: Current): Check[] {
  const out: Check[] = [];
  const code = c.code?.language === "sql" ? c.code : null;
  const query = code?.code ?? "";
  const problem = getSqlProblem(c.item.problemId);
  const ref = problem?.reference ?? "";
  if (code) {
    const ok = code.passed === code.total;
    const d = code.detail;
    out.push({ id: "tests", ok, text: ok ? "Your result matches the expected rows." : `Your result does not match the expected rows${d?.message ? ` (${d.message})` : ""}.${d?.diffs?.[0] ? ` First difference: ${d.diffs[0]}.` : ""}`, ...(ok ? {} : { fix: d?.diffs?.[0] ? `Compare with the expected rows, starting with: ${d.diffs[0]}.` : "Compare your result with the expected rows, column by column." }) });
  }
  const wantsNull = /\bNULL\b/i.test(problem?.prompt ?? "") || /IS\s+(?:NOT\s+)?NULL|COALESCE/i.test(ref);
  const nullSafe = /IS\s+(?:NOT\s+)?NULL|COALESCE|IFNULL|COUNT\s*\(\s*(?!\*)[\w.]+\s*\)/i.test(query);
  if (code && wantsNull) out.push(nullSafe ? { id: "null", ok: true, text: "You handled NULL values on purpose." } : { id: "null", ok: false, text: "This question has NULLs. Use IS NULL / IS NOT NULL or COUNT(column) so they are counted, or left out, deliberately." });
  else if (!code) out.push({ id: "null", ok: false, text: "Say how your query treats NULL values." });
  const needsJoin = /\bJOIN\b/i.test(ref);
  const hasJoin = /\bJOIN\b/i.test(query);
  if (code && needsJoin) {
    if (hasJoin && code.passed === code.total) out.push({ id: "join", ok: true, text: "You joined the tables correctly." });
    else if (!hasJoin) out.push({ id: "join", ok: false, text: "This needs more than one table. Add a JOIN on the matching ids." });
    else out.push({ id: "join", ok: false, text: "Check the join type: INNER drops rows with no match, LEFT JOIN keeps them. Also look for duplicated rows." });
  }
  if (code && /\bGROUP BY\b/i.test(ref)) {
    const grouped = /\bGROUP BY\b/i.test(query);
    out.push(grouped ? { id: "group", ok: true, text: /\bHAVING\b/i.test(ref) && !/\bHAVING\b/i.test(query) ? "You grouped the rows. Filter groups with HAVING, not WHERE." : "You grouped the rows." } : { id: "group", ok: false, text: "This question groups rows: add GROUP BY and, to filter groups, HAVING." });
  }
  if (!code) out.push({ id: "join", ok: false, text: "Name the join type you would use and why." });
  return out;
}

function behavioralChecks(c: Current): Check[] {
  const text = [c.answer ?? "", ...c.followUps.map((f) => f.answer ?? "")].join(" ");
  const out: Check[] = [];
  const star = c.feedback?.star;
  if (star) {
    const missing = (["situation", "task", "action", "result"] as const).filter((k) => !star[k]);
    out.push(missing.length === 0 ? { id: "star", ok: true, text: "Your answer covered Situation, Task, Action and Result." } : { id: "star", ok: missing.length <= 1, text: `Missing from your story: ${missing.join(", ")}.` });
  }
  const i = (text.match(/\bI\b|\b[Mm]y\b/g) ?? []).length;
  const we = (text.match(/\b(?:we|our|us)\b/gi) ?? []).length;
  out.push(i >= we && i > 0 ? { id: "own", ok: true, text: "You said what you did yourself." } : { id: "own", ok: false, text: "Say what you did yourself: use “I” for your own actions, “we” only for the team." });
  out.push(HAS_NUMBER.test(text) ? { id: "result", ok: true, text: "Your story ended with a number or concrete result." } : { id: "result", ok: false, text: "End with a result you can count: time saved, users, percent." });
  return out;
}

function discussionChecks(c: Current): Check[] {
  const text = c.answer ?? "";
  return [
    words(text) >= 40 ? { id: "depth", ok: true, text: "You gave enough detail to follow." } : { id: "depth", ok: false, text: "Give 4 or 5 sentences with one concrete example." },
    /trade-?off|because|however|instead|but /i.test(text) ? { id: "tradeoff", ok: true, text: "You gave a reason or a trade-off." } : { id: "tradeoff", ok: false, text: "Name one trade-off and why you chose your side." },
  ];
}

/** Deterministic, type-specific observations about the answer (shown under the model's feedback, or alone when it is unavailable). */
export function reviewChecks(c: Current): Check[] {
  const type = questionType(c.item);
  return type === "coding" ? codingChecks(c) : type === "sql" ? sqlChecks(c) : type === "behavioral" ? behavioralChecks(c) : discussionChecks(c);
}

/** Feedback built by code when the model is unavailable or the call budget is spent. Test results come first. */
export function localReview(c: Current): { feedback: AnswerFeedback; level: AnswerLevel } {
  const checks = reviewChecks(c);
  const type = questionType(c.item);
  const good = checks.filter((k) => k.ok);
  const bad = checks.filter((k) => !k.ok);
  const lead = checks.find((k) => k.id === "tests");
  const rest = bad.filter((k) => k.id !== "tests");
  const strength = lead?.ok ? lead.text : good[0]?.text ?? (lead && c.code ? (type === "sql" ? "Your query ran and returned rows to compare." : `Your code ran and passed ${c.code.passed} of ${c.code.total} hidden tests.`) : "You gave an answer to work from.");
  const improve = (lead && !lead.ok ? lead.fix : null) ?? rest[0]?.text ?? (type === "sql" ? "Try the next one without a hint." : "Try a harder question next.");
  const ratio = c.code && c.code.total > 0 ? c.code.passed / c.code.total : null;
  const level: AnswerLevel = ratio !== null ? (ratio >= 1 ? "strong" : ratio < 0.5 ? "weak" : "ok") : bad.length === 0 ? "strong" : bad.length >= 2 ? "weak" : "ok";
  return { feedback: { index: 0, strength, improve, quote: null, star: null }, level };
}

// ---------- Summary numbers ----------
export interface RoundNumbers {
  round: RoundKind;
  asked: number;
  answered: number;
  /** Runnable questions graded by code: problems fully passed, and the tests behind them. */
  solved: { done: number; of: number } | null;
  tests: { passed: number; total: number } | null;
}
export interface SummaryNumbers extends Omit<RoundNumbers, "round"> {
  skipped: number;
  seconds: number;
  hints: number;
  followUps: number;
  rounds: RoundNumbers[];
}
function numbersFor(turns: SessionTurn[]): Omit<RoundNumbers, "round"> {
  const graded = turns.filter((t) => t.code && !t.skipped);
  const sqlOnly = graded.length > 0 && graded.every((t) => t.code?.language === "sql");
  return {
    asked: turns.length,
    answered: turns.filter((t) => !t.skipped).length,
    solved: graded.length ? { done: graded.filter((t) => t.code!.passed === t.code!.total).length, of: graded.length } : null,
    tests: graded.length && !sqlOnly ? { passed: graded.reduce((n, t) => n + t.code!.passed, 0), total: graded.reduce((n, t) => n + t.code!.total, 0) } : null,
  };
}
/** The real counts for the end screen: answered, solved, tests passed, time, per round. */
export function summaryNumbers(summary: SessionSummary): SummaryNumbers {
  const rounds = summary.rounds.map((r) => ({ round: r.round, ...numbersFor(summary.turns.filter((t) => t.round === r.round)) }));
  return {
    ...numbersFor(summary.turns),
    skipped: summary.skipped,
    seconds: Math.max(0, Math.round(summary.durationMs / 1000)),
    hints: summary.turns.reduce((n, t) => n + t.hintsUsed, 0),
    followUps: summary.turns.reduce((n, t) => n + (t.followUps?.length ?? 0), 0),
    rounds,
  };
}
export function formatDuration(seconds: number): string {
  if (seconds < 60) return "under 1 min";
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
