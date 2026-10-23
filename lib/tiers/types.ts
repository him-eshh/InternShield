// Tier 2-4 shared contracts (devpost/tier2-spec.md, tier3-spec.md, tier4-spec.md). Read-only to workers: report needed changes.
import type { ApiResponse, Field, RiskLevel } from "../types";

// ---------- Slice 8: tailored resume ----------

/** Where the tailoring target comes from: the last report, or a pasted job description. */
export interface PostingContext {
  company: string | null;
  role: string | null;
  /** Pasted job description, capped at MAX_JOB_CHARS. */
  description: string | null;
}

export const MAX_JOB_CHARS = 2000;
export const MAX_REWRITE_CHARS = 600; // one bullet/section line
export const MAX_INSTRUCTION_CHARS = 200;

/** POST /api/rewrite. Only the selected text goes to the AI, never the whole resume. */
export interface RewriteRequest {
  text: string;
  instruction: string;
  posting: PostingContext;
  /** How to tailor. Fixed choices only; the server turns them into its own wording. Missing = DEFAULT_TAILOR. */
  options?: TailorOptions;
  /** v2: 3 = three options in one strict-JSON call plus heldBack. Missing = one plain rewrite. */
  count?: 1 | 3;
  /** v2: terms the user confirmed ("I have this"), at most MAX_FACTS of MAX_FACT_CHARS each. */
  facts?: string[];
}
export const MAX_FACTS = 12;
export const MAX_FACT_CHARS = 60;

// ---------- Tailoring options (fixed choices, never free text) ----------
export const EMPHASES = ["skills", "impact", "leadership", "technical"] as const;
export type Emphasis = (typeof EMPHASES)[number];
export const TONES = ["concise", "confident", "formal"] as const;
export type Tone = (typeof TONES)[number];
export const STRENGTHS = ["light", "strong"] as const;
export type Strength = (typeof STRENGTHS)[number];

export interface TailorOptions {
  /** What to bring forward. Empty = whatever fits the posting. */
  emphasis: Emphasis[];
  tone: Tone;
  /** "light" changes a few words; "strong" may restructure the sentence. */
  strength: Strength;
  /** Keep about the same length as the original line. */
  keepLength: boolean;
  // v2 (all optional; missing = not sent, the server adds no line)
  level?: TargetLevel;
  region?: Region;
  /** Prefer the posting's word for a concept the line already covers. */
  postingWords?: boolean;
  noBuzzwords?: boolean;
}
export const TARGET_LEVELS = ["internship", "newgrad", "changer", "experienced"] as const;
export type TargetLevel = (typeof TARGET_LEVELS)[number];
export const REGIONS = ["us", "uk", "canada", "europe", "other"] as const;
export type Region = (typeof REGIONS)[number];

export const DEFAULT_TAILOR: TailorOptions = { emphasis: [], tone: "confident", strength: "light", keepLength: true };
/** v2 defaults (findings 03 section 3): posting's words and no buzzwords on. */
export const DEFAULT_TAILOR_V2: TailorOptions = { ...DEFAULT_TAILOR, level: "internship", region: "us", postingWords: true, noBuzzwords: true };
/** options: up to 3 alternative rewrites; heldBack: posting terms the model left out because the line doesn't support them. */
export type RewriteResponse = ApiResponse<{ text: string; options?: string[]; heldBack?: string[] }>;

// ---------- v2: keyword gap (job posting terms vs resume) ----------
export interface GapTerm {
  term: string;
  bucket: "found" | "alias" | "missing"; // alias = resume has a synonym
  alias?: string; // the resume's wording when bucket is "alias"
}
export interface KeywordGap {
  required: GapTerm[];
  preferred: GapTerm[];
}

/** What the guard found that isn't in the original resume. Empty = allowed. */
export type GuardIssueKind = "number" | "proper_noun" | "skill";
export interface GuardIssue {
  kind: GuardIssueKind;
  token: string;
}
/** tier (v2): "block" = never show, "check" = show with a warning, "ok" = clean. */
export type GuardTier = "block" | "check" | "ok";
export type GuardResult = { ok: true; tier?: GuardTier } | { ok: false; issues: GuardIssue[]; tier?: GuardTier };
/** v2 soft warnings (Check tier): stronger verb, dropped qualifier, new scope/seniority word, buzzword. */
export type GuardWarningKind = "inflated" | "qualifier" | "scope" | "seniority" | "buzzword";
export interface GuardWarning {
  kind: GuardWarningKind;
  token: string;
  /** inflated: the original's weaker verb, when there was one. */
  was?: string;
}
export interface GuardV2 {
  tier: GuardTier;
  issues: GuardIssue[];
  warnings: GuardWarning[];
  /** Blocked terms that came from the posting, not the resume. */
  fromPosting: string[];
}
// lib/tiers/resumeGuard.ts exports:
//   checkRewrite(resumeText: string, original: string, rewrite: string): GuardResult
//   wordDiff(before: string, after: string): DiffPart[]

