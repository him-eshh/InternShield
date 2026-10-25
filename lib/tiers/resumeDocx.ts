// DOCX <-> ResumeDoc (brief R1, R4). The edit touches only word/document.xml, and inside it only the
// runs whose text changes; every other byte of the file stays as it was.
import JSZip from "jszip";
import { diffWordsWithSpace } from "diff";
import { buildDoc, type RawRow } from "./resumeModel";
import type { ResumeDoc } from "./resumeTypes";

const PARA_RE = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
const RUN_RE = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g;
const T_RE = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;

const unesc = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, "&");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Para {
  start: number;
  end: number;
  xml: string;
}
/** Every paragraph of document.xml in order (empty ones included, so indexes stay stable). */
export function docxParagraphs(xml: string): Para[] {
  return [...xml.matchAll(PARA_RE)].map((m) => ({ start: m.index!, end: m.index! + m[0].length, xml: m[0] }));
}

interface Run {
  start: number;
  end: number;
  xml: string;
  text: string;
}
function paragraphRuns(pxml: string): Run[] {
  const runs: Run[] = [];
  for (const m of pxml.matchAll(RUN_RE)) {
    let text = "";
    for (const t of m[0].matchAll(T_RE)) text += unesc(t[1]);
    if (/<w:t[\s>]/.test(m[0])) runs.push({ start: m.index!, end: m.index! + m[0].length, xml: m[0], text });
  }
  return runs;
}

export function paragraphText(pxml: string): string {
  return paragraphRuns(pxml).map((r) => r.text).join("");
}

const isListParagraph = (pxml: string) => /<w:numPr>[\s\S]*?<\/w:numPr>/.test(pxml) && !/<w:numId w:val="0"\s*\/>/.test(pxml);

async function documentXml(zip: JSZip): Promise<string> {
  const f = zip.file("word/document.xml");
  if (!f) throw new Error("Not a Word document");
  return f.async("string");
}

export async function parseDocx(bytes: Uint8Array): Promise<ResumeDoc> {
  const zip = await JSZip.loadAsync(bytes);
  const xml = await documentXml(zip);
  const rows: RawRow[] = docxParagraphs(xml).map((p, i) => ({
    text: paragraphText(p.xml),
    pageIndex: 0,
    paragraph: i,
    listItem: isListParagraph(p.xml),
  }));
  const pagesTag = await zip.file("docProps/app.xml")?.async("string");
  const pages = Number(pagesTag?.match(/<Pages>(\d+)<\/Pages>/)?.[1]);
  return buildDoc(rows, pages > 0 ? pages : 1, "docx", !(pages > 0));
}

/** New text for each run after a word-level diff, so bold or italic spans keep covering the same words. */
export function distributeText(runs: string[], next: string): string[] {
  const old = runs.join("");
  const starts: number[] = [];
  let pos = 0;
  for (const r of runs) {
    starts.push(pos);
    pos += r.length;
  }
  const runAt = (i: number) => {
    // char i of the old text -> run index (the last run for i past the end)
    for (let k = runs.length - 1; k >= 0; k--) if (i >= starts[k]) return k;
    return 0;
  };
  const out = runs.map(() => "");
  let at = 0;
  for (const part of diffWordsWithSpace(old, next)) {
    if (part.removed) {
      at += part.value.length;
    } else if (part.added) {
      // inserted text joins the run holding the character before it (the first run at the very start)
      out[runAt(Math.max(at - 1, 0))] += part.value;
    } else {
      for (let i = 0; i < part.value.length; i++) out[runAt(at + i)] += old[at + i];
      at += part.value.length;
    }
  }
  return out;
}

function rewriteRun(run: string, text: string): string {
  let first = true;
  return run.replace(T_RE, () => {
    if (!first) return "";
    first = false;
    return `<w:t xml:space="preserve">${esc(text)}</w:t>`;
  });
}

/** One paragraph's xml with its text replaced; runs whose text is unchanged are left byte-identical. */
export function replaceParagraphText(pxml: string, next: string): string {
  const runs = paragraphRuns(pxml);
  if (!runs.length) return pxml;
  const texts = distributeText(runs.map((r) => r.text), next);
  let out = "";
  let pos = 0;
  runs.forEach((r, i) => {
    out += pxml.slice(pos, r.start);
    out += texts[i] === r.text ? r.xml : rewriteRun(r.xml, texts[i]);
    pos = r.end;
  });
  return out + pxml.slice(pos);
}

export interface DocxEdit {
  paragraph: number;
  text: string;
}

/** The user's own .docx with only the edited paragraphs changed. */
export async function applyDocxEdits(bytes: Uint8Array, edits: DocxEdit[]): Promise<Uint8Array> {
  if (!edits.length) return bytes;
  const zip = await JSZip.loadAsync(bytes);
  const xml = await documentXml(zip);
  const paras = docxParagraphs(xml);
  let out = "";
  let pos = 0;
  const byPara = new Map(edits.map((e) => [e.paragraph, e.text]));
  paras.forEach((p, i) => {
    out += xml.slice(pos, p.start);
    const next = byPara.get(i);
    out += next === undefined ? p.xml : replaceParagraphText(p.xml, next);
    pos = p.end;
  });
  out += xml.slice(pos);
  zip.file("word/document.xml", out);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
