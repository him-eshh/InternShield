// v3 continuous practice session engine (brief I4/I5). Pure: every function returns a new state; the input is never changed.
// A session is a list of slots (one per question). Each slot becomes a PlanItem when it comes up, so "Mixed" difficulty can adapt.
// Flow per question: answer -> review (feedback + optional follow-up) -> follow-up answers -> Continue.
import { readKey, writeKey } from "../client/storage";
import type { BankFilter, BankRole } from "./bank";
import { pickFromBank } from "./bankPool";
import { DEBUG_PROBLEMS } from "./debugging";
import { buildScorecard } from "./scorecard";
import { PROBLEMS } from "./problems";
import { SQL_PROBLEMS } from "./sql";
import { textPool } from "./sessionPools";
import { fitFollowUp, localReview, questionType } from "./sessionFeedback";
import {
  CODE_ROUNDS,
  INTERVIEW_ROUNDS,
  MAX_ANSWER_CHARS,
  MAX_CODE_CHARS,
  MAX_FOLLOWUPS,
  MAX_PRACTICE_CALLS,
  type AnswerFeedback,
  type AnswerLevel,
  type BankQuestion,
  type CodeAttempt,
  type InterviewContext,
  type InterviewReply,
  type InterviewRequest,
  type InterviewSession,
  type RoundKind,
  type ScoreBand,
  type SessionConfig,
  type SessionSummary,
  type SessionTurn,
} from "./types";
// ---------- Shapes ----------
/** Rounds the setup screen offers (finance and the board challenge stay in the old single-round flow). */
export const SETUP_ROUNDS: RoundKind[] = ["coding", "sql", "debugging", "design", "behavioral", "screen", "case", "portfolio"];
/** Questions in one "round" when the session is counted in rounds. */
export const ROUND_LEN: Partial<Record<RoundKind, number>> = { screen: 2, behavioral: 3, coding: 1, sql: 2, debugging: 1, design: 1, case: 1, portfolio: 2 };
/** Languages whose code runs in the browser; the rest are discussed only. */
export const RUNNABLE_LANGS = ["python", "typescript"] as const;
export const MIN_COUNT = 1;
export const MAX_COUNT = 15;
const LEVELS = ["easy", "medium", "hard"] as const;
export interface Slot {
  round: RoundKind;
  /** Which round (block) this question belongs to, 0-based. */
  block: number;
  /** Verbatim question typed by the user. */
  custom?: string;
}
export interface PlanItem {
  id: string;
  slot: number;
  round: RoundKind;
  /** code/sql/debug run in the browser (a panel); text is a textarea. */
  kind: "text" | "code" | "sql" | "debug";
  /** Empty = still to be written by the model (source "ai"). */
  question: string;
  /** Bank id, "custom", "app", "company value" or "ai". */
  source: string;
  title?: string;
  url?: string;
  difficulty?: string;
  tags?: string[];
  problemId?: string;
  note?: string;
}
export interface FollowUp {
  question: string;
  answer: string | null;
  note?: string;
}
export interface Current {
  draft?: string;
  item: PlanItem;
  startedAt: number;
  answer: string | null;
  code: CodeAttempt | null;
  hints: string[];
  /** Runnable items: the session the code panel edits. */
  inner: InterviewSession | null;
  feedback: AnswerFeedback | null;
  level: AnswerLevel | null;
  followUps: FollowUp[];
  /** Answers (main + follow-ups) already reviewed or deliberately left unreviewed. */
  reviewed: number;
}
export interface PracticeState {
  v: 1;
  id: string;
  seed: number;
  createdAt: number;
  updatedAt: number;
  config: SessionConfig;
  context: InterviewContext;
  /** Company values from cited official pages (seed the behavioral questions). */
  values: string[];
  slots: Slot[];
  /** Adaptive level for "mixed": 0 easy, 1 medium, 2 hard. */
  level: number;
  turns: SessionTurn[];
  activeQuestion: Current | null;
  /** Model calls used (reviews, hints, written questions). */
  calls: number;
  status: "active" | "done";
  endedEarly: boolean;
  endedAt: number | null;
}
export type Awaiting = "question" | "answer" | "review" | "followup" | "next" | "done";
export const roundLabel = (r: RoundKind): string => INTERVIEW_ROUNDS.find((x) => x.id === r)?.label ?? r;
export function defaultConfig(over: Partial<SessionConfig> = {}): SessionConfig {
  return { rounds: ["coding", "behavioral", "sql"], topics: [], customQuestions: [], difficulty: "mixed", language: "python", limit: { kind: "questions", count: 5 }, ...over };
}
const clampCount = (n: number) => Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.floor(Number.isFinite(n) ? n : 5)));
// ---------- Plan ----------
/** Deterministic random in [0, 1). */
function rng(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cleanCustoms = (c: SessionConfig) => [...new Set(c.customQuestions.filter((q) => q.trim()).map((q) => q.slice(0, 400)))];
/**
 * One slot per question. Custom questions go first, verbatim (in rounds mode they form the first round).
 * Questions mode: round-robin over the chosen rounds until N. Rounds mode: N rounds of ROUND_LEN questions each.
 */
export function buildSlots(config: SessionConfig): Slot[] {
  const rounds = config.rounds.length ? config.rounds : (["behavioral"] as RoundKind[]);
  const customs = cleanCustoms(config);
  const n = clampCount(config.limit.count);
  const slots: Slot[] = [];
  if (config.limit.kind === "questions") {
    customs.slice(0, n).forEach((custom) => slots.push({ round: "screen", block: 0, custom }));
    for (let i = 0; slots.length < n; i++) slots.push({ round: rounds[i % rounds.length], block: slots.length });
    return slots;
  }
  let block = 0;
  if (customs.length) {
    customs.forEach((custom) => slots.push({ round: "screen", block: 0, custom }));
    block = 1;
  }
  for (let i = 0; block < n; i++, block++) {
    const round = rounds[i % rounds.length];
    for (let k = 0; k < (ROUND_LEN[round] ?? 1); k++) slots.push({ round, block });
  }
  return slots;
}
export const totalBlocks = (s: PracticeState): number => (s.slots.length ? s.slots[s.slots.length - 1].block + 1 : 0);
const usedKeys = (s: PracticeState): Set<string> => {
  const used = new Set<string>(s.turns.map((t) => t.source + "|" + t.question));
  s.turns.forEach((t) => used.add(t.question));
  if (s.activeQuestion) used.add(s.activeQuestion.item.question);
  return used;
};
const usedIds = (s: PracticeState): Set<string> => new Set([...s.turns.flatMap((t) => [t.source, t.problemId ?? "", t.code?.problemId ?? ""]), ...(s.activeQuestion ? [s.activeQuestion.item.source, s.activeQuestion.item.problemId ?? ""] : [])]);
function levelFor(s: PracticeState): "easy" | "medium" | "hard" {
  return s.config.difficulty === "mixed" ? LEVELS[Math.min(2, Math.max(0, s.level))] : s.config.difficulty;
}
/** Bank selection keeps the user's filters while they match; otherwise it falls back to the closest pool and says so in `note`. */
function pickBank(s: PracticeState, bank: BankQuestion[], rand: () => number): { q: BankQuestion; note?: string } | null {
  const roleText = (s.config.role ?? s.context.role ?? "").toLowerCase();
  const role: BankRole | null = /front.?end/.test(roleText) ? "frontend" : /back.?end/.test(roleText) ? "backend" : /machine|\bml\b/.test(roleText) ? "ml" : /data|analyst/.test(roleText) ? "data" : null;
  const filter: BankFilter = { role, company: s.config.company ?? s.context.company, topics: s.config.topics, difficulty: levelFor(s) };
  return pickFromBank(bank, filter, usedIds(s), rand, !!s.config.mostAsked);
}
const bankItem = (slot: number, q: BankQuestion, note?: string): PlanItem => ({
  id: `${slot}-${q.id}`,
  slot,
  round: "coding",
  kind: "text",
  question: `${q.title} (${q.difficulty}). Explain your approach, the time and space complexity, and the edge cases. Write the code if you can.`,
  source: q.id,
  title: q.title,
  url: q.url,
  difficulty: q.difficulty,
  tags: q.tags,
  ...(note ? { note } : {}),
});
/** Builds the item for slot `i`. Never repeats a question already asked in this session. */
export function makeItem(s: PracticeState, i: number, bank: BankQuestion[]): PlanItem {
  const slot = s.slots[i];
  const rand = rng(s.seed + i * 7919);
  const ids = usedIds(s);
  const mk = (over: Partial<PlanItem> & Pick<PlanItem, "kind" | "question" | "source">): PlanItem => ({ id: `${i}-${over.problemId ?? over.source}`, slot: i, round: slot.round, ...over });
  if (slot.custom) return mk({ kind: "text", question: slot.custom, source: "custom", id: `${i}-custom` });
  const runs = (RUNNABLE_LANGS as readonly string[]).includes(s.config.language);
  const unused = <T extends { id: string }>(xs: T[]): T[] => xs.filter((x) => !ids.has(x.id));
  if (slot.round === "coding") {
    const nth = s.turns.filter((t) => t.round === "coding").length + (s.activeQuestion?.item.round === "coding" ? 1 : 0);
    const constrained = s.config.topics.length > 0 || s.config.difficulty !== "mixed" || !!s.config.company || !!s.config.mostAsked;
    const problems = unused(PROBLEMS);
    if (runs && !constrained && nth % 2 === 0 && problems.length) {
      const p = problems[Math.floor(rand() * problems.length)];
      return mk({ kind: "code", question: p.prompt, source: "app", title: p.title, problemId: p.id });
    }
    const b = pickBank(s, bank, rand);
    if (b) return bankItem(i, b.q, b.note);
    if (runs && !constrained && problems.length) return mk({ kind: "code", question: problems[0].prompt, source: "app", title: problems[0].title, problemId: problems[0].id });
  } else if (slot.round === "sql") {
    const ps = unused(SQL_PROBLEMS);
    if (ps.length) {
      const p = ps[Math.floor(rand() * ps.length)];
      return mk({ kind: "sql", question: p.prompt, source: "app", title: p.title, problemId: p.id });
    }
    return mk({ kind: "text", question: `SQL discussion ${i + 1}: How would you check a query for duplicate rows, missing values and performance on a larger data set?`, source: "app", note: "All runnable SQL exercises have been used. Discuss this one in text." });
  } else if (slot.round === "debugging") {
    const ps = unused(DEBUG_PROBLEMS);
    if (ps.length) {
      const p = ps[Math.floor(rand() * ps.length)];
      return mk({ kind: "debug", question: p.prompt, source: "app", title: p.title, problemId: p.id });
    }
    return mk({ kind: "text", question: `Debugging discussion ${i + 1}: Describe how you would reproduce an intermittent bug, isolate its cause and verify the fix.`, source: "app", note: "All runnable debugging exercises have been used. Discuss this one in text." });
  } else {
    const asked = usedKeys(s);
    const pool = textPool(slot.round, { values: s.values, company: s.context.company, preset: s.context.preset });
    const fresh = (xs: typeof pool.ordered) => xs.filter((o) => !asked.has(o.text));
    const first = fresh(pool.ordered)[0] ?? (() => { const r = fresh(pool.shuffled); return r.length ? r[Math.floor(rand() * r.length)] : null; })();
    if (first) return mk({ kind: "text", question: first.text, source: first.source, id: `${i}-${slot.round}` });
  }
  // Pool exhausted (or no bank): the model writes this one.
  return mk({ kind: "text", question: "", source: "unavailable", id: `${i}-unavailable`, note: "Every question the bank has for this mix has been used. Skip this slot or end the session, then start a new one." });
}
// ---------- Lifecycle ----------
function startCurrent(s: PracticeState, i: number, bank: BankQuestion[], now: number): PracticeState {
  const item = makeItem(s, i, bank);
  const inner: InterviewSession | null =
    item.kind === "text"
      ? null
      : {
          id: item.id,
          round: item.kind === "code" ? "coding" : item.kind === "sql" ? "sql" : "debugging",
          context: s.context,
          turns: [],
          pending: item.question,
          used: 0,
          seed: s.seed,
          problemId: item.problemId ?? null,
          code: null,
          board: null,
          hints: [],
          feedback: null,
          status: "active",
          createdAt: now,
          updatedAt: now,
        };
  return { ...s, activeQuestion: { item, startedAt: now, answer: null, code: null, hints: [], inner, feedback: null, level: null, followUps: [], reviewed: 0 }, updatedAt: now };
}
export function newPractice(config: SessionConfig, context: InterviewContext, opts: { id: string; now: number; seed: number; values?: string[] }, bank: BankQuestion[]): PracticeState {
  const cfg: SessionConfig = { ...config, limit: { kind: config.limit.kind, count: clampCount(config.limit.count) } };
  const s: PracticeState = {
    v: 1,
    id: opts.id,
    seed: opts.seed,
    createdAt: opts.now,
    updatedAt: opts.now,
    config: cfg,
    context,
    values: (opts.values ?? []).slice(0, 6),
    slots: buildSlots(cfg),
    level: 1,
    turns: [],
    activeQuestion: null,
    calls: 0,
    status: "active",
    endedEarly: false,
    endedAt: null,
  };
  return startCurrent(s, 0, bank, opts.now);
}
/** What the screen should do next. */
export function awaiting(s: PracticeState): Awaiting {
  const c = s.activeQuestion;
  if (s.status === "done" || !c) return "done";
  if (!c.item.question) return "question";
  if (c.answer === null) return "answer";
  if (c.followUps.some((f) => f.answer === null)) return "followup";
  if (c.reviewed < 1 + c.followUps.length) return "review";
  return "next";
}
export const canCallModel = (s: PracticeState): boolean => s.calls < MAX_PRACTICE_CALLS;
export const followUpsLeft = (c: Current): number => Math.max(0, MAX_FOLLOWUPS - c.followUps.length);
/** Saves the typed answer (and the last submitted code, for runnable items). */
export function submitAnswer(s: PracticeState, answer: string, now: number, code: CodeAttempt | null = null): PracticeState {
  const c = s.activeQuestion;
  const text = answer.trim().slice(0, MAX_ANSWER_CHARS + MAX_CODE_CHARS);
  if (!c || !text || c.answer !== null) return s;
  return { ...s, updatedAt: now, activeQuestion: { ...c, draft: "", answer: text, code: code ?? c.code } };
}
/** Runnable panels edit `inner`; keep our copy of its code and hints in step. */
export function syncInner(s: PracticeState, inner: InterviewSession, now: number): PracticeState {
  const c = s.activeQuestion;
  if (!c || !c.inner || c.inner.id !== inner.id) return s;
  const hints = inner.hints;
  return { ...s, updatedAt: now, activeQuestion: { ...c, inner, code: inner.code, hints } };
}
/** The runnable panel pressed "Finish": its approach + code become the answer. */
export function finishRunnable(s: PracticeState, inner: InterviewSession, now: number): PracticeState {
  const synced = syncInner(s, inner, now);
  const answer = inner.turns[0]?.answer ?? "";
  return submitAnswer(synced, answer, now, inner.code);
}
export function answerFollowUp(s: PracticeState, answer: string, now: number): PracticeState {
  const c = s.activeQuestion;
  const text = answer.trim().slice(0, MAX_ANSWER_CHARS);
  if (!c || !text) return s;
  const i = c.followUps.findIndex((f) => f.answer === null);
  if (i < 0) return s;
  const followUps = c.followUps.map((f, k) => (k === i ? { ...f, answer: text } : f));
  return { ...s, updatedAt: now, activeQuestion: { ...c, draft: "", followUps } };
}
/** The /api/interview body for the review (or hint) of the current question. Null when there is nothing to review. */
export function buildReviewRequest(s: PracticeState, ask: "review" | "hint"): InterviewRequest | null {
  const c = s.activeQuestion;
  if (!c) return null;
  const turns = [
    { question: c.item.question, answer: c.answer ?? "" },
    ...c.followUps.filter((f) => f.answer !== null).map((f) => ({ question: f.question, answer: f.answer ?? "" })),
  ];
  const round = c.item.round;
  // Bank questions are named, never quoted: the model knows the public problem by title.
  const problem = c.item.url ? `${c.item.title} (LeetCode, ${c.item.difficulty}; topics: ${(c.item.tags ?? []).join(", ")})` : c.item.question.slice(0, 2000);
  return {
    ask,
    round,
    context: s.context,
    turns: ask === "hint" ? [] : turns.map((t) => ({ question: t.question.slice(0, 400), answer: t.answer.slice(0, MAX_ANSWER_CHARS) })),
    used: s.calls,
    code: CODE_ROUNDS.includes(round) && c.code ? { ...c.code, code: c.code.code.slice(0, MAX_CODE_CHARS) } : null,
    board: null,
    problem: CODE_ROUNDS.includes(round) ? problem : null,
    practice: true,
    ...(ask === "review" ? { followUpsLeft: followUpsLeft(c) } : {}),
  };
}
/** Applies a successful review: feedback for the newest answer, maybe a follow-up question. */
export function applyReview(s: PracticeState, reply: InterviewReply, now: number): PracticeState {
  const c = s.activeQuestion;
  const next = { ...s, calls: s.calls + 1, updatedAt: now };
  if (!c || !reply.feedback) return next;
  const answered = 1 + c.followUps.filter((f) => f.answer !== null).length;
  const item = reply.feedback.items[reply.feedback.items.length - 1];
  const fb: AnswerFeedback | null = item ? { ...item, index: answered - 1 } : null;
  const followUps = [...c.followUps];
  if (answered > 1 && fb) {
    const k = answered - 2;
    followUps[k] = { ...followUps[k], note: [fb.strength, fb.improve].filter(Boolean).join(" ") };
  }
  const raw = typeof reply.followUp === "string" ? reply.followUp.trim().slice(0, 400) : "";
  // A follow-up must fit the question type; "ten times the scale" is swapped for one from that type's own pool.
  const q = raw ? fitFollowUp(questionType(c.item), raw, c.item.id + followUps.length, [...followUps.map((f) => f.question), c.item.question]) : "";
  if (q && q !== c.item.question && !s.turns.some((t) => t.question === q) && followUpsLeft(c) > 0 && !followUps.some((f) => f.answer === null) && !followUps.some((f) => f.question === q)) followUps.push({ question: q, answer: null });
  return {
    ...next,
    activeQuestion: { ...c, feedback: answered === 1 && fb ? fb : c.feedback, level: reply.level ?? c.level, followUps, reviewed: answered },
  };
}
/** Leaves the newest answer without model feedback (call failed or the cap is hit) so the session can go on. */
export function skipReview(s: PracticeState, now: number): PracticeState {
  const c = s.activeQuestion;
  if (!c) return s;
  return { ...s, updatedAt: now, activeQuestion: { ...c, reviewed: 1 + c.followUps.filter((f) => f.answer !== null).length } };
}
/** No model feedback (call failed or budget spent): code-built, type-specific feedback so the session still says something true. */
export function applyLocalReview(s: PracticeState, now: number): PracticeState {
  const c = s.activeQuestion;
  if (!c) return s;
  const answered = 1 + c.followUps.filter((f) => f.answer !== null).length;
  if (answered > 1) return skipReview(s, now); // follow-up answers are noted by the model only
  const { feedback, level } = localReview(c);
  return { ...s, updatedAt: now, activeQuestion: { ...c, feedback: { ...feedback, index: 0 }, level: c.level ?? level, reviewed: answered } };
}
/** A model hint (runnable items keep theirs in inner.hints). */
export function addHint(s: PracticeState, text: string, now: number): PracticeState {
  const c = s.activeQuestion;
  const next = { ...s, calls: s.calls + 1, updatedAt: now };
  if (!c || !text.trim()) return next;
  return { ...next, activeQuestion: { ...c, hints: [...c.hints, text.trim().slice(0, 300)] } };
}
// ---------- Advancing ----------
/** Level the answer earned: the model's call when present, else a rough guess from the code result or the answer's length. */
export function outcomeOf(c: Current): AnswerLevel {
  if (c.code && c.code.total > 0) {
    const r = c.code.passed / c.code.total;
    if (r >= 1) return c.level === "weak" ? "ok" : "strong";
    if (r < 0.5) return "weak";
    return "ok";
  }
  if (c.level) return c.level;
  return "ok";
}
function finalize(s: PracticeState, now: number, skipped: boolean): SessionTurn | null {
  const c = s.activeQuestion;
  if (!c) return null;
  const answered = c.followUps.filter((f) => f.answer !== null);
  return {
    round: c.item.round,
    question: c.item.question,
    source: c.item.source,
    answer: skipped ? "" : (c.answer ?? ""),
    ...(c.code ? { code: c.code } : {}),
    ...(c.inner?.stats ? { stats: c.inner.stats } : {}),
    hintsUsed: c.hints.length,
    skipped,
    ...(c.feedback ? { feedback: c.feedback } : {}),
    ...(c.item.problemId ? { problemId: c.item.problemId } : {}),
    ...(c.item.title ? { title: c.item.title } : {}),
    ...(c.item.url ? { url: c.item.url } : {}),
    ...(c.item.difficulty ? { difficulty: c.item.difficulty } : {}),
    ...(c.item.tags ? { tags: c.item.tags } : {}),
    ...(skipped ? {} : { level: outcomeOf(c) }),
    ...(answered.length ? { followUps: answered.map((f) => ({ question: f.question, answer: f.answer ?? "", ...(f.note ? { note: f.note } : {}) })) } : {}),
    startedAt: c.startedAt,
    endedAt: now,
  };
}
function moveOn(s: PracticeState, turn: SessionTurn, bank: BankQuestion[], now: number): PracticeState {
  let level = s.level;
  if (!turn.skipped && s.config.difficulty === "mixed") level = Math.min(2, Math.max(0, level + (turn.level === "strong" ? 1 : turn.level === "weak" ? -1 : 0)));
  else if (turn.skipped) level = Math.max(0, level - 1);
  const turns = [...s.turns, turn];
  const base: PracticeState = { ...s, turns, level, activeQuestion: null, updatedAt: now };
  if (turns.length >= s.slots.length) return { ...base, status: "done", endedAt: now };
  return startCurrent(base, turns.length, bank, now);
}
/** Done with this question: store it and open the next, or finish the session after the last slot. */
export function advance(s: PracticeState, bank: BankQuestion[], now: number): PracticeState {
  const t = s.status === "active" ? finalize(s, now, false) : null;
  return t && awaiting(s) === "next" ? moveOn(s, t, bank, now) : s;
}
export function skip(s: PracticeState, bank: BankQuestion[], now: number): PracticeState {
  const t = s.status === "active" ? finalize(s, now, true) : null;
  return t ? moveOn(s, t, bank, now) : s;
}
/** "End session": keeps an answered current question, drops an unanswered one, goes to the summary. */
export function endEarly(s: PracticeState, now: number): PracticeState {
  if (s.status === "done") return s;
  const t = s.activeQuestion && s.activeQuestion.answer !== null ? finalize(s, now, false) : null;
  return { ...s, turns: t ? [...s.turns, t] : s.turns, activeQuestion: null, status: "done", endedEarly: true, endedAt: now, updatedAt: now };
}
// ---------- Progress ----------
export interface Progress {
  /** 1-based question number being worked on (or the total when done). */
  question: number;
  questions: number;
  /** 1-based round (block) number and the total rounds. */
  round: number;
  rounds: number;
  label: string;
  /** 0..1 of questions finished. */
  fraction: number;
  /** One flag per question: finished, current, or ahead. */
  segments: ("done" | "current" | "todo")[];
}
export function progress(s: PracticeState): Progress {
  const questions = s.slots.length;
  const finished = s.turns.length;
  const idx = Math.min(finished, questions - 1);
  const slot = s.slots[idx];
  return {
    question: s.status === "done" ? finished : idx + 1,
    questions,
    round: (slot?.block ?? 0) + 1,
    rounds: totalBlocks(s),
    label: s.activeQuestion ? (s.activeQuestion.item.source === "custom" ? "Your question" : roundLabel(s.activeQuestion.item.round)) : "Done",
    fraction: questions ? finished / questions : 1,
    segments: s.slots.map((_, i) => (i < finished ? "done" : i === finished && s.status === "active" ? "current" : "todo")),
  };
}
// ---------- Summary ----------
const BAND_ORDER: ScoreBand[] = ["Strong", "Solid", "Developing", "Not yet"];
const LEVEL_BAND: Record<AnswerLevel, number> = { strong: 0, ok: 1, weak: 2 };
function innerFor(round: RoundKind, turns: SessionTurn[]): InterviewSession {
  const last = [...turns].reverse().find((t) => t.code);
  return {
    id: "summary",
    plannedQuestions: turns.length,
    round,
    context: { company: null, role: null, description: null, resume: null, field: null },
    turns: turns.map((t) => ({ question: t.question, answer: t.answer })),
    pending: null,
    used: 0,
    seed: 0,
    problemId: last?.code?.problemId ?? null,
    code: last?.code ? { ...last.code, passed: turns.reduce((n, t) => n + (t.code?.passed ?? 0), 0), total: turns.reduce((n, t) => n + (t.code?.total ?? 0), 0) } : null,
    board: null,
    stats: { runsBeforeSubmit: turns.reduce((n, t) => n + (t.stats?.runsBeforeSubmit ?? 0), 0), submits: turns.reduce((n, t) => n + (t.stats?.submits ?? 0), 0), firstSubmitAt: turns.find((t) => t.stats?.firstSubmitAt)?.stats?.firstSubmitAt ?? null },
    hints: turns.flatMap((t) => Array.from({ length: t.hintsUsed }, () => "hint")),
    feedback: { summary: "", items: turns.flatMap((t, i) => (t.feedback ? [{ ...t.feedback, index: i }] : [])) },
    status: "done",
    createdAt: turns[0]?.startedAt ?? 0,
    updatedAt: turns[turns.length - 1]?.endedAt ?? 0,
  };
}
function sessionCard(round: RoundKind, turns: SessionTurn[]) {
  const inner = innerFor(round, turns);
  if (round === "sql" && inner.code) {
    const card = buildScorecard({ ...inner, round: "coding", turns: inner.turns.map((t) => ({ ...t, answer: t.answer.replace("\n\nQuery:\n", "\n\nCode:\n") })) });
    return card ? { ...card, axes: card.axes.map((a) => a.id === "coding" ? { ...a, label: "Query correctness" } : a), ...(inner.code.passed < inner.code.total ? { nextDrill: "Compare your query result with the expected rows; check joins, NULLs and duplicate rows." } : {}) } : null;
  }
  if (round !== "design" && !(["coding", "sql"].includes(round) && !inner.code)) return buildScorecard(inner);
  const card = buildScorecard({ ...inner, round: "screen" });
  const quoted = turns.filter((t) => t.feedback?.quote);
  const mean = turns.length ? turns.reduce((n, t) => n + LEVEL_BAND[t.level ?? "weak"], 0) / turns.length : 3;
  const band = BAND_ORDER[Math.max(quoted.length ? 0 : 2, Math.min(3, Math.round(mean)))];
  return { axes: [{ id: "reasoning", label: "Reasoning (discussion)", band, evidence: quoted.length ? quoted.map((t) => t.feedback!.quote!) : ["No quoted evidence; discussion grade is capped."], byCode: false }, ...(card?.axes ?? [])], nextDrill: turns.find((t) => t.feedback?.improve)?.feedback?.improve };
}
/** Round band: rule-graded axes where the app can check (code, STAR, numbers), else the answer levels. */
function roundBand(round: RoundKind, turns: SessionTurn[]): { band: ScoreBand; note: string } {
  const answered = turns.filter((t) => !t.skipped);
  if (!answered.length) return { band: "Not yet", note: "Every question was skipped." };
  const card = sessionCard(round, turns);
  let band: ScoreBand;
  if (card && card.axes.length) {
    const mean = card.axes.reduce((a, x) => a + BAND_ORDER.indexOf(x.band), 0) / card.axes.length;
    band = BAND_ORDER[Math.min(3, Math.round(mean))];
  } else {
    const mean = answered.reduce((a, t) => a + LEVEL_BAND[t.level ?? "ok"], 0) / answered.length;
    band = BAND_ORDER[Math.min(3, Math.round(mean))];
  }
  const note = card?.nextDrill ?? answered.map((t) => t.feedback?.improve).find(Boolean) ?? "";
  return { band, note };
}
export function buildSummary(s: PracticeState): SessionSummary {
  const rounds = [...new Set(s.turns.map((t) => t.round))];
  const per = rounds.map((round) => { const turns = s.turns.filter((t) => t.round === round); return { round, ...roundBand(round, turns), axes: sessionCard(round, turns)?.axes ?? [] }; });
  const weakTags = new Map<string, number>();
  s.turns.filter((t) => t.level === "weak").forEach((t) => (t.tags ?? []).forEach((g) => weakTags.set(g, (weakTags.get(g) ?? 0) + 1)));
  const next: string[] = [];
  [...per].sort((a, b) => BAND_ORDER.indexOf(b.band) - BAND_ORDER.indexOf(a.band)).forEach((r) => {
    if (r.band !== "Strong" && r.note && next.length < 3 && !next.includes(r.note)) next.push(r.note);
  });
  [...weakTags].sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(([g]) => next.length < 3 && next.push(`Do two more ${g} problems and say the complexity out loud.`));
  const skipped = s.turns.filter((t) => t.skipped).length;
  if (skipped && next.length < 3) next.push(`Come back to the ${skipped} ${skipped === 1 ? "question" : "questions"} you skipped.`);
  for (const t of s.turns) if (next.length < 3 && t.feedback?.improve && !next.includes(t.feedback.improve)) next.push(t.feedback.improve);
  if (!next.length) next.push("Try a harder level or another company's questions.");
  const strengths = [...new Set(s.turns
    .filter((t) => !t.skipped && t.feedback?.strength && t.level !== "weak")
    .map((t) => t.feedback?.strength ?? ""))].slice(0, 3);
  return {
    config: s.config,
    turns: s.turns,
    answered: s.turns.filter((t) => !t.skipped).length,
    skipped,
    rounds: per,
    next: next.slice(0, 3),
    strengths,
    endedEarly: s.endedEarly,
    durationMs: Math.max(0, (s.endedAt ?? s.updatedAt) - s.createdAt),
  };
}
/** A new session config aimed at what went worst: weak topics and the weakest rounds. */
export function practiceAgain(summary: SessionSummary): SessionConfig {
  const weakTopics = [...new Set(summary.turns.filter((t) => t.level === "weak" || t.skipped).flatMap((t) => t.tags ?? []))].slice(0, 4);
  const worst = [...summary.rounds].sort((a, b) => BAND_ORDER.indexOf(b.band) - BAND_ORDER.indexOf(a.band)).map((r) => r.round);
  const rounds = (worst.length ? worst.filter((r) => SETUP_ROUNDS.includes(r)).slice(0, 3) : summary.config.rounds) as RoundKind[];
  return { ...summary.config, rounds: rounds.length ? rounds : summary.config.rounds, topics: weakTopics, customQuestions: [], limit: { kind: "questions", count: 5 } };
}
// ---------- Storage (this browser only) ----------
export const ACTIVE_KEY = "is:practice-active";
export const HISTORY_KEY = "is:practice-history";
export const MAX_HISTORY = 20;
export interface HistoryEntry {
  id: string;
  finishedAt: number;
  company: string | null;
  summary: SessionSummary;
}
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** A saved active session, or null when missing, finished or damaged. */
export function loadActive(): PracticeState | null {
  const v = readKey<unknown>(ACTIVE_KEY);
  if (!isObj(v) || v.v !== 1 || v.status !== "active" || !Array.isArray(v.slots) || !Array.isArray(v.turns) || !isObj(v.config) || !isObj(v.context)) return null;
  const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  const strings = (xs: unknown) => Array.isArray(xs) && xs.every((x) => typeof x === "string");
  if (typeof v.id !== "string" || !finite(v.calls) || !finite(v.seed) || !finite(v.createdAt) || !finite(v.updatedAt) || !finite(v.level)) return null;
  if (!strings(v.values) || !strings(v.config.rounds) || !strings(v.config.topics) || !strings(v.config.customQuestions) || !isObj(v.config.limit) || !finite(v.config.limit.count)) return null;
  if (!v.slots.length || v.turns.length >= v.slots.length || !v.slots.every((x) => isObj(x) && SETUP_ROUNDS.includes(x.round as RoundKind) && finite(x.block))) return null;
  if (!v.turns.every((t) => isObj(t) && typeof t.question === "string" && typeof t.answer === "string" && finite(t.hintsUsed))) return null;
  const c = v.activeQuestion;
  if (!isObj(c) || !isObj(c.item) || typeof c.item.question !== "string" || !SETUP_ROUNDS.includes(c.item.round as RoundKind) || !["text", "code", "sql", "debug"].includes(c.item.kind as string)) return null;
  if (!Array.isArray(c.followUps) || c.followUps.length > MAX_FOLLOWUPS || !c.followUps.every((f) => isObj(f) && typeof f.question === "string" && (f.answer === null || typeof f.answer === "string"))) return null;
  if (!strings(c.hints) || !finite(c.reviewed) || (c.answer !== null && typeof c.answer !== "string") || (c.inner !== null && (!isObj(c.inner) || !Array.isArray(c.inner.turns) || !strings(c.inner.hints)))) return null;
  return v as unknown as PracticeState;
}
export const saveActive = (s: PracticeState): void => writeKey(ACTIVE_KEY, s);
export const clearActive = (): void => writeKey(ACTIVE_KEY, null);
export function loadHistory(): HistoryEntry[] {
  const v = readKey<unknown>(HISTORY_KEY);
  return Array.isArray(v) ? (v.filter((e) => isObj(e) && typeof e.id === "string" && isObj(e.summary) && Array.isArray(e.summary.turns) && Array.isArray(e.summary.rounds) && Array.isArray(e.summary.next) && typeof e.finishedAt === "number") as unknown as HistoryEntry[]).slice(0, MAX_HISTORY) : [];
}
export function saveToHistory(s: PracticeState): HistoryEntry {
  const entry: HistoryEntry = { id: s.id, finishedAt: s.endedAt ?? s.updatedAt, company: s.context.company, summary: buildSummary(s) };
  writeKey(HISTORY_KEY, [entry, ...loadHistory().filter((e) => e.id !== s.id)].slice(0, MAX_HISTORY));
  return entry;
}
