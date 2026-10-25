// v3 resume tailoring contracts (resume stream owns). The tool edits the user's own file in place:
// small, targeted line edits, never a regenerated resume.

export type ResumeSource = "pdf" | "docx" | "text";
export type PdfFamily = "Helvetica" | "Times" | "Courier";

/** One rendered row of a line in a PDF. Units are PDF points; `y` is the baseline, measured from the page bottom. */
export interface LineBox {
  pageIndex: number;
  x: number;
  y: number;
  w: number;
  /** Font size in points. */
  h: number;
  family: PdfFamily;
  bold: boolean;
  italic: boolean;
}

export interface ResumeLine {
  /** Stable within one parsed document: "l0", "l1", ... in reading order. */
  id: string;
  /** Text without the bullet marker. */
  text: string;
  kind: "bullet" | "text" | "heading";
  pageIndex: number;
  /** The bullet glyph that stood in front of `text`, kept so the round trip is exact. */
  marker?: string;
  /** True when the marker is literal paragraph text rather than DOCX numbering. */
  markerInText?: boolean;
  /** PDF: one box per visual row (a wrapped bullet has several). */
  boxes?: LineBox[];
  /** DOCX: index of the paragraph in word/document.xml. */
  paragraph?: number;
}

export type ResumeHighlight = ResumeLine & { glow?: boolean };

export interface ResumeSection {
  /** "" for the block above the first heading (name, contact). */
  heading: string;
  lines: ResumeLine[];
}

export interface ResumeDoc {
  sections: ResumeSection[];
  pageCount: number;
  source: ResumeSource;
  /** DOCX page counts are only known when the file says so; otherwise 1 is a guess. */
  pageCountEstimated?: boolean;
}

/** One proposed line change, shown as a word diff the user accepts or rejects. Never adds facts. */
export interface ResumeEdit {
  id: string;
  /** Resume section heading the line sits under, e.g. "EXPERIENCE". */
  section: string;
  /** `ResumeLine.id` of the bullet being rewritten. */
  lineId: string;
  /** Index of the line in the flattened document (`docLines`). */
  lineIndex: number;
  original: string;
  proposed: string;
  /** One short line: why this change fits the posting. */
  reason: string;
  /** Posting keywords this edit brings in. */
  keywords: string[];
  status: "pending" | "accepted" | "rejected";
}

/** What to lean on for this posting, with sources (company intel, the posting itself). */
export interface TailorPlan {
  emphasis: string[];
  keywords: string[];
  sources: { label: string; url: string }[];
  /** Required posting terms the resume does not show yet (candidates for "I have this"). */
  missing?: string[];
  /** True when company intel was capped or unavailable: the plan uses the job post only. */
  limited?: boolean;
}

export const MAX_EDITS = 6;
/** A proposed line may be at most this much longer than the original. */
export const LINE_GROWTH = 1.1;
/** The whole resume may grow by at most this much. */
export const TOTAL_GROWTH = 1.03;