export interface DiffPart {
  kind: "same" | "added" | "removed";
  text: string;
}

/** Accepted edits, applied over the stored resume text (is:tailored). */
export interface TailoredResume {
  /** Fingerprint of the resume text these edits belong to; mismatched = discard. */
  resumeKey: string;
  /** Resume lines after accepted edits (lines split on \n, blanks dropped). */
  lines: string[];
  updatedAt: number;
}

// ---------- Slice 9: tracker ----------

export type TrackerColumn = "saved" | "applied" | "interviewing";
export const TRACKER_COLUMNS: { id: TrackerColumn; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
];

export interface TrackerCard {
  id: string;
  company: string;
  role: string;
  /** Official link if known (posting apply URL); shown, never fetched. */
  link: string | null;
  /** Risk level from the report it was saved from; null when added by hand. */
  risk: RiskLevel | null;
  column: TrackerColumn;
  notes: string;
  createdAt: number;
}
/** What "Save to tracker" on a report hands the tracker. */
export type NewCard = Pick<TrackerCard, "company" | "role" | "link" | "risk">;

// ---------- Slice 10: screenshot ----------

/** Max total data-URL length per transcribe request (all strips). Under guard.ts's 3.6 MiB body cap. */
export const MAX_IMAGE_DATA_URL = 3_500_000;
export const IMAGE_MAX_SIDE = 1600;

/** POST /api/transcribe. `image` is a data:image/(jpeg|png|webp);base64 URL. */
export interface TranscribeRequest {
  image?: string;
  /** A tall screenshot cut into at most 2 strips, top first (lib/tiers/image.ts prepareStrips). */
  images?: string[];
}
export type TranscribeResponse = ApiResponse<{ text: string; partial?: boolean }>;

// ---------- Tier 3: mock interview ----------

export type InterviewRound = "screen" | "behavioral" | "coding" | "design" | "case" | "finance" | "portfolio" | "challenge" | "debugging" | "sql";
/** Rounds graded by running code locally (one local problem, hints allowed, no AI questions). */
export const CODE_ROUNDS: InterviewRound[] = ["coding", "debugging", "sql"];

// ---------- v2: scorecard and company-style presets ----------
export type ScoreBand = "Strong" | "Solid" | "Developing" | "Not yet";
export interface Scorecard {
  axes: { id: string; label: string; band: ScoreBand; evidence: string[]; byCode: boolean }[]; // byCode = graded by rules, not AI
  nextDrill?: string;
}
/** Labels say "-style" (e.g. "Big-tech-style loop"); never imply affiliation with a company. */
export interface CompanyPreset {
  id: string;
  label: string;
  source?: { label: string; url: string };
  rounds: string[];
}
/** field null = every profile; otherwise only that profile field (and only when the round's flag is on). */
export const INTERVIEW_ROUNDS: { id: InterviewRound; label: string; field: Field | null }[] = [
  { id: "screen", label: "Recruiter screen", field: null },
  { id: "behavioral", label: "Behavioral", field: null },
  { id: "coding", label: "Live coding", field: "tech" },
  { id: "sql", label: "SQL", field: "tech" },
  { id: "debugging", label: "Debugging", field: "tech" },
  { id: "design", label: "System design", field: "tech" },
  { id: "case", label: "Case interview", field: "business" },
  { id: "finance", label: "Technical questions", field: "finance" },
  { id: "portfolio", label: "Portfolio walkthrough", field: "design" },
  { id: "challenge", label: "Design challenge", field: "design" },
];
/** Questions per round, including the local first question. */
export const QUESTIONS_PER_ROUND: Record<InterviewRound, number> = {
  screen: 4,
  behavioral: 4,
  coding: 1,
  design: 3,
  case: 3,
  finance: 4,
  portfolio: 4,
  challenge: 3,
  debugging: 1,
  sql: 1,
};
/** Rounds whose questions all come from a local script (no AI questions; AI only for feedback). */
export const SCRIPTED_ROUNDS: InterviewRound[] = ["case", "finance"];
/** Rounds drawn on the board (DesignRound panel). */
export const BOARD_ROUNDS: InterviewRound[] = ["design", "challenge"];
/** AI calls per session (questions + hints + feedback); one is always kept for feedback. */
export const MAX_SESSION_TURNS = 12;
export const MAX_TURNS = 8;
export const MAX_QUESTION_CHARS = 400;
export const MAX_ANSWER_CHARS = 1200;
export const MAX_CODE_CHARS = 4000;
export const MAX_RESUME_CONTEXT_CHARS = 1500;
export const MAX_CONTEXT_FIELD = 120; // company, role
export const MAX_SESSIONS = 20;

