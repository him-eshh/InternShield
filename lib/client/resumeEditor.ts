import { loadPdfjs } from "./docLibs";
import { parseDocx } from "@/lib/tiers/resumeDocx";
import { parsePdf } from "@/lib/tiers/resumePdf";
import { docText, docLines } from "@/lib/tiers/resumeModel";
import { checkedEdits } from "@/lib/tiers/resumeEdits";
import { renderEdited, lengthCheck, type Rendered } from "@/lib/tiers/resumeRender";
import type { ResumeDoc, ResumeEdit } from "@/lib/tiers/resumeTypes";
import type { ResumePlan } from "@/lib/tiers/resumePlan";
import type { UserLevel } from "@/lib/types";

export interface PdfPreviewPage { dataUrl: string; width: number; height: number }
interface PreparedPreview { output: Rendered; pages: PdfPreviewPage[] }
export interface ResumeFile { doc: ResumeDoc; bytes: Uint8Array | null; name: string; previews?: Map<string, PreparedPreview> }
export const previewKey = (edits: ResumeEdit[]) => JSON.stringify(edits.map((e) => [e.lineId, e.proposed]));

/** Prepare byte-matched previews while the real layout-check step is visible.
 * At most 6 edits means at most 64 combinations. PNGs keep memory bounded; no live calls.
 */
export async function prepareResumePreviews(file: ResumeFile, edits: ResumeEdit[], signal: AbortSignal): Promise<void> {
  if (file.doc.source !== "pdf" || !file.bytes) return;
  if (edits.length > 6) throw new Error("Review up to six edits at a time.");
  const pdfjs = await loadPdfjs();
  const worker = new pdfjs.PDFWorker();
  const previews = new Map<string, PreparedPreview>();
  try {
    for (let bits = 0; bits < 2 ** edits.length; bits++) {
      signal.throwIfAborted();
      const selected = edits.filter((_, index) => bits & (1 << index));
      const key = previewKey(selected);
      const previous = file.previews?.get(key);
      if (previous) { previews.set(key, previous); continue; }
      const changes = selected.map((e) => ({ lineId: e.lineId, text: e.proposed }));
      const output = await renderEdited(file.doc, file.bytes, changes);
      if (!lengthCheck(file.doc, changes, output).ok) continue;
      const task = pdfjs.getDocument({ data: output.bytes.slice(), worker });
      const pages: PdfPreviewPage[] = [];
      try {
        const doc = await task.promise;
        for (let n = 1; n <= doc.numPages; n++) {
          signal.throwIfAborted();
          const page = await doc.getPage(n);
          const natural = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(1.5, 1000 / natural.width) });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Couldn't prepare the resume preview.");
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          pages.push({ dataUrl: canvas.toDataURL("image/png"), width: natural.width, height: natural.height });
          canvas.width = 0; canvas.height = 0;
        }
      } finally { await task.destroy(); }
      previews.set(key, { output, pages });
    }
    signal.throwIfAborted();
    file.previews = previews;
  } finally { worker.destroy(); }
}

export async function openResumeFile(file: File): Promise<ResumeFile> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose a file smaller than 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (/\.docx$/i.test(file.name)) return { doc: await parseDocx(bytes), bytes, name: file.name };
  if (/\.pdf$/i.test(file.name)) {
    return { doc: await parsePdf(bytes, await loadPdfjs()), bytes, name: file.name };
  }
  throw new Error("Choose a PDF or Word (.docx) file.");
}

export async function draftResumeEdits(file: ResumeFile, posting: string, plan: ResumePlan, facts: string[], signal: AbortSignal, onChecking?: () => void, level?: UserLevel) {
  const response = await fetch("/api/rewrite", {
    method: "POST", headers: { "content-type": "application/json" }, signal,
    body: JSON.stringify({ mode: "edits", source: file.doc.source, resume: docText(file.doc), posting, company: plan.company, role: plan.role, level, facts, guidance: plan.emphasis, geometry: docLines(file.doc).filter((l) => l.kind === "bullet" && l.boxes?.length).map((l) => ({ lineId: l.id, boxes: l.boxes })) }),
  });
  const json = await response.json();
  signal.throwIfAborted();
  if (!response.ok || json?.status !== "done") throw new Error(json?.message || "Couldn't draft edits. Try again.");
  onChecking?.();
  // Repeat the server checks; intercepted or stale API output must also pass in the browser.
  const edits = checkedEdits(file.doc, json.data?.edits, plan.keywords, facts, posting);
  const fitted = await renderEdited(file.doc, file.bytes, edits.map((e) => ({ lineId: e.lineId, text: e.proposed })));
  signal.throwIfAborted();
  const rejected = new Set(fitted.rejected.map((e) => e.lineId));
  return edits.filter((e) => !rejected.has(e.lineId));
}

export function saveResumeBytes(bytes: Uint8Array, mime: string, name: string) {
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
