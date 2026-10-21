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
