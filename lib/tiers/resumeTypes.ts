// v3 resume tailoring contracts (resume stream owns after setup).

/** One proposed line change, shown as a word diff the user accepts or rejects. Never adds facts. */
export interface ResumeEdit {
  id: string;
  /** Resume section heading the line sits under, e.g. "EXPERIENCE". */
  section: string;
  /** Index of the line in the original resume text. */
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
}
