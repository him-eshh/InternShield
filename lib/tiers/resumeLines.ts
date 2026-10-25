// Bug E: rebuild resume lines from PDF text items and mammoth HTML. Pure; no DOM globals at import time.

export type PdfItem = { str: string; transform: number[]; width?: number; hasEOL?: boolean };
type LineKind = "heading" | "bullet" | "contact" | "text";

type Row = { y: number; h: number; items: { x: number; w: number; str: string; eol: boolean }[] };

/** Group pdf.js text items into visual lines: rows top-to-bottom, items left-to-right. */
export function pdfItemsToLines(items: PdfItem[]): string[] {
  const rows: Row[] = [];
  for (const it of items) {
    if (!it || typeof it.str !== "string" || !Array.isArray(it.transform) || it.transform.length < 6) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const h = Math.abs(it.transform[3]) || 10;
    let row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, Math.max(r.h, h) * 0.4));
    if (!row) {
      row = { y, h, items: [] };
      rows.push(row);
    }
    row.h = Math.max(row.h, h);
    row.items.push({ x, w: it.width ?? 0, str: it.str, eol: !!it.hasEOL });
  }
  rows.sort((a, b) => b.y - a.y); // PDF y grows upward
  const lines: string[] = [];
  for (const r of rows) {
    r.items.sort((a, b) => a.x - b.x);
    let s = "";
    let end: number | null = null;
    let prevEol = false;
    for (const it of r.items) {
      if (end !== null && !s.endsWith(" ") && !it.str.startsWith(" ")) {
        // hasEOL is a tiebreak for items that touch but belong to separate runs
        if (it.x - end > r.h * 0.25 || (prevEol && it.str)) s += " ";
      }
      s += it.str;
      end = it.x + it.w;
      prevEol = it.eol;
    }
    s = s.replace(/[ \t ]+/g, " ").trim();
    if (s) lines.push(s);
  }
  return lines;
}

type Node_ = {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  childNodes: ArrayLike<Node_>;
};

const BLOCKS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "ul", "ol", "div", "table", "tr", "blockquote"]);

function defaultParse(html: string): Document {
  if (typeof DOMParser === "undefined") throw new Error("No DOMParser available");
  return new DOMParser().parseFromString(html, "text/html");
}

/** Walk mammoth HTML into lines: li -> "• text", h1-h6/p -> own line, br -> line break. */
export function htmlToLines(html: string, parse: (html: string) => Document = defaultParse): string[] {
  const doc = parse(html);
  const root = (doc.documentElement ?? doc) as unknown as Node_;
  const lines: string[] = [];
  let buf = "";
  const flush = () => {
    const t = buf.replace(/[ \t ]+/g, " ").trim();
    if (t && t !== "•") lines.push(t);
    buf = "";
  };
  const walk = (n: Node_) => {
    if (n.nodeType === 3) {
      buf += (n.nodeValue ?? "").replace(/\s+/g, " ");
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = n.nodeName.toLowerCase();
    if (tag === "script" || tag === "style") return;
    if (tag === "br") {
      flush();
      return;
    }
    const block = BLOCKS.has(tag);
    if (block) flush();
    if (tag === "li") buf = "• ";
    for (let i = 0; i < n.childNodes.length; i++) walk(n.childNodes[i]);
    if (block) flush();
  };
  walk(root);
  flush();
  return lines;
}

/** The only normalization step; run last. Collapses spaces/tabs within a line, trims, drops blank runs > 1. */
export function normalizeLines(lines: string[]): string {
  const out: string[] = [];
  for (const raw of lines) {
    for (const part of raw.split(/\r?\n/)) {
      const t = part.replace(/[ \t ]+/g, " ").trim();
      if (!t && (out.length === 0 || out[out.length - 1] === "")) continue;
      out.push(t);
    }
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out.join("\n");
}

const SECTION_WORDS = new Set([
  "education", "experience", "projects", "skills", "work experience", "leadership", "awards",
  "certifications", "summary", "technical skills", "professional experience", "relevant experience",
  "activities", "publications", "objective",
]);

export function lineKind(line: string): LineKind {
  const t = line.trim();
  if (/^(?:[•▪◦‣]|[-*]\s|\d{1,2}[.)]\s)/.test(t)) return "bullet";
  if (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(t) ||
    /(?:linkedin\.com|github\.com)/i.test(t) ||
    /(?:\+?\d[\d\s().-]{7,}\d)/.test(t)
  ) {
    return "contact";
  }
  const bare = t.replace(/[:\s]+$/, "");
  const words = bare.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.length <= 4) {
    if (SECTION_WORDS.has(bare.toLowerCase())) return "heading";
    const letters = bare.replace(/[^A-Za-z]/g, "");
    if (letters.length >= 3 && letters === letters.toUpperCase()) return "heading";
  }
  return "text";
}

/** True when the text has almost no line breaks, so layout was lost. */
export function layoutLost(text: string): boolean {
  if (text.length <= 400) return false;
  const newlines = (text.match(/\n/g) ?? []).length;
  return (newlines * 1000) / text.length < 5;
}
