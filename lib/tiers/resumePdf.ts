// PDF -> ResumeDoc (brief R1): pdf.js text items with coordinates and font size, grouped into rows.
import { buildDoc, type RawRow } from "./resumeModel";
import type { LineBox, PdfFamily, ResumeDoc } from "./resumeTypes";

interface PdfTextItem {
  str: string;
  /** [a, b, c, d, x, y] in PDF points. */
  transform: number[];
  width?: number;
  fontName?: string;
}
interface PdfPageItems {
  items: PdfTextItem[];
  /** Real font name for a pdf.js font id, when the loader could look it up. */
  fontNameOf?: (id: string) => string | undefined;
}

function fontFromName(name: string | undefined): { family: PdfFamily; bold: boolean; italic: boolean } {
  const n = (name ?? "").toLowerCase();
  const family: PdfFamily = /courier|mono|consolas|typewriter/.test(n)
    ? "Courier"
    : /times|serif(?!.*sans)|roman|georgia|garamond|minion|palatino|cambria|cmr|cmbx|cmti|book antiqua/.test(n) && !/sans/.test(n)
      ? "Times"
      : "Helvetica";
  return { family, bold: /bold|black|heavy|semibold|-bd\b|cmbx|demi/.test(n), italic: /italic|oblique|-it\b|cmti|slanted/.test(n) };
}

const MARKER_ITEM = /^\s*[•●▪◦‣·]\s*$/;
const MARKER_START = /^\s*[•●▪◦‣·]\s+/;

interface Row {
  y: number;
  h: number;
  items: { x: number; w: number; str: string; size: number; font?: string }[];
}

/** Group one page's items into visual rows, top to bottom, left to right. */
function pageRows(page: PdfPageItems, pageIndex: number): RawRow[] {
  const rows: Row[] = [];
  for (const it of page.items) {
    if (!it || typeof it.str !== "string" || it.str === "" || !Array.isArray(it.transform) || it.transform.length < 6) continue;
    const [, , c, d, x, y] = it.transform;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const size = Math.hypot(c, d) || 10;
    let row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, Math.max(r.h, size) * 0.4));
    if (!row) {
      row = { y, h: size, items: [] };
      rows.push(row);
    }
    row.h = Math.max(row.h, size);
    row.items.push({ x, w: it.width ?? 0, str: it.str, size, font: it.fontName });
  }
  rows.sort((a, b) => b.y - a.y);

  const out: RawRow[] = [];
  for (const r of rows) {
    r.items.sort((a, b) => a.x - b.x);
    let text = "";
    let end: number | null = null;
    let bodyStartItem = 0;
    let bodyX = r.items[0]?.x ?? 0;
    r.items.forEach((it, i) => {
      if (end !== null && !text.endsWith(" ") && !it.str.startsWith(" ") && it.x - end > r.h * 0.25) text += " ";
      if (i === 0 && MARKER_ITEM.test(it.str)) bodyStartItem = 1;
      text += it.str;
      end = it.x + it.w;
    });
    text = text.replace(/[ \t ]+/g, " ").trim();
    if (!text) continue;
    const first = r.items[0];
    if (bodyStartItem === 1) {
      // skip the spacer item pdf.js emits between the glyph and the words
      bodyStartItem = r.items.findIndex((it, i) => i > 0 && it.str.trim() !== "");
      if (bodyStartItem < 0) continue;
      bodyX = r.items[bodyStartItem].x;
    } else if (MARKER_START.test(first.str) && first.w > 0) {
      const m = first.str.match(MARKER_START)![0];
      bodyX = first.x + (first.w * m.length) / first.str.length;
    }
    const body = r.items.slice(bodyStartItem).filter((it) => it.str.trim());
    const lead = body[0] ?? first;
    const size = Math.max(...body.map((it) => it.size), 1);
    const font = fontFromName(page.fontNameOf?.(lead.font ?? "") ?? lead.font);
    const rowEnd = Math.max(...r.items.map((it) => it.x + it.w), bodyX);
    const box: LineBox = { pageIndex, x: bodyX, y: r.y, w: Math.max(rowEnd - bodyX, 1), h: size, ...font };
    out.push({ text, pageIndex, box, bodyX });
  }
  return out;
}

function parsePdfPages(pages: PdfPageItems[]): ResumeDoc {
  const rows = pages.flatMap((p, i) => pageRows(p, i));
  return buildDoc(rows, pages.length, "pdf");
}

/** Minimal slice of the pdf.js API used here, so tests can pass the legacy (node) build. */
interface PdfjsLike {
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfDocLike> };
}
interface PdfDocLike {
  numPages: number;
  destroy?: () => Promise<void>;
  getPage: (n: number) => Promise<PdfPageLike>;
}
interface PdfPageLike {
  getTextContent: () => Promise<{ items: unknown[]; styles: Record<string, { fontFamily?: string }> }>;
  getOperatorList: () => Promise<unknown>;
  commonObjs: { has: (id: string) => boolean; get: (id: string) => { name?: string } | undefined };
}

export async function parsePdf(bytes: Uint8Array, pdfjs: PdfjsLike): Promise<ResumeDoc> {
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const pages: PdfPageItems[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      // Loading the operator list makes pdf.js resolve real font names (needed for bold/serif detection).
      try {
        await page.getOperatorList();
      } catch {
        /* fonts stay generic */
      }
      const items = content.items.filter((it): it is PdfTextItem => !!it && typeof (it as PdfTextItem).str === "string");
      pages.push({
        items,
        fontNameOf: (id) => {
          try {
            const real = page.commonObjs.has(id) ? page.commonObjs.get(id)?.name : undefined;
            return real ?? content.styles[id]?.fontFamily;
          } catch {
            return content.styles[id]?.fontFamily;
          }
        },
      });
    }
    return parsePdfPages(pages);
  } finally {
    await doc.destroy?.();
  }
}
