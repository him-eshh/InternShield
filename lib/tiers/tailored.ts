// Accepted resume rewrites (is:tailored), keyed to a fingerprint of the resume text.
import { KEYS, readKey, writeKey } from "../client/storage";
import type { TailoredResume } from "./types";

const LONG = 600;

/** Break a line over 600 characters at sentence ends so each piece can be reworded. */
function splitLong(line: string): string[] {
  if (line.length <= LONG) return [line];
  const sentences = line.split(/(?<=[.!?]) +/);
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && (cur + " " + s).length > LONG) {
      out.push(cur);
      cur = s;
    } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

/** Lines of a resume: split on newlines, trimmed, blanks dropped, " • " joined bullets split. */
export function resumeLines(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(" • ");
    parts.forEach((p, i) => {
      const t = p.trim();
      if (!t) return;
      const piece = i > 0 && !/^[•\-*]/.test(t) ? `• ${t}` : t;
      out.push(...splitLong(piece));
    });
  }
  return out;
}

/** Small stable hash (djb2) of the text, as a string. */
export function resumeKey(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${(h >>> 0).toString(36)}-${text.length}`;
}

function valid(v: unknown): v is TailoredResume {
  if (!v || typeof v !== "object") return false;
  const t = v as Record<string, unknown>;
  return typeof t.resumeKey === "string" && Array.isArray(t.lines) && t.lines.every((l) => typeof l === "string") && typeof t.updatedAt === "number";
}

export function loadTailored(resumeText: string): string[] {
  const stored = readKey<unknown>(KEYS.tailored);
  if (valid(stored) && stored.resumeKey === resumeKey(resumeText) && stored.lines.length > 0) return stored.lines;
  return resumeLines(resumeText);
}

export function saveTailored(resumeText: string, lines: string[]): void {
  const value: TailoredResume = { resumeKey: resumeKey(resumeText), lines, updatedAt: Date.now() };
  writeKey(KEYS.tailored, value);
}

export function resetTailored(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(KEYS.tailored);
  } catch {
    /* ignore */
  }
}

// ---------- Which lines can be reworded ----------
// Only bullet/content lines are offered for rewording. Names, contact details, section headers
// (Education, Experience, ...) and role/date lines stay as they are.

export type LineKind = "contact" | "header" | "detail" | "content";

const BULLET = /^[•\-*●▪◦‣·–]\s*/;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const LINK = /(?:https?:\/\/|www\.|linkedin\.com|github\.com|\.(?:com|io|dev|me)\/)/i;
const HEADER_WORDS =
  /^(?:education|(?:work|professional|relevant|research|leadership)?\s*experience|projects?|(?:technical\s+)?skills|skills\s*(?:&|and)\s*\w+|leadership|activities|awards|honors|honors\s*(?:&|and)\s*awards|certifications?|summary|objective|profile|publications|volunteer(?:ing)?|involvement|(?:relevant\s+)?coursework|interests|languages|extracurriculars?)\s*:?$/i;
const DATE = /\b(?:19|20)\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+'?\d{2,4}\b|\bpresent\b/i;

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function isHeader(line: string): boolean {
  const t = line.trim();
  if (!t || BULLET.test(t)) return false;
  if (HEADER_WORDS.test(t)) return true;
  // SHORT ALL-CAPS lines ("EXPERIENCE", "SKILLS & TOOLS") read as headers too.
  const letters = t.replace(/[^a-z]/gi, "");
  return letters.length >= 3 && t.length <= 40 && words(t) <= 4 && t === t.toUpperCase() && !/\d/.test(t);
}

/** Classifies each resume line. Only "content" lines are offered for rewording. */
export function lineKinds(lines: string[]): LineKind[] {
  const firstHeader = lines.findIndex(isHeader);
  const hasBullets = lines.some((l) => BULLET.test(l.trim()));
  return lines.map((raw, i) => {
    const t = raw.trim();
    if (isHeader(t)) return "header";
    if (EMAIL.test(t) || (LINK.test(t) && words(t) <= 6) || (PHONE.test(t) && words(t) <= 6 && !BULLET.test(t))) return "contact";
    // The block above the first header is the name and contact details, unless it's a long summary.
    if ((firstHeader === -1 ? i === 0 : i < firstHeader) && words(t) <= 12 && !BULLET.test(t)) return "contact";
    if (BULLET.test(t)) return "content";
    // With bullets present, the non-bullet lines inside a section are role, school and date lines.
    if (hasBullets && (DATE.test(t) || words(t) <= 8)) return "detail";
    return "content";
  });
}

export interface ResumeSection {
  title: string;
  /** Indexes of the lines in this section (header excluded). */
  lines: number[];
}

/** Lines grouped under their section headers; lines above the first header go in "Top". */
export function resumeSections(lines: string[]): ResumeSection[] {
  const out: ResumeSection[] = [];
  let cur: ResumeSection = { title: "Top", lines: [] };
  lines.forEach((l, i) => {
    if (isHeader(l)) {
      if (cur.lines.length || cur.title !== "Top") out.push(cur);
      const t = l.trim().replace(/:$/, "");
      cur = { title: t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(), lines: [] };
    } else cur.lines.push(i);
  });
  if (cur.lines.length || cur.title !== "Top") out.push(cur);
  return out;
}

/** "• Built X" -> { prefix: "• ", body: "Built X" } so only the words go to the AI and the bullet survives. */
export function splitBullet(line: string): { prefix: string; body: string } {
  const m = line.match(/^\s*[•\-*●▪◦‣·–]\s*/);
  return m ? { prefix: line.slice(0, m[0].length), body: line.slice(m[0].length) } : { prefix: "", body: line };
}
