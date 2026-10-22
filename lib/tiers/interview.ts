// Mock interview state machine (devpost/tier3-spec.md > Interview logic, tier4-spec.md). Pure, plus is:interviews storage.
// Every function returns a new session; the input is never changed. All prompts are made up.
import type { Field } from "../types";
import { quoteIsReal } from "../quotes";
import { KEYS, readKey, writeKey } from "../client/storage";
import { fromJson, toJson } from "./board";
import { getProblem, pickProblem } from "./problems";
import { pickDebugProblem } from "./debugging";
import { pickSqlProblem } from "./sql";
import { scriptFor } from "./scripted";
import {
  BOARD_ROUNDS,
  CODE_ROUNDS,
  CHALLENGE_MINUTES,
  INTERVIEW_ROUNDS,
  MAX_LINKS,
  MAX_LINK_CHARS,
  SCRIPTED_ROUNDS,
  MAX_ANSWER_CHARS,
  MAX_CODE_CHARS,
  MAX_CONTEXT_FIELD,
  MAX_JOB_CHARS,
  MAX_QUESTION_CHARS,
  MAX_RESUME_CONTEXT_CHARS,
  MAX_SESSIONS,
  MAX_SESSION_TURNS,
  MAX_TURNS,
  QUESTIONS_PER_ROUND,
  type AnswerFeedback,
  type CodeAttempt,
  type CodeStats,
  type InterviewAsk,
  type InterviewContext,
  type InterviewFeedback,
  type InterviewReply,
  type InterviewRequest,
  type InterviewRound,
  type InterviewSession,
  type InterviewTurn,
  type StarCheck,
} from "./types";

const MAX_STRENGTH = 300;
const MAX_SUMMARY = 400;
const MAX_HINT = 300;

const FIELDS: Field[] = ["tech", "business", "finance", "design", "other"];
const ROUNDS = INTERVIEW_ROUNDS.map((r) => r.id);

/** Made-up STAR prompts for the Behavioral round's first question. */
export const BEHAVIORAL_PROMPTS: string[] = [
  "Tell me about a time you worked on a team project where the group disagreed. What happened, and what did you do?",
  "Describe a time you had a tight deadline. How did you plan your work, and how did it turn out?",
  "Tell me about a mistake you made at school, work or in a club. How did you handle it?",
  "Give me an example of a time you took the lead on something nobody asked you to do.",
  "Tell me about a time you had to learn something new quickly to get a task done.",
  "Describe a time you got critical feedback. What did you change afterwards?",
];

/** Made-up prompts for the System design round's first question. */
export const DESIGN_PROMPTS: string[] = [
  "Design a simple link shortener for a student club: people paste a long link and get a short one that redirects. Sketch the main parts on the board and walk me through how a click is handled.",
  "Design a campus study-room booking app where students reserve a room for an hour. Sketch the main parts and explain how you stop two people booking the same slot.",
  "Design a photo-sharing feed for a small hobby community. Sketch where photos are stored and how the feed is loaded quickly.",
  "Design a notification service that emails students when a class assignment is posted. Sketch the parts and explain what happens if the email provider is slow.",
];

/** Made-up UX challenges for the Design challenge round, sketched as Screen boxes on the board. */
export const CHALLENGE_PROMPTS: string[] = [
  "Design the onboarding flow for a campus food-pantry app, from first open to reserving a pickup slot. Sketch each screen on the board and connect them in order, then walk me through it.",
  "Design how a student finds and joins a study group for one class in a campus app. Sketch the screens as boxes, connect the flow, and explain the choices you made.",
  "A library app's room-booking flow has many drop-offs at checkout. Sketch a simpler booking flow screen by screen on the board and explain what you changed and why.",
  "Design a flow for a club treasurer to log an expense and attach a receipt photo on their phone. Sketch the screens on the board and walk me through the happy path and one error.",
  "Design the first-time setup for a shared-chores app for roommates. Sketch the screens and the arrows between them, and explain how someone invites a roommate.",
];

/** Local first question for the Portfolio walkthrough round. Made up. */
export const PORTFOLIO_FIRST =
  "Pick one project you're proud of and walk me through it: what problem it solved, what your role was, how you got from first idea to final design, and how it turned out.";

/** Same seed rule as pickProblem: non-finite -> 0, negative -> absolute value. */
function pick<T>(list: T[], seed: number): T {
  const n = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) : 0;
  return list[n % list.length];
}

