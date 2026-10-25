// Shared contracts. Owned by the orchestrator: workers read, never edit.
// Spec ref: spec.md > Data Model.

/** A plain JSON object (not null, not an array). The one shared guard for untrusted input. */
export type Rec = Record<string, unknown>;
export const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

// ---------- Profile (localStorage, values JSON-encoded) ----------
// Keys: "is:profile" -> Profile, "is:resume" -> ResumeData, "is:theme" -> Theme

export type Field = "tech" | "business" | "finance" | "design" | "other";
export type UserLevel = "freshman" | "sophomore" | "junior" | "senior" | "grad" | "new_grad";
export interface Profile {
  field: Field;
  level: UserLevel;
  skills: string[];
}
export interface ResumeData {
  text: string; // capped ~20,000 chars
  fileName: string;
}
export type Theme = "system" | "light" | "dark";

// ---------- Check form ----------
export type Source = "company_site" | "linkedin" | "handshake" | "email" | "text_whatsapp";
export type Stage = "message" | "interviewing" | "offer" | "signed";

// ---------- Facts (Groq strict schema output, after Quote Check) ----------
export interface Quoted {
  value: string;
  quote: string; // exact text from the message, <= 200 chars
}
export type AskKind =
  | "pay_fee"
  | "buy_equipment"
  | "deposit_check"
  | "gift_cards"
  | "crypto_or_task_deposit"
  | "reship_or_forward"
  | "run_code_or_install"
  | "money_wrong_way" // candidate sends money onward, keeps a cut, uses their own account, or pays to withdraw
  | "sensitive_data"
  | "reply_yes"
  | "other";
export type InterviewStatus = "mentioned" | "none_hired_directly" | "unclear";

export interface Facts {
  isJobMessage: boolean;
  company: Quoted | null;
  department?: string | null; // team/office name ("Campus Recruiting"), never the company
  role: Quoted | null;
  pay: Quoted | null;
  sender: { name: string | null; email: string | null; phone: string | null };
  asks: { kind: AskKind; quote: string }[];
  offPlatform: { app: string; quote: string } | null;
  pressure: { quote: string }[];
  interview: { status: InterviewStatus; quote: string | null };
  dutiesVague: { quote: string } | null;
  noExperienceNeeded: { quote: string } | null;
  employerCountryHint: string | null;
  otherConcerns: { text: string; quote: string }[]; // max 3
}

// ---------- Step results ----------
export type FailReason = "timeout" | "limit" | "error";
export type SkipReason = `needs step ${number}` | "missing input";
export type StepResult<T> =
  | { status: "done"; data: T }
  | { status: "failed"; reason: FailReason; retryAfter?: number; code?: ApiErrorCode } // retryAfter in seconds
  | { status: "skipped"; reason: SkipReason };

/** Step 2. null data = search ran but no official site identified. */
export interface CompanyData {
  officialDomain: string; // registrable domain, e.g. "acme.com"
  careersUrl: string | null;
}

/** Step 3. Each sub-check is null when it couldn't run (or doesn't apply). */
export interface SenderData {
  email: string;
  domain: string; // registrable domain of the email, e.g. "acme.co.uk"
  freeEmail: boolean; // gmail.com, outlook.com, ...
  registeredAt: string | null; // ISO date from RDAP; null = couldn't check or free email
  hasMx: boolean | null; // null = couldn't check
  hunter: { pattern: string | null; webmail: boolean; disposable: boolean } | null; // null = no key / failed
}

/** Step 4. */
export interface PostingData {
  found: boolean;
  url: string | null;
  title: string | null;
  location: string | null;
  pay: string | null;
  postedDate: string | null;
  onOfficialDomain: boolean;
}

export interface StepResults {
  extract: StepResult<Facts>;
  company: StepResult<CompanyData | null>;
  sender: StepResult<SenderData>;
  posting: StepResult<PostingData>;
}

// ---------- Quick questions ----------
// Findings 02 > 4.1. Ids are stable: the UI keys on them across answers.
export type QuestionId = "asked_to_do" | "who_first" | "channel" | "talked_live" | "signed_offer";
export type YesNo = "yes" | "no" | "unknown"; // "unknown" = "Not sure"
export type AskedTo = "pay" | "deposit_check" | "crypto" | "run_file" | "share_data";
export interface Answers {
  asked_to_do?: AskedTo[] | "none" | "unknown"; // multi-select; an empty pick is "none"
  who_first?: YesNo; // "Did you apply for this job first?"
  channel?: "email" | "linkedin" | "handshake" | "text_whatsapp" | "other";
  talked_live?: "video" | "phone" | "chat_only" | "not_yet";
  signed_offer?: YesNo;
}
export interface Question {
  id: QuestionId;
  text: string;
  options: { value: string; label: string }[]; // always includes { value: "unknown", label: "Not sure" }
  kind?: "single" | "multi"; // default "single"
  couldChange?: { level?: boolean; critical?: boolean; advice?: boolean }; // what an answer could move
}

