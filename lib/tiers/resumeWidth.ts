// Standard-font width checks shared by the API and browser, using the same fitter as export.
import type { ResumeDoc, ResumeEdit, LineBox } from "./resumeTypes";
import { docLines } from "./resumeModel";
import { fitInBoxes, type Measure } from "./resumeRender";

export function attachResumeBoxes(doc: ResumeDoc, value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > 60) return false;
  const lines = new Map(docLines(doc).map((l) => [l.id, l]));
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || typeof item.lineId !== "string" || seen.has(item.lineId)) return false;
    const line = lines.get(item.lineId);
    if (!line || line.kind !== "bullet" || !Array.isArray(item.boxes) || !item.boxes.length || item.boxes.length > 12) return false;
    for (const box of item.boxes) {
      if (!box || typeof box !== "object") return false;
      if (![box.x, box.y, box.w, box.h, box.pageIndex].every((n) => typeof n === "number" && Number.isFinite(n))) return false;
      if (box.x < 0 || box.y < 0 || box.x > 2000 || box.y > 2000 || box.w < 1 || box.w > 2000 || box.h < 1 || box.h > 100 || !Number.isInteger(box.pageIndex) || box.pageIndex < 0 || box.pageIndex > 50) return false;
      if (!["Helvetica", "Times", "Courier"].includes(box.family) || typeof box.bold !== "boolean" || typeof box.italic !== "boolean") return false;
    }
    seen.add(item.lineId);
    line.boxes = item.boxes as LineBox[];
  }
  return true;
}

export async function fittingResumeEdits(doc: ResumeDoc, edits: ResumeEdit[]): Promise<ResumeEdit[]> {
  const lines = new Map(docLines(doc).map((l) => [l.id, l]));
  if (!edits.some((e) => lines.get(e.lineId)?.boxes?.length)) return edits;
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const fonts = new Map<string, Awaited<ReturnType<typeof pdf.embedFont>>>();
  const key = (b: Pick<LineBox, "family" | "bold" | "italic">) => `${b.family}|${b.bold}|${b.italic}`;
  for (const edit of edits) {
    const box = lines.get(edit.lineId)?.boxes?.[0];
    if (!box || fonts.has(key(box))) continue;
    const name = box.family === "Times"
      ? box.bold ? (box.italic ? StandardFonts.TimesRomanBoldItalic : StandardFonts.TimesRomanBold) : box.italic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman
      : box.family === "Courier"
        ? box.bold ? (box.italic ? StandardFonts.CourierBoldOblique : StandardFonts.CourierBold) : box.italic ? StandardFonts.CourierOblique : StandardFonts.Courier
        : box.bold ? (box.italic ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaBold) : box.italic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica;
    fonts.set(key(box), await pdf.embedFont(name));
  }
  const measure: Measure = (box, size, text) => fonts.get(key(box))!.widthOfTextAtSize(text, size);
  return edits.filter((edit) => {
    const line = lines.get(edit.lineId);
    return line && (!line.boxes?.length || fitInBoxes(line, edit.proposed, measure) !== null);
  });
}
