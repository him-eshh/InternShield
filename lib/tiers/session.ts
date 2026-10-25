// v3 continuous practice session engine (brief I4/I5). Pure: every function returns a new state; the input is never changed.
// A session is a list of slots (one per question). Each slot becomes a PlanItem when it comes up, so "Mixed" difficulty can adapt.
// Flow per question: answer -> review (feedback + optional follow-up) -> follow-up answers -> Continue.
import { readKey, writeKey } from "../client/storage";
import { filterBank, type BankFilter } from "./bank";
import { DEBUG_PROBLEMS } from "./debugging";
import { buildScorecard } from "./scorecard";
import { PROBLEMS } from "./problems";
import { SQL_PROBLEMS } from "./sql";
import { textPool } from "./sessionPools";
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
export const RUNNABLE_LANGS = ["python", "typescript", "javascript"] as const;
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
  current: Current | null;
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
const cleanCustoms = (c: SessionConfig) => c.customQuestions.map((q) => q.trim().slice(0, 400)).filter(Boolean);

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
  if (s.current) used.add(s.current.item.question);
  return used;
};
const usedIds = (s: PracticeState): Set<string> => new Set([...s.turns.map((t) => t.source), ...(s.current ? [s.current.item.source, s.current.item.problemId ?? ""] : [])]);

function levelFor(s: PracticeState): "easy" | "medium" | "hard" {
  return s.config.difficulty === "mixed" ? LEVELS[Math.min(2, Math.max(0, s.level))] : s.config.difficulty;
}

/** Bank question for the filters, relaxing topics, then company, then level, until something matches. */
function pickBank(s: PracticeState, bank: BankQuestion[], rand: () => number): { q: BankQuestion; note?: string } | null {
  const base: BankFilter = { company: s.config.company ?? s.context.company, topics: s.config.topics, difficulty: levelFor(s) };
  const steps: [BankFilter, string | undefined][] = [
    [base, undefined],
    [{ ...base, topics: [] }, "No match for your topics; showing the same company and level."],
    [{ ...base, topics: [], company: null }, "Few problems for this company; showing others at your level."],
    [{ difficulty: null }, "Showing the closest problems we have."],
  ];
  const ids = usedIds(s);
  for (const [f, note] of steps) {
    const pool = filterBank(bank, f).filter((q) => !ids.has(q.id));
    if (pool.length) return { q: pool[Math.floor(rand() * pool.length)], ...(note ? { note } : {}) };
  }
  return null;
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
    const nth = s.turns.filter((t) => t.round === "coding").length + (s.current?.item.round === "coding" ? 1 : 0);
    const problems = unused(PROBLEMS);
    if (runs && nth % 2 === 0 && problems.length) {
      const p = problems[Math.floor(rand() * problems.length)];
      return mk({ kind: "code", question: p.prompt, source: "app", title: p.title, problemId: p.id });
    }
    const b = pickBank(s, bank, rand);
    if (b) return bankItem(i, b.q, b.note);
    if (runs && problems.length) return mk({ kind: "code", question: problems[0].prompt, source: "app", title: problems[0].title, problemId: problems[0].id });
  } else if (slot.round === "sql") {
    const ps = unused(SQL_PROBLEMS);
    if (ps.length) {
      const p = ps[Math.floor(rand() * ps.length)];
      return mk({ kind: "sql", question: p.prompt, source: "app", title: p.title, problemId: p.id });
    }
    const b = pickBank(s, bank, rand);
    if (b) return bankItem(i, b.q, "Out of SQL practice problems; here is a coding question instead.");
  } else if (slot.round === "debugging") {
    const ps = unused(DEBUG_PROBLEMS);
    if (ps.length) {
      const p = ps[Math.floor(rand() * ps.length)];
      return mk({ kind: "debug", question: p.prompt, source: "app", title: p.title, problemId: p.id });
    }
    const b = pickBank(s, bank, rand);
    if (b) return bankItem(i, b.q, "Out of debugging problems; here is a coding question instead.");
  } else {
    const asked = usedKeys(s);
    const pool = textPool(slot.round, { values: s.values, company: s.context.company, preset: s.context.preset });
    const fresh = (xs: typeof pool.ordered) => xs.filter((o) => !asked.has(o.text));
    const first = fresh(pool.ordered)[0] ?? (() => { const r = fresh(pool.shuffled); return r.length ? r[Math.floor(rand() * r.length)] : null; })();
    if (first) return mk({ kind: "text", question: first.text, source: first.source, id: `${i}-${slot.round}` });
  }
  // Pool exhausted (or no bank): the model writes this one.
  return mk({ kind: "text", question: "", source: "ai", id: `${i}-ai` });
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
  return { ...s, current: { item, startedAt: now, answer: null, code: null, hints: [], inner, feedback: null, level: null, followUps: [], reviewed: 0 }, updatedAt: now };
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
    current: null,
    calls: 0,
    status: "active",
    endedEarly: false,
    endedAt: null,
  };
  return startCurrent(s, 0, bank, opts.now);
}

