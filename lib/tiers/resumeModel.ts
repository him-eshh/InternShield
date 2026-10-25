// Structure-preserving resume model (brief R1). Pure: parsers hand over raw rows, this groups them
// into sections and bullets without losing order, headings or positions.
import { isHeader } from "./tailored";
import type { LineBox, ResumeDoc, ResumeLine, ResumeSection, ResumeSource } from "./resumeTypes";

/** A visual row from a parser, before bullets are joined and sections are built. */
export interface RawRow {
  text: string;
  pageIndex: number;
  box?: LineBox;
  paragraph?: number;
  /** DOCX list paragraph: a bullet even when the glyph comes from numbering.xml. */
  listItem?: boolean;
  /** x where the body text starts, to tell wrapped bullet rows from new lines (PDF). */
  bodyX?: number;
}

const MARKER = /^([•●▪◦‣·–\-*])\s+/;
const MARKER_ONLY = /^[•●▪◦‣·]$/;

/** Splits "• Built X" into the glyph and the words. A lone "-" or "*" needs a space after it. */
export function splitMarker(text: string): { marker?: string; body: string } {
  const m = text.match(/^([•●▪◦‣·])\s*/) ?? text.match(MARKER);
  if (!m) return { body: text };
  return { marker: m[1], body: text.slice(m[0].length) };
}

export function docLines(doc: ResumeDoc): ResumeLine[] {
  return doc.sections.flatMap((s) => s.lines);
}

/** The document as plain text: one row per line, bullet glyphs restored. Round-trip target. */
export function docText(doc: ResumeDoc): string {
  return docLines(doc)
    .map((l) => (l.marker ? `${l.marker} ${l.text}` : l.text))
    .join("\n");
}

/** Index of the section a line sits in, by id. */
export function sectionOf(doc: ResumeDoc, lineId: string): ResumeSection | undefined {
  return doc.sections.find((s) => s.lines.some((l) => l.id === lineId));
}

/**
 * Rows -> lines -> sections. A bullet's wrapped rows join into one line with one box per row.
 * Blank rows are dropped; the original reading order is kept.
 */
export function buildDoc(rows: RawRow[], pageCount: number, source: ResumeSource, pageCountEstimated?: boolean): ResumeDoc {
  const lines: ResumeLine[] = [];
  let lastBodyX: number | null = null;
  let lastY: number | null = null;
  for (const row of rows) {
    const raw = row.text.replace(/[ \t ]+/g, " ").trim();
    if (!raw) continue;
    const { marker, body } = splitMarker(raw);
    const prev = lines[lines.length - 1];
    const heading = !marker && !row.listItem && isHeader(raw);

    // Wrapped bullet row: same body indent as the bullet above, no marker, just below it.
    const continues =
      prev?.kind === "bullet" &&
      !marker &&
      !row.listItem &&
      !heading &&
      row.box !== undefined &&
      prev.boxes !== undefined &&
      row.bodyX !== undefined &&
      lastBodyX !== null &&
      lastY !== null &&
      Math.abs(row.bodyX - lastBodyX) <= 2 &&
      lastY - row.box.y > 0 &&
      lastY - row.box.y <= row.box.h * 1.9 &&
      row.pageIndex === prev.pageIndex;
    if (continues && prev && row.box) {
      prev.text = `${prev.text} ${raw}`;
      prev.boxes!.push(row.box);
      lastY = row.box.y;
      continue;
    }

    const line: ResumeLine = {
      id: `l${lines.length}`,
      text: marker || !MARKER_ONLY.test(raw) ? body : raw,
      kind: heading ? "heading" : marker || row.listItem ? "bullet" : "text",
      pageIndex: row.pageIndex,
    };
    if (marker) line.marker = marker;
    else if (row.listItem) line.marker = "•";
    if (row.box) line.boxes = [row.box];
    if (row.paragraph !== undefined) line.paragraph = row.paragraph;
    lines.push(line);
    lastBodyX = row.bodyX ?? null;
    lastY = row.box?.y ?? null;
  }

  const sections: ResumeSection[] = [];
  let cur: ResumeSection = { heading: "", lines: [] };
  for (const l of lines) {
    if (l.kind === "heading") {
      if (cur.lines.length || cur.heading) sections.push(cur);
      cur = { heading: l.text.replace(/:$/, ""), lines: [l] };
    } else cur.lines.push(l);
  }
  if (cur.lines.length || cur.heading) sections.push(cur);
  return { sections, pageCount, source, ...(pageCountEstimated ? { pageCountEstimated } : {}) };
}

/** Plain pasted resume text -> the same model (one page, no boxes). */
export function parseTextResume(text: string): ResumeDoc {
  const rows: RawRow[] = text.split(/\r?\n/).map((t) => ({ text: t, pageIndex: 0 }));
  return buildDoc(rows, 1, "text");
}