const cap = (s: string | null, max: number): string | null => (s === null ? null : s.slice(0, max));
const isScripted = (round: InterviewRound) => SCRIPTED_ROUNDS.includes(round);

/** The local first question for a round (no AI call). */
export function firstQuestion(round: InterviewRound, context: InterviewContext, seed: number): string {
  if (round === "behavioral") return pick(BEHAVIORAL_PROMPTS, seed);
  if (round === "design") return pick(DESIGN_PROMPTS, seed);
  if (round === "coding") return pickProblem(seed).prompt;
  if (round === "sql") return pickSqlProblem(seed).prompt;
  if (round === "debugging") return pickDebugProblem(seed).prompt;
  if (round === "challenge") return pick(CHALLENGE_PROMPTS, seed);
  if (round === "portfolio") return PORTFOLIO_FIRST;
  const script = scriptFor(round, seed);
  if (script && script.length) return script[0].prompt;
  const role = context.role?.trim().slice(0, MAX_CONTEXT_FIELD) || null;
  const company = context.company?.trim().slice(0, MAX_CONTEXT_FIELD) || null;
  const target = role && company ? `the ${role} role at ${company}` : role ? `the ${role} role` : company ? `this role at ${company}` : "this role";
  return `Thanks for making time. To start, tell me a little about yourself and why ${target} interests you.`;
}

export function newSession(
  round: InterviewRound,
  context: InterviewContext,
  opts: { id: string; now: number; seed: number },
): InterviewSession {
  return {
    id: opts.id,
    round,
    context,
    turns: [],
    pending: firstQuestion(round, context, opts.seed),
    used: 0,
    seed: opts.seed,
    problemId:
      round === "coding"
        ? pickProblem(opts.seed).id
        : round === "sql"
          ? pickSqlProblem(opts.seed).id
          : round === "debugging"
            ? pickDebugProblem(opts.seed).id
            : null,
    code: null,
    board: null,
    hints: [],
    feedback: null,
    status: "active",
    createdAt: opts.now,
    updatedAt: opts.now,
  };
}

/** Answers the round still wants, counting the local first question (scripted rounds: the script length). */
function roundTotal(s: InterviewSession): number {
  const script = isScripted(s.round) ? scriptFor(s.round, s.seed) : null;
  return Math.min(QUESTIONS_PER_ROUND[s.round], MAX_TURNS, script ? script.length : Infinity);
}

/**
 * Moves the pending question and the answer into turns. No pending or an empty answer leaves s as is.
 * Scripted rounds (case, finance) then set the next local question until the script ends.
 */
export function answerPending(s: InterviewSession, answer: string, now: number): InterviewSession {
  const text = (answer ?? "").trim().slice(0, MAX_ANSWER_CHARS);
  if (!s.pending || !text || s.status === "done") return s;
  const turns = [...s.turns, { question: s.pending, answer: text }];
  const script = isScripted(s.round) ? scriptFor(s.round, s.seed) : null;
  const pending = script && turns.length < roundTotal(s) ? (script[turns.length]?.prompt ?? null) : null;
  return { ...s, turns, pending, updatedAt: now };
}

/** Whether an AI call of this kind is allowed now. The last of MAX_SESSION_TURNS is kept for feedback. */
export function canCall(s: InterviewSession, ask: InterviewAsk): boolean {
  if (s.status === "done" || s.used >= MAX_SESSION_TURNS) return false;
  if (ask === "feedback") return s.turns.length >= 1;
  if (s.used >= MAX_SESSION_TURNS - 1) return false;
  if (ask === "hint") return CODE_ROUNDS.includes(s.round);
  // Coding and scripted questions are all local; the route rejects AI questions there.
  if (CODE_ROUNDS.includes(s.round) || isScripted(s.round)) return false;
  return !s.pending && s.turns.length < roundTotal(s);
}

/** ms left of the Design challenge's CHALLENGE_MINUTES, counted from s.createdAt. Never below 0. */
export function challengeLeft(s: InterviewSession, now: number): number {
  return Math.max(0, s.createdAt + CHALLENGE_MINUTES * 60_000 - now);
}

