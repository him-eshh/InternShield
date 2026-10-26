// Tier 2-4 shared contracts (devpost/tier2-spec.md, tier3-spec.md, tier4-spec.md). Read-only to workers: report needed changes.
import type { ApiResponse, Field, RiskLevel, UserLevel } from "../types";

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
  /** 3 = three options in one strict-JSON call plus heldBack. Missing = one plain rewrite. */
  count?: 1 | 3;
  /** Terms the user confirmed ("I have this"), at most MAX_FACTS of MAX_FACT_CHARS each. */
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
  // Optional ( missing = not sent, the server adds no line)
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
/** options: up to 3 alternative rewrites; heldBack: posting terms the model left out because the line doesn't support them. */
export type RewriteResponse = ApiResponse<{ text: string; options?: string[]; heldBack?: string[] }>;

// ---------- keyword gap (job posting terms vs resume) ----------
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
/** tier: "block" = never show, "check" = show with a warning, "ok" = clean. */
export type GuardTier = "block" | "check" | "ok";
export type GuardResult = { ok: true; tier?: GuardTier } | { ok: false; issues: GuardIssue[]; tier?: GuardTier };
/** Soft warnings (Check tier): stronger verb, dropped qualifier, new scope/seniority word, buzzword. */
export type GuardWarningKind = "inflated" | "qualifier" | "scope" | "seniority" | "buzzword";
export interface GuardWarning {
  kind: GuardWarningKind;
  token: string;
  /** inflated: the original's weaker verb, when there was one. */
  was?: string;
}
export interface GuardReport {
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

// ---------- Slice 9: tracker ----------

export type TrackerColumn = "saved" | "applied" | "interviewing" | "interviewed";
export const TRACKER_COLUMNS: { id: TrackerColumn; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "interviewed", label: "Interviewed" },
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
  /** Optional user-pasted job posting text; not fetched from the link. */
  description: string | null;
  notes: string;
  createdAt: number;
}
/** What "Save to tracker" on a report hands the tracker. */
export type NewCard = Pick<TrackerCard, "company" | "role" | "link" | "risk">;

// ---------- Slice 10: screenshot ----------

/** Max total data-URL length per transcribe request (all strips). Under guard.ts's 3.6 MiB body cap. */
export const MAX_IMAGE_DATA_URL = 3_500_000;

export type TranscribeResponse = ApiResponse<{ text: string; partial?: boolean }>;

// ---------- Tier 3: mock interview ----------

export type InterviewRound = "screen" | "behavioral" | "coding" | "design" | "case" | "portfolio" | "debugging" | "sql";
/** Rounds graded by running code locally (one local problem, hints allowed, no AI questions). */
export const CODE_ROUNDS: InterviewRound[] = ["coding", "debugging", "sql"];

// ---------- scorecard and company-style presets ----------
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
  { id: "portfolio", label: "Portfolio walkthrough", field: "design" },
];
export const roundLabel = (r: InterviewRound): string => INTERVIEW_ROUNDS.find((x) => x.id === r)?.label ?? r;
/** Questions per round, including the local first question. */
export const QUESTIONS_PER_ROUND: Record<InterviewRound, number> = {
  screen: 4,
  behavioral: 4,
  coding: 1,
  design: 3,
  case: 3,
  portfolio: 4,
  debugging: 1,
  sql: 1,
};
/** Rounds whose questions all come from a local script (no AI questions; AI only for feedback). */
export const SCRIPTED_ROUNDS: InterviewRound[] = ["case"];
/** AI calls per session (questions + hints + feedback); one is always kept for feedback. */
export const MAX_SESSION_TURNS = 12;
export const MAX_TURNS = 8;
export const MAX_QUESTION_CHARS = 400;
export const MAX_ANSWER_CHARS = 1200;
export const MAX_CODE_CHARS = 4000;
export const MAX_RESUME_CONTEXT_CHARS = 1500;
export const MAX_CONTEXT_FIELD = 120; // company, role

/** What the interviewer knows. description capped at MAX_JOB_CHARS, resume at MAX_RESUME_CONTEXT_CHARS. */
export interface InterviewContext {
  company: string | null;
  role: string | null;
  description: string | null;
  resume: string | null;
  field: Field | null;
  /** Student level from the optional profile; absent on older saved sessions. */
  level?: UserLevel | null;
  /** Company-style preset (lib/tiers/presets.ts). Absent on older sessions. */
  preset?: import("./presets").PresetId;
}

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
  /** Shown with the results after Finish: the first hidden test that failed (code) or the first differing rows (SQL). Not sent to the model. */
  detail?: { failed?: { input: string; expected: string; got: string }; diffs?: string[]; message?: string };
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
  /** Coding round: hints received, oldest first (Practice pushes hint text here). */
  hints: string[];
  /** Coding/debugging rounds: counted by the app, feeds the scorecard. Absent on older sessions. */
  stats?: CodeStats;
  editorDraft?: { language: CodeLanguage; code: string; approach: string };
  plannedQuestions?: number;
  feedback: InterviewFeedback | null;
  status: "active" | "done";
  createdAt: number;
  updatedAt: number;
}