/** What the screen should do next. */
export function awaiting(s: PracticeState): Awaiting {
  const c = s.current;
  if (s.status === "done" || !c) return "done";
  if (!c.item.question) return "question";
  if (c.answer === null) return "answer";
  if (c.followUps.some((f) => f.answer === null)) return "followup";
  if (c.reviewed < 1 + c.followUps.length) return "review";
  return "next";
}

export const canCallModel = (s: PracticeState): boolean => s.calls < MAX_PRACTICE_CALLS;
export const followUpsLeft = (c: Current): number => Math.max(0, MAX_FOLLOWUPS - c.followUps.length);

/** The model wrote this slot's question. */
export function applyQuestion(s: PracticeState, text: string, now: number): PracticeState {
  const c = s.current;
  const q = text.trim().slice(0, 400);
  if (!c || !q) return { ...s, calls: s.calls + 1, updatedAt: now };
  const inner = c.inner ? { ...c.inner, pending: q } : null;
  return { ...s, calls: s.calls + 1, updatedAt: now, current: { ...c, item: { ...c.item, question: q }, inner } };
}

/** Saves the typed answer (and the last submitted code, for runnable items). */
export function submitAnswer(s: PracticeState, answer: string, now: number, code: CodeAttempt | null = null): PracticeState {
  const c = s.current;
  const text = answer.trim().slice(0, MAX_ANSWER_CHARS + MAX_CODE_CHARS);
  if (!c || !text || c.answer !== null) return s;
  return { ...s, updatedAt: now, current: { ...c, answer: text, code: code ?? c.code } };
}

/** Runnable panels edit `inner`; keep our copy of its code and hints in step. */
export function syncInner(s: PracticeState, inner: InterviewSession, now: number): PracticeState {
  const c = s.current;
  if (!c || !c.inner || c.inner.id !== inner.id) return s;
  const hints = inner.hints;
  return { ...s, updatedAt: now, current: { ...c, inner, code: inner.code, hints } };
}

/** The runnable panel pressed "Finish": its approach + code become the answer. */
export function finishRunnable(s: PracticeState, inner: InterviewSession, now: number): PracticeState {
  const synced = syncInner(s, inner, now);
  const answer = inner.turns[0]?.answer ?? "";
  return submitAnswer(synced, answer, now, inner.code);
}

export function answerFollowUp(s: PracticeState, answer: string, now: number): PracticeState {
  const c = s.current;
  const text = answer.trim().slice(0, MAX_ANSWER_CHARS);
  if (!c || !text) return s;
  const i = c.followUps.findIndex((f) => f.answer === null);
  if (i < 0) return s;
  const followUps = c.followUps.map((f, k) => (k === i ? { ...f, answer: text } : f));
  return { ...s, updatedAt: now, current: { ...c, followUps } };
}

/** The /api/interview body for the review (or hint) of the current question. Null when there is nothing to review. */
export function buildReviewRequest(s: PracticeState, ask: "review" | "hint"): InterviewRequest | null {
  const c = s.current;
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
  const c = s.current;
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
  const q = typeof reply.followUp === "string" ? reply.followUp.trim().slice(0, 400) : "";
  if (q && followUpsLeft(c) > 0 && !followUps.some((f) => f.answer === null) && !followUps.some((f) => f.question === q)) followUps.push({ question: q, answer: null });
  return {
    ...next,
    current: { ...c, feedback: answered === 1 && fb ? fb : c.feedback, level: reply.level ?? c.level, followUps, reviewed: answered },
  };
}

/** Leaves the newest answer without model feedback (call failed or the cap is hit) so the session can go on. */
export function skipReview(s: PracticeState, now: number): PracticeState {
  const c = s.current;
  if (!c) return s;
  return { ...s, updatedAt: now, current: { ...c, reviewed: 1 + c.followUps.filter((f) => f.answer !== null).length } };
}

/** A model hint (runnable items keep theirs in inner.hints). */
export function addHint(s: PracticeState, text: string, now: number): PracticeState {
  const c = s.current;
  const next = { ...s, calls: s.calls + 1, updatedAt: now };
  if (!c || !text.trim()) return next;
  return { ...next, current: { ...c, hints: [...c.hints, text.trim().slice(0, 300)] } };
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
  const n = (c.answer ?? "").length;
  return n >= 400 ? "ok" : n < 80 ? "weak" : "ok";
}