/** One portfolio link: http(s) only, at most MAX_LINK_CHARS. */
function isLink(v: unknown): v is string {
  if (typeof v !== "string" || !v || v.length > MAX_LINK_CHARS || !/^https?:\/\//i.test(v)) return false;
  try {
    const p = new URL(v).protocol;
    return p === "http:" || p === "https:";
  } catch {
    return false;
  }
}

const capLinks = (xs: unknown[]): string[] => [...new Set(xs.filter(isLink))].slice(0, MAX_LINKS);

/** Typed links -> up to MAX_LINKS distinct http(s) URLs of <= MAX_LINK_CHARS. Anything else is dropped. */
export function cleanLinks(raw: string): string[] {
  return capLinks((raw ?? "").split(/\s+/));
}

/** answer: a question waits; ask: get an AI follow-up; feedback: time for feedback; done: finished. */
export function nextStep(s: InterviewSession): "answer" | "ask" | "feedback" | "done" {
  if (s.status === "done") return "done";
  if (s.pending) return "answer";
  if (s.turns.length >= roundTotal(s)) return "feedback";
  if (canCall(s, "question")) return "ask";
  return s.turns.length >= 1 ? "feedback" : "done";
}

/** The /api/interview body for this session, capped to what the route accepts. */
export function buildRequest(s: InterviewSession, ask: InterviewAsk, now = Date.now()): InterviewRequest {
  const c = s.context;
  return {
    ask,
    round: s.round,
    context: {
      company: cap(c.company, MAX_CONTEXT_FIELD),
      role: cap(c.role, MAX_CONTEXT_FIELD),
      description: cap(c.description, MAX_JOB_CHARS),
      resume: cap(c.resume, MAX_RESUME_CONTEXT_CHARS),
      field: c.field,
      ...(Array.isArray(c.links) ? { links: capLinks(c.links) } : {}),
    },
    turns: s.turns.slice(0, MAX_TURNS).map((t) => ({
      question: t.question.slice(0, MAX_QUESTION_CHARS),
      answer: t.answer.slice(0, MAX_ANSWER_CHARS),
    })),
    used: s.used,
    code: CODE_ROUNDS.includes(s.round) && s.code ? { ...s.code, code: s.code.code.slice(0, MAX_CODE_CHARS) } : null,
    board: BOARD_ROUNDS.includes(s.round) ? s.board : null,
    problem: CODE_ROUNDS.includes(s.round) ? (getProblem(s.problemId)?.prompt ?? null) : null,
    ...(s.round === "challenge" && ask === "feedback" ? { timeUp: challengeLeft(s, now) === 0 } : {}),
  };
}

/** Applies a successful reply. Every call counts (used + 1), even an empty or mismatched one. */
export function applyReply(s: InterviewSession, ask: InterviewAsk, reply: InterviewReply, now: number): InterviewSession {
  const next: InterviewSession = { ...s, used: s.used + 1, updatedAt: now };
  if (ask === "feedback") {
    // Re-checked against the stored turns (the route saw capped answers; quotes stay real either way).
    const fb = reply.feedback ? validateFeedback(reply.feedback, s.turns, s.round) : null;
    return fb ? { ...next, feedback: fb, status: "done", pending: null } : next;
  }
  const text = typeof reply.text === "string" ? reply.text.trim() : "";
  if (!text) return next;
  if (ask === "hint") return { ...next, hints: [...s.hints, text.slice(0, MAX_HINT)] };
  return { ...next, pending: text.slice(0, MAX_QUESTION_CHARS) };
}

// ---------- Feedback validation ----------

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

function cleanStar(v: unknown): StarCheck | null {
  if (!isRec(v)) return null;
  return { situation: v.situation === true, task: v.task === true, action: v.action === true, result: v.result === true };
}

/** Shape-checks model feedback against the turns it is about. Null when no item survives. */
export function validateFeedback(raw: unknown, turns: InterviewTurn[], round: InterviewRound): InterviewFeedback | null {
  if (!isRec(raw) || !Array.isArray(raw.items)) return null;
  const seen = new Set<number>();
  const items: AnswerFeedback[] = [];
  for (const it of raw.items) {
    if (!isRec(it)) continue;
    const index = it.index;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= turns.length || seen.has(index)) continue;
    if (typeof it.strength !== "string" || typeof it.improve !== "string") continue;
    const strength = it.strength.trim().slice(0, MAX_STRENGTH);
    const improve = it.improve.trim().slice(0, MAX_STRENGTH);
    if (!strength && !improve) continue;
    seen.add(index);
    const quote = typeof it.quote === "string" && quoteIsReal(it.quote, turns[index].answer) ? it.quote.trim() : null;
    items.push({ index, strength, improve, quote, star: round === "behavioral" ? cleanStar(it.star) : null });
  }
  if (items.length === 0) return null;
  items.sort((a, b) => a.index - b.index);
  const summary = typeof raw.summary === "string" ? raw.summary.trim().slice(0, MAX_SUMMARY) : "";
  return { summary, items };
}