/** "review" (practice sessions): feedback on the last turn plus an optional follow-up question, in one call. */
export type InterviewAsk = "question" | "hint" | "feedback" | "review";
/** AI calls per practice session (reviews + hints + AI questions). */
export const MAX_PRACTICE_CALLS = 30;
export const MAX_FOLLOWUPS = 2;

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
  /** Coding round: the problem prompt (hint/feedback need it). */
  problem: string | null;
  /** Practice: lifts the call cap to MAX_PRACTICE_CALLS. */
  practice?: boolean;
  /** review only: follow-ups still allowed for this question (0-2). */
  followUpsLeft?: number;
}
/** question/hint -> text; feedback -> feedback. */
export type AnswerLevel = "strong" | "ok" | "weak";
export type InterviewReply =
  | { text: string; feedback: null }
  | { text: null; feedback: InterviewFeedback; followUp?: string | null; level?: AnswerLevel };
export type InterviewResponse = ApiResponse<InterviewReply>;

// ---------- Scripted rounds (case) ----------

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
//   findQuestion(prompt: string): ScriptedQuestion | null   // exact prompt match across CASES
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
  starter: Record<"python" | "javascript", string> & Partial<Record<CodeLanguage, string>>; // the other languages are optional
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

// ---------- Round panels (components/tiers/interview/CodingRound.tsx, SqlRound.tsx) ----------

export interface RoundPanelProps {
  initialLanguage?: CodeLanguage;
  runnableLanguages?: CodeLanguage[];
  session: InterviewSession;
  /** Persist an updated session (Practice saves the whole session). */
  onUpdate: (s: InterviewSession) => void;
  /** Calls /api/interview for `s` (Practice builds the request and applies the reply). Null = failed; the shell shows the message. */
  ask: (s: InterviewSession, ask: InterviewAsk) => Promise<InterviewSession | null>;
  /** True while a call is in flight. */
  busy: boolean;
  /** Practice sessions: skips this question (shown next to Hint). */
  onSkip?: () => void;
}

// ---------- continuous practice sessions + question bank (interview stream owns after setup) ----------
export type RoundKind = InterviewRound;
export type SessionLanguage = "python" | "typescript" | "sql" | "java" | "cpp" | "go" | "javascript";

/** What the user picked before starting: one session runs several rounds back to back until `limit` is hit. */
export interface SessionConfig {
  rounds: RoundKind[];
  /** Topic tags (e.g. "arrays", "leadership"); empty = any. */
  topics: string[];
  /** Questions the user typed in; asked before generated ones. */
  customQuestions: string[];
  difficulty: "easy" | "medium" | "hard" | "mixed";
  /** CompanyPreset id (lib/tiers/presets.ts). */
  companyPreset?: string;
  company?: string;
  role?: string;
  /** Coding bank questions: take the questions most often asked (at `company` when set) before the rest. */
  mostAsked?: boolean;
  language: SessionLanguage;
  limit: { kind: "questions" | "rounds"; count: number };
}

/** One asked question and what happened to it. */
export interface SessionTurn {
  round: RoundKind;
  question: string;
  /** Where the question came from: a bank id, "custom", or "ai". */
  source: string;
  answer: string;
  /** Code rounds: local grading result. */
  code?: CodeAttempt;
  stats?: CodeStats;
  hintsUsed: number;
  skipped: boolean;
  feedback?: AnswerFeedback;
  /** Bank/app metadata for the recap, and follow-ups asked after the main answer. */
  title?: string;
  problemId?: string;
  url?: string;
  difficulty?: string;
  tags?: string[];
  level?: AnswerLevel;
  followUps?: { question: string; answer: string; note?: string }[];
  startedAt: number;
  endedAt: number | null;
}

/** End-of-session summary (the celebration screen). */
export interface SessionSummary {
  /** Current grounded summary; absent on older saved sessions with model-written claims. */
  grounded?: true;
  config: SessionConfig;
  turns: SessionTurn[];
  answered: number;
  skipped: number;
  /** Per-round band, rules-graded where possible. */
  rounds: { round: RoundKind; band: ScoreBand | "Not scored"; note: string; axes?: Scorecard["axes"] }[];
  /** 2-3 concrete things to practice next. */
  next: string[];
  strengths?: string[];
  endedEarly?: boolean;
  durationMs: number;
}

/** A question-bank entry (data/question-bank/**). Links only to public problem pages; never scraped text. */
export interface BankQuestion {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  url: string;
  tags: string[];
  companies: string[];
  /** Dataset/list it came from (name + license), for attribution. */
  source: string;
}