/** What the interviewer knows. description capped at MAX_JOB_CHARS, resume at MAX_RESUME_CONTEXT_CHARS. */
export interface InterviewContext {
  company: string | null;
  role: string | null;
  description: string | null;
  resume: string | null;
  field: Field | null;
  /** Portfolio round (Tier 4): http(s) links the user typed. Only shown and sent as text; never fetched. */
  links?: string[];
  /** v2 company-style preset (lib/tiers/presets.ts). Absent on older sessions. */
  preset?: import("./presets").PresetId;
}
export const MAX_LINKS = 5;
export const MAX_LINK_CHARS = 200;

export interface InterviewTurn {
  question: string;
  answer: string;
}

export type CodeLanguage = "python" | "javascript" | "typescript" | "sql";
/** Latest coding attempt; passed/total come from local deterministic grading only. */
export interface CodeAttempt {
  problemId: string;
  language: CodeLanguage;
  code: string;
  passed: number;
  total: number;
}

export interface CodeStats {
  /** "Run examples" presses before the first Submit. */
  runsBeforeSubmit: number;
  submits: number;
  /** ms timestamp of the first Submit, or null. */
  firstSubmitAt: number | null;
}

export interface StarCheck {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
}
export interface AnswerFeedback {
  /** Index into session.turns. */
  index: number;
  strength: string;
  improve: string;
  /** Verbatim from that turn's answer (quoteIsReal), else null. */
  quote: string | null;
  /** Behavioral only; null for other rounds. */
  star: StarCheck | null;
}
export interface InterviewFeedback {
  summary: string;
  items: AnswerFeedback[];
}

export interface InterviewSession {
  id: string;
  round: InterviewRound;
  context: InterviewContext;
  /** Answered questions, in order. */
  turns: InterviewTurn[];
  /** The question waiting for an answer, or null. */
  pending: string | null;
  /** AI calls made so far in this session. */
  used: number;
  /** Seed for the local first question / problem / design prompt pick. */
  seed: number;
  /** Coding round: problem id (set at creation) and latest attempt. */
  problemId: string | null;
  code: CodeAttempt | null;
  /** Design round: latest board. */
  board: BoardJson | null;
  /** Coding round: hints received, oldest first (applyReply pushes hint text here). */
  hints: string[];
  /** Coding/debugging rounds (v2): counted by the app, feeds the scorecard. Absent on older sessions. */
  stats?: CodeStats;
  feedback: InterviewFeedback | null;
  status: "active" | "done";
  createdAt: number;
  updatedAt: number;
}

export type InterviewAsk = "question" | "hint" | "feedback";

/** POST /api/interview. */
export interface InterviewRequest {
  ask: InterviewAsk;
  round: InterviewRound;
  context: InterviewContext;
  /** Answered turns (<= MAX_TURNS). For "question", the next question follows the last answer. */
  turns: InterviewTurn[];
  /** session.used before this call; server rejects >= MAX_SESSION_TURNS. */
  used: number;
  code: CodeAttempt | null;
  board: BoardJson | null;
  /** Coding round: the problem prompt (hint/feedback need it). */
  problem: string | null;
  /** Challenge feedback only: the CHALLENGE_MINUTES timer had run out. */
  timeUp?: boolean;
}
/** question/hint -> text; feedback -> feedback. */
export type InterviewReply = { text: string; feedback: null } | { text: null; feedback: InterviewFeedback };
export type InterviewResponse = ApiResponse<InterviewReply>;