// ---------- Storage (is:interviews, newest first) ----------

const isNullStr = (v: unknown): v is string | null => v === null || typeof v === "string";
const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function isContext(v: unknown): v is InterviewContext {
  return (
    isRec(v) &&
    isNullStr(v.company) &&
    isNullStr(v.role) &&
    isNullStr(v.description) &&
    isNullStr(v.resume) &&
    (v.field === null || FIELDS.includes(v.field as Field)) &&
    (v.links === undefined || (Array.isArray(v.links) && v.links.every((l) => typeof l === "string")))
  );
}

const isCount = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0;
const isStats = (v: unknown): v is CodeStats =>
  isRec(v) && isCount(v.runsBeforeSubmit) && isCount(v.submits) && (v.firstSubmitAt === null || isTime(v.firstSubmitAt));

const isTurn = (v: unknown): v is InterviewTurn => isRec(v) && typeof v.question === "string" && typeof v.answer === "string";

function isCode(v: unknown): v is CodeAttempt {
  return (
    isRec(v) &&
    typeof v.problemId === "string" &&
    (["python", "javascript", "typescript", "sql"] as unknown[]).includes(v.language) &&
    typeof v.code === "string" &&
    typeof v.passed === "number" &&
    Number.isInteger(v.passed) &&
    typeof v.total === "number" &&
    Number.isInteger(v.total) &&
    v.passed >= 0 &&
    v.total >= 0
  );
}

/** A valid stored session, normalized (old sessions without hints get []), or null. */
function readSession(v: unknown): InterviewSession | null {
  if (!isRec(v)) return null;
  if (typeof v.id !== "string" || !v.id) return null;
  if (!ROUNDS.includes(v.round as InterviewRound)) return null;
  const round = v.round as InterviewRound;
  if (!isContext(v.context) || !Array.isArray(v.turns) || !v.turns.every(isTurn)) return null;
  if (!isNullStr(v.pending) || !isNullStr(v.problemId)) return null;
  if (typeof v.used !== "number" || !Number.isInteger(v.used) || v.used < 0) return null;
  if (!isTime(v.seed) || !isTime(v.createdAt) || !isTime(v.updatedAt)) return null;
  if (v.status !== "active" && v.status !== "done") return null;
  if (v.code !== null && !isCode(v.code)) return null;
  const board = v.board === null || v.board === undefined ? null : fromJson(v.board);
  if (v.board !== null && v.board !== undefined && !board) return null;
  if (v.hints !== undefined && !(Array.isArray(v.hints) && v.hints.every((h) => typeof h === "string"))) return null;
  const turns = (v.turns as InterviewTurn[]).map((t) => ({ question: t.question, answer: t.answer }));
  const c = v.context;
  return {
    id: v.id,
    round,
    context: {
      company: c.company,
      role: c.role,
      description: c.description,
      resume: c.resume,
      field: c.field,
      // Optional (Tier 4): absent stays absent so older sessions round-trip unchanged.
      ...(c.links ? { links: capLinks(c.links) } : {}),
    },
    turns,
    pending: v.pending,
    used: v.used,
    seed: v.seed,
    problemId: v.problemId,
    code: v.code === null ? null : { ...(v.code as CodeAttempt) },
    board: board ? toJson(board) : null,
    hints: Array.isArray(v.hints) ? [...(v.hints as string[])] : [],
    ...(isStats(v.stats) ? { stats: { ...v.stats } } : {}),
    feedback: v.feedback === null || v.feedback === undefined ? null : validateFeedback(v.feedback, turns, round),
    status: v.status,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

export function loadSessions(): InterviewSession[] {
  const raw = readKey<unknown>(KEYS.interviews);
  if (!Array.isArray(raw)) return [];
  const out: InterviewSession[] = [];
  for (const x of raw) {
    const s = readSession(x);
    if (s) out.push(s);
    if (out.length >= MAX_SESSIONS) break;
  }
  return out;
}

/** Puts s first (replacing any older copy) and keeps the newest MAX_SESSIONS. */
export function saveSession(s: InterviewSession): void {
  const rest = loadSessions().filter((x) => x.id !== s.id);
  writeKey(KEYS.interviews, [s, ...rest].slice(0, MAX_SESSIONS));
}

export function removeSession(id: string): void {
  writeKey(
    KEYS.interviews,
    loadSessions().filter((x) => x.id !== id),
  );
}