function finalize(s: PracticeState, now: number, skipped: boolean): SessionTurn | null {
  const c = s.current;
  if (!c) return null;
  const answered = c.followUps.filter((f) => f.answer !== null);
  return {
    round: c.item.round,
    question: c.item.question,
    source: c.item.source,
    answer: skipped ? "" : (c.answer ?? ""),
    ...(c.code ? { code: c.code } : {}),
    hintsUsed: c.hints.length,
    skipped,
    ...(c.feedback ? { feedback: c.feedback } : {}),
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
  const base: PracticeState = { ...s, turns, level, current: null, updatedAt: now };
  if (turns.length >= s.slots.length) return { ...base, status: "done", endedAt: now };
  return startCurrent(base, turns.length, bank, now);
}

/** Done with this question: store it and open the next, or finish the session after the last slot. */
export function advance(s: PracticeState, bank: BankQuestion[], now: number): PracticeState {
  const t = s.status === "active" ? finalize(s, now, false) : null;
  return t && s.current?.answer !== null ? moveOn(s, t, bank, now) : s;
}

export function skip(s: PracticeState, bank: BankQuestion[], now: number): PracticeState {
  const t = s.status === "active" ? finalize(s, now, true) : null;
  return t ? moveOn(s, t, bank, now) : s;
}

/** "End session": keeps an answered current question, drops an unanswered one, goes to the summary. */
export function endEarly(s: PracticeState, now: number): PracticeState {
  if (s.status === "done") return s;
  const t = s.current && s.current.answer !== null ? finalize(s, now, false) : null;
  return { ...s, turns: t ? [...s.turns, t] : s.turns, current: null, status: "done", endedEarly: true, endedAt: now, updatedAt: now };
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
    label: s.current ? (s.current.item.source === "custom" ? "Your question" : roundLabel(s.current.item.round)) : "Done",
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
    round,
    context: { company: null, role: null, description: null, resume: null, field: null },
    turns: turns.map((t) => ({ question: t.question, answer: t.answer })),
    pending: null,
    used: 0,
    seed: 0,
    problemId: last?.code?.problemId ?? null,
    code: last?.code ?? null,
    board: null,
    hints: turns.flatMap((t) => Array.from({ length: t.hintsUsed }, () => "hint")),
    feedback: { summary: "", items: turns.flatMap((t, i) => (t.feedback ? [{ ...t.feedback, index: i }] : [])) },
    status: "done",
    createdAt: 0,
    updatedAt: 0,
  };
}

/** Round band: rule-graded axes where the app can check (code, STAR, numbers), else the answer levels. */
function roundBand(round: RoundKind, turns: SessionTurn[]): { band: ScoreBand; note: string } {
  const answered = turns.filter((t) => !t.skipped);
  if (!answered.length) return { band: "Not yet", note: "Every question was skipped." };
  const graded = answered.some((t) => t.code) || round !== "coding";
  const card = graded ? buildScorecard(innerFor(round, answered)) : null;
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
  const per = rounds.map((round) => ({ round, ...roundBand(round, s.turns.filter((t) => t.round === round)) }));
  const weakTags = new Map<string, number>();
  s.turns.filter((t) => t.level === "weak").forEach((t) => (t.tags ?? []).forEach((g) => weakTags.set(g, (weakTags.get(g) ?? 0) + 1)));
  const next: string[] = [];
  [...per].sort((a, b) => BAND_ORDER.indexOf(b.band) - BAND_ORDER.indexOf(a.band)).forEach((r) => {
    if (r.band !== "Strong" && r.note && next.length < 3) next.push(r.note);
  });
  [...weakTags].sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(([g]) => next.length < 3 && next.push(`Do two more ${g} problems and say the complexity out loud.`));
  const skipped = s.turns.filter((t) => t.skipped).length;
  if (skipped && next.length < 3) next.push(`Come back to the ${skipped} ${skipped === 1 ? "question" : "questions"} you skipped.`);
  if (!next.length) next.push("Try a harder level or another company's questions.");
  const strengths = s.turns
    .filter((t) => !t.skipped && t.feedback?.strength && t.level !== "weak")
    .map((t) => t.feedback?.strength ?? "")
    .slice(0, 3);
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
  if (typeof v.id !== "string" || typeof v.calls !== "number" || (v.current !== null && !isObj(v.current))) return null;
  return v as unknown as PracticeState;
}
export const saveActive = (s: PracticeState): void => writeKey(ACTIVE_KEY, s);
export const clearActive = (): void => writeKey(ACTIVE_KEY, null);

export function loadHistory(): HistoryEntry[] {
  const v = readKey<unknown>(HISTORY_KEY);
  return Array.isArray(v) ? (v.filter((e) => isObj(e) && typeof e.id === "string" && isObj(e.summary)) as unknown as HistoryEntry[]).slice(0, MAX_HISTORY) : [];
}
export function saveToHistory(s: PracticeState): HistoryEntry {
  const entry: HistoryEntry = { id: s.id, finishedAt: s.endedAt ?? s.updatedAt, company: s.context.company, summary: buildSummary(s) };
  writeKey(HISTORY_KEY, [entry, ...loadHistory().filter((e) => e.id !== s.id)].slice(0, MAX_HISTORY));
  return entry;
}
export const removeHistory = (id: string): void => writeKey(HISTORY_KEY, loadHistory().filter((e) => e.id !== id));