// lib/tiers/interview.ts exports (engine-builder):
//   newSession(round, context, opts: { id: string; now: number; seed: number }): InterviewSession  // pending = firstQuestion(...)
//   firstQuestion(round, context, seed): string                     // local, no AI
//   answerPending(s, answer, now): InterviewSession                 // pending -> turns, pending = null
//   nextStep(s): "answer" | "ask" | "feedback" | "done"            // answer: pending set; ask: AI follow-up allowed; feedback: time to get feedback
//   canCall(s, ask): boolean                                        // respects MAX_SESSION_TURNS, keeps 1 for feedback; hint only coding
//   buildRequest(s, ask): InterviewRequest                         // problem = getProblem(s.problemId)?.prompt
//   applyReply(s, ask, reply, now): InterviewSession                // used+1; question -> pending; hint -> hints.push; feedback -> status done
//   validateFeedback(raw: unknown, turns: InterviewTurn[], round): InterviewFeedback | null
//   loadSessions(): InterviewSession[]; saveSession(s): void; removeSession(id): void   // KEYS.interviews, max MAX_SESSIONS
// Tier 4 additions to lib/tiers/interview.ts:
//   CHALLENGE_PROMPTS: string[]; PORTFOLIO_FIRST: string                // made up
//   answerPending in a SCRIPTED round sets pending to the next scripted question (scriptFor) until the script ends
//   canCall(s, "question") is false for SCRIPTED_ROUNDS and coding
//   buildRequest sends board for BOARD_ROUNDS, context.links (capped MAX_LINKS x MAX_LINK_CHARS) when present
//   challengeLeft(s, now): number   // ms left of CHALLENGE_MINUTES from s.createdAt, never below 0
//   cleanLinks(raw: string): string[] // split on whitespace/newlines, keep http(s) URLs only, <= MAX_LINK_CHARS, dedupe, first MAX_LINKS

// ---------- Tier 4: scripted rounds (case, finance) ----------

export const CHALLENGE_MINUTES = 20;

/** How an answer is checked in code. number: the LAST number in the answer vs expected (absolute tolerance). */
export type AnswerCheck =
  | { kind: "number"; expected: number; tolerance: number; unit: "$" | "%" | "" }
  | { kind: "rubric"; points: { label: string; any: string[] }[] };
export interface ScriptedQuestion {
  id: string;
  prompt: string;
  check: AnswerCheck | null;
}
export type CheckResult =
  | {
      kind: "number";
      found: number | null; // in `foundUnit` (0.075 for a percent question reads as 7.5 "%", bps as percent)
      expected: number;
      correct: boolean;
      unit: "$" | "%" | ""; // the question's unit
      // Added for Bug C (all optional so older results still type-check):
      foundUnit?: "$" | "%" | "bps" | "x" | ""; // the unit the user's own number is in
      unitMismatch?: boolean; // the user gave an explicit unit the question does not ask for
      note?: string; // "We read 0.075 as 7.5%", "We used the midpoint of your range ..."
      message?: string; // why it is not correct when unitMismatch
      read?: string; // the user's number in the user's unit, e.g. "$1,200,000"
      range?: [number, number]; // the ends of a range answer
    }
  | { kind: "rubric"; covered: string[]; missed: string[] };
// lib/tiers/scripted.ts exports (engine-builder):
//   CASES: { id: string; title: string; questions: ScriptedQuestion[] }[]   // >= 4 made-up cases, 3 questions each: structure (rubric), math (number), recommendation (rubric)
//   FINANCE_BANK: ScriptedQuestion[]                                         // >= 12 made-up accounting/valuation questions, >= 5 numeric
//   scriptFor(round, seed): ScriptedQuestion[] | null   // case -> one case's questions; finance -> 4 distinct bank questions; other rounds null. Deterministic.
//   findQuestion(prompt: string): ScriptedQuestion | null   // exact prompt match across CASES and FINANCE_BANK
//   extractNumber(answer: string): number | null   // the stated answer (cue phrase > "=" / "so" > "about" > last), ranges -> midpoint, number words; handles $, commas, %, k/m/million/billion, negatives, decimals
//   checkAnswer(check: AnswerCheck, answer: string): CheckResult
//   checkTurn(turn: InterviewTurn): CheckResult | null   // findQuestion(turn.question)?.check -> checkAnswer
//   describeCheck(r: CheckResult): string   // one plain line for the AI prompt and the UI, e.g. "Final number 1500 vs expected 1500: correct (checked by code)"

