// Tier 2 shared contracts (devpost/tier2-spec.md). Read-only to workers: report needed changes.
import type { ApiResponse, RiskLevel } from "../types";

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
}
export type RewriteResponse = ApiResponse<{ text: string }>;

/** What the guard found that isn't in the original resume. Empty = allowed. */
export type GuardIssueKind = "number" | "proper_noun" | "skill";
export interface GuardIssue {
  kind: GuardIssueKind;
  token: string;
}
export type GuardResult = { ok: true } | { ok: false; issues: GuardIssue[] };
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

/** Max data-URL length the browser may send (after downscale/compress). */
export const MAX_IMAGE_DATA_URL = 2_500_000;
export const IMAGE_MAX_SIDE = 1600;

/** POST /api/transcribe. `image` is a data:image/(jpeg|png|webp);base64 URL. */
export interface TranscribeRequest {
  image: string;
}
export type TranscribeResponse = ApiResponse<{ text: string }>;