// ---------- Scoring ----------
export interface ScoreInput {
  text: string; // raw message (backstop scans this)
  facts: Facts | null; // null when extract failed
  steps: StepResults;
  profile: Profile | null;
  resumeText: string | null;
  source: Source | null; // pill; null = not picked
  stage: Stage | null;
  answers: Answers;
  form: { sender: string | null; company: string | null }; // user-entered/auto-filled fields
}

export type FlagGroup = "sender" | "message" | "offer";
export type FlagKind = "red" | "good";
export interface Flag {
  id: string; // stable, e.g. "deposit_check", "lookalike_domain"
  group: FlagGroup;
  kind: FlagKind;
  title: string; // short, plain English
  quote: string | null; // verified quote from the message, if any
  why: string; // one plain-English line
  points: number; // positive for red, negative for good
  critical: boolean;
  sourceUrl?: string;
  severity?: "critical" | "high" | "medium" | "low";
  action?: string; // one verification step the user can take
  learnMore?: { label: string; url: string };
}

export type LinkIssue = "lookalike" | "punycode" | "shortener" | "google-form" | "raw-ip" | "new-domain" | "brand-careers-offsite";
/** One link found in the message and what's wrong with it (empty issues = nothing found). */
export interface LinkCheck {
  url: string;
  host: string;
  issues: LinkIssue[];
}

export type RiskLevel = "low" | "medium" | "high"; // 0-24 / 25-59 / 60-100
export const LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "No red flags found",
  medium: "Some warning signs",
  high: "Strong signs of a scam",
};

export interface MatchRow {
  row: "company" | "role" | "pay" | "contact";
  message: string | null; // what the message says
  posting: string | null; // what the posting / official site says
  ok: boolean | null; // true = green check, false = amber warning, null = not listed
}

export interface Report {
  score: number; // 0-100
  level: RiskLevel;
  flags: Flag[];
  groups: Record<FlagGroup, Flag[]>;
  couldntCheck: { check: string; reason: string }[];
  coverage: { ran: number; total: number; missingImportant: string[] };
  questions: Question[];
  postingMatch: MatchRow[] | null; // null when no posting found
  thinMessage: boolean; // "there wasn't much to check"
  confidence?: { level: "high" | "medium" | "low"; checked: number; total: number }; // "How sure"
  links?: LinkCheck[];
  questionHint?: string; // one line on why answering the questions helps
}

// ---------- API request/response shapes ----------
// Every route returns a StepResult-shaped body (never "skipped"):
//   200 { status: "done", data }  |  4xx/5xx { status: "failed", reason, retryAfter?, message?, code? }
/** Machine-readable failure cause; the UI picks its copy from this (routes adopt it). */
export type ApiErrorCode =
  | "RATE_LIMITED"
  | "DAILY_CAP"
  | "TIMEOUT"
  | "UPSTREAM"
  | "BAD_INPUT"
  | "TOO_LARGE"
  | "TRANSCRIBE_PARTIAL"
  | "TRANSCRIBE_FAILED"
  | "MODEL_UNAVAILABLE"
  | "NOT_FOUND"
  | "UNKNOWN";
export type ApiResponse<T> =
  | { status: "done"; data: T }
  | { status: "failed"; reason: FailReason; retryAfter?: number; message?: string; code?: ApiErrorCode };

export interface ExtractRequest {
  message: string; // <= 4,000 chars
  sender: string | null;
  company: string | null;
}
export type ExtractResponse = ApiResponse<Facts>;

export interface CompanyRequest {
  company: string;
}
export type CompanyResponse = ApiResponse<CompanyData | null>;

export interface SenderRequest {
  email: string;
}
export type SenderResponse = ApiResponse<SenderData>;

export interface PostingRequest {
  company: string;
  role: string | null;
  officialDomain: string;
}
export type PostingResponse = ApiResponse<PostingData>;

export interface ExplainRequest {
  level: RiskLevel;
  flags: { title: string; quote: string | null; why: string }[]; // max 6, never the raw message
}
export type ExplainResponse = ApiResponse<{ text: string; source: "ai" | "fallback" }>;

export const MAX_MESSAGE_CHARS = 4000;