// ---------- Slice 12: coding ----------

export interface CodeTest {
  args: unknown[];
  expected: unknown;
}
export interface CodingProblem {
  id: string;
  title: string;
  /** Shown to the user; also the interview question. */
  prompt: string;
  functionName: string;
  starter: Record<"python" | "javascript", string> & Partial<Record<CodeLanguage, string>>; // v2 languages are optional
  /** Shown with input/expected/got. */
  examples: CodeTest[];
  /** Never shown: only the pass count. */
  tests: CodeTest[];
}
/** One case's outcome from a runner worker. */
export type CaseOutput = { ok: true; value: unknown } | { ok: false; error: string };
export type RunResult =
  | { ok: true; outputs: CaseOutput[]; logs: string }
  | { ok: false; reason: "timeout" | "load" | "error"; message: string };
export interface GradeResult {
  passed: number;
  total: number;
  /** Per case pass/fail, same order as the cases. */
  results: boolean[];
}
// lib/tiers/problems.ts exports (engine-builder):
//   PROBLEMS: CodingProblem[]; getProblem(id): CodingProblem | null; pickProblem(seed): CodingProblem
//   sameValue(a, b): boolean; gradeOutputs(cases: CodeTest[], outputs: CaseOutput[]): GradeResult
// lib/tiers/runner.ts exports (ui-builder):
//   runCode(language, code, functionName, cases: unknown[][]): Promise<RunResult>; stopRunners(): void
// Worker protocol (public/workers/{js,py}-runner.js):
//   in  { code: string, functionName: string, cases: unknown[][] }
//   out { type: "ready" } (python, after load) | { type: "result", outputs: CaseOutput[], logs: string } | { type: "error", message: string }

// ---------- Slice 13: system design board ----------

export type BoardKind = "client" | "server" | "database" | "cache" | "queue" | "storage" | "service" | "screen" | "other";
export const BOARD_KINDS: { id: BoardKind; label: string }[] = [
  { id: "client", label: "Client" },
  { id: "server", label: "Server" },
  { id: "database", label: "Database" },
  { id: "cache", label: "Cache" },
  { id: "queue", label: "Queue" },
  { id: "storage", label: "File storage" },
  { id: "service", label: "Service" },
  { id: "screen", label: "Screen" }, // Tier 4 design challenge (user flows)
  { id: "other", label: "Other" },
];
export const BOARD_W = 960;
export const BOARD_H = 600;
export const NODE_W = 140;
export const NODE_H = 56;
export const MAX_NODES = 30;
export const MAX_EDGES = 60;
export const MAX_NODE_LABEL = 40;
export const MAX_EDGE_LABEL = 30;

export interface BoardNode {
  id: string;
  kind: BoardKind;
  label: string;
  /** Top-left corner, clamped to [0, BOARD_W - NODE_W] x [0, BOARD_H - NODE_H]. */
  x: number;
  y: number;
}
export interface BoardEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}
export interface Board {
  nodes: BoardNode[];
  edges: BoardEdge[];
}
/** Compact wire/storage form. */
export interface BoardJson {
  n: [id: string, kind: BoardKind, label: string, x: number, y: number][];
  e: [from: string, to: string, label: string][];
}
// lib/tiers/board.ts exports (engine-builder):
//   emptyBoard(): Board
//   addNode(b, kind, label?): { board: Board; id: string }   // ids n1, n2...; placed on a free grid slot
//   moveNode(b, id, dx, dy): Board; setNodePosition(b, id, x, y): Board; renameNode(b, id, label): Board
//   removeNode(b, id): Board; connect(b, from, to, label?): Board; removeEdge(b, id): Board
//   toJson(b): BoardJson; fromJson(raw: unknown): Board | null; describe(b): string

// ---------- Round panels (components/tiers/interview/CodingRound.tsx, DesignRound.tsx) ----------

export interface RoundPanelProps {
  session: InterviewSession;
  /** Persist an updated session (the shell saves it to is:interviews). */
  onUpdate: (s: InterviewSession) => void;
  /** Calls /api/interview for `s` (buildRequest + applyReply + save are done by the shell). Null = failed; the shell shows the message. */
  ask: (s: InterviewSession, ask: InterviewAsk) => Promise<InterviewSession | null>;
  /** True while a call is in flight. */
  busy: boolean;
}
