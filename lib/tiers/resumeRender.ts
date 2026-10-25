// Render accepted edits back into the user's own file (brief R4) and check the result is no longer.
import { applyDocxEdits } from "./resumeDocx";
import { docLines, docText } from "./resumeModel";
import { toWinAnsi } from "./pdf";
import { TOTAL_GROWTH, type LineBox, type ResumeDoc, type ResumeLine } from "./resumeTypes";

export const TOO_LONG = "Too long for this line";

export type Measure = (font: Pick<LineBox, "family" | "bold" | "italic">, size: number, text: string) => number;

/** Words wrapped into rows no wider than `maxW`; null when one word alone is wider. */
function wrap(text: string, maxW: number, width: (s: string) => number): string[] | null {
  const rows: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (width(w) > maxW) return null;
    const t = cur ? `${cur} ${w}` : w;
    if (cur && width(t) > maxW) {
      rows.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) rows.push(cur);
  return rows;
}

export interface Fit {
  size: number;
  rows: string[];
}

/**
 * Lays new text into the rows the old text used. Font size may shrink by at most 5%;
 * the text may not need more rows than the line had or be wider than its widest row.
 */
export function fitInBoxes(line: ResumeLine, text: string, measure: Measure): Fit | null {
  const boxes = line.boxes;
  if (!boxes?.length) return null;
  const maxW = Math.max(...boxes.map((b) => b.w));
  const font = boxes[0];
  const body = toWinAnsi(text);
  for (const f of [1, 0.975, 0.95]) {
    const size = font.h * f;
    const rows = wrap(body, maxW, (s) => measure(font, size, s));
    if (rows && rows.length <= boxes.length) return { size, rows };
  }
  return null;
}

export interface EditText {
  lineId: string;
  text: string;
}
export interface Rendered {
  bytes: Uint8Array;
  mime: string;
  ext: "pdf" | "docx" | "txt";
  pageCount: number;
  /** Edits that could not be placed; the line keeps its original text. */
  rejected: { lineId: string; reason: string }[];
}

async function renderPdf(doc: ResumeDoc, bytes: Uint8Array, edits: EditText[]): Promise<Rendered> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes.slice());
  const embedded = new Map<string, Awaited<ReturnType<typeof pdf.embedFont>>>();
  const keyOf = (b: Pick<LineBox, "family" | "bold" | "italic">) => `${b.family}|${b.bold}|${b.italic}`;
  const embed = async (b: Pick<LineBox, "family" | "bold" | "italic">) => {
    const name =
      b.family === "Times"
        ? b.bold ? (b.italic ? StandardFonts.TimesRomanBoldItalic : StandardFonts.TimesRomanBold) : b.italic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman
        : b.family === "Courier"
          ? b.bold ? (b.italic ? StandardFonts.CourierBoldOblique : StandardFonts.CourierBold) : b.italic ? StandardFonts.CourierOblique : StandardFonts.Courier
          : b.bold ? (b.italic ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaBold) : b.italic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica;
    embedded.set(keyOf(b), await pdf.embedFont(name));
  };
  // Embed up front so measuring stays synchronous.
  const lines = new Map(docLines(doc).map((l) => [l.id, l]));
  for (const e of edits) {
    const b = lines.get(e.lineId)?.boxes?.[0];
    if (b && !embedded.has(keyOf(b))) await embed(b);
  }
  const measure: Measure = (font, size, text) => embedded.get(keyOf(font))!.widthOfTextAtSize(text, size);

  const pages = pdf.getPages();
  const rejected: Rendered["rejected"] = [];
  for (const e of edits) {
    const line = lines.get(e.lineId);
    const fit = line ? fitInBoxes(line, e.text, measure) : null;
    if (!line || !line.boxes || !fit) {
      rejected.push({ lineId: e.lineId, reason: TOO_LONG });
      continue;
    }
    const font = embedded.get(keyOf(line.boxes[0]))!;
    line.boxes.forEach((box, i) => {
      const page = pages[box.pageIndex];
      if (!page) return;
      page.drawRectangle({ x: box.x - 1, y: box.y - box.h * 0.3, width: box.w + 2, height: box.h * 1.3, color: rgb(1, 1, 1) });
      const row = fit.rows[i];
      if (row) page.drawText(row, { x: box.x, y: box.y, size: fit.size, font, color: rgb(0, 0, 0) });
    });
  }
  return { bytes: await pdf.save({ useObjectStreams: false }), mime: "application/pdf", ext: "pdf", pageCount: pdf.getPageCount(), rejected };
}

/** The edited document as plain text (also the "text" source and the plain-text export). */
export function renderPlainText(doc: ResumeDoc, edits: EditText[]): string {
  const by = new Map(edits.map((e) => [e.lineId, e.text]));
  return docLines(doc)
    .map((l) => {
      const t = by.get(l.id) ?? l.text;
      return l.marker ? `${l.marker} ${t}` : t;
    })
    .join("\n");
}

/** Applies the edits to the original bytes. PDF: cover and redraw. DOCX: in place. Text: replace lines. */
export async function renderEdited(doc: ResumeDoc, original: Uint8Array | null, edits: EditText[]): Promise<Rendered> {
  if (doc.source === "pdf" && original) return renderPdf(doc, original, edits);
  if (doc.source === "docx" && original) {
    const lines = new Map(docLines(doc).map((l) => [l.id, l]));
    const list = edits.flatMap((e) => {
      const p = lines.get(e.lineId)?.paragraph;
      return p === undefined ? [] : [{ paragraph: p, text: e.text }];
    });
    const bytes = await applyDocxEdits(original, list);
    return { bytes, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx", pageCount: doc.pageCount, rejected: [] };
  }
  const bytes = new TextEncoder().encode(renderPlainText(doc, edits));
  return { bytes, mime: "text/plain;charset=utf-8", ext: "txt", pageCount: doc.pageCount, rejected: [] };
}

export interface LengthCheck {
  ok: boolean;
  pagesBefore: number;
  pagesAfter: number;
  charsBefore: number;
  charsAfter: number;
  /** Plain reasons, empty when ok. */
  problems: string[];
}

const charCount = (doc: ResumeDoc, by: Map<string, string>) => docLines(doc).reduce((n, l) => n + (by.get(l.id) ?? l.text).length, 0);

/** Fails loudly: more pages, a rejected overflow, or more than 3% more characters. */
export function lengthCheck(doc: ResumeDoc, edits: EditText[], rendered: Pick<Rendered, "pageCount" | "rejected">): LengthCheck {
  const by = new Map(edits.map((e) => [e.lineId, e.text]));
  const charsBefore = charCount(doc, new Map());
  const charsAfter = charCount(doc, by);
  const problems: string[] = [];
  if (rendered.pageCount > doc.pageCount) problems.push("More pages than your original");
  if (rendered.rejected.length) problems.push(TOO_LONG);
  if (charsAfter > charsBefore * TOTAL_GROWTH) problems.push("Longer than your original");
  return { ok: problems.length === 0, pagesBefore: doc.pageCount, pagesAfter: rendered.pageCount, charsBefore, charsAfter, problems };
}

export { docText };
