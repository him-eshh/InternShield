import { parseDocx } from "@/lib/tiers/resumeDocx";
import { parsePdf } from "@/lib/tiers/resumePdf";
import { docText, docLines } from "@/lib/tiers/resumeModel";
import { checkedEdits } from "@/lib/tiers/resumeEdits";
import { renderEdited } from "@/lib/tiers/resumeRender";
import type { ResumeDoc } from "@/lib/tiers/resumeTypes";
import type { ResumePlan } from "@/lib/tiers/resumePlan";

export interface ResumeFile { doc: ResumeDoc; bytes: Uint8Array | null; name: string }
export async function openResumeFile(file: File): Promise<ResumeFile> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose a file smaller than 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (/\.docx$/i.test(file.name)) return { doc: await parseDocx(bytes), bytes, name: file.name };
  if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return { doc: await parsePdf(bytes, pdfjs), bytes, name: file.name };
  }
  throw new Error("Choose a PDF or Word (.docx) file.");
}

export async function draftResumeEdits(file: ResumeFile, posting: string, plan: ResumePlan, facts: string[], signal: AbortSignal, onChecking?: () => void) {
  const response = await fetch("/api/rewrite", {
    method: "POST", headers: { "content-type": "application/json" }, signal,
    body: JSON.stringify({ mode: "edits", resume: docText(file.doc), posting, company: plan.company, role: plan.role, facts, guidance: plan.emphasis, geometry: docLines(file.doc).filter((l) => l.kind === "bullet" && l.boxes?.length).map((l) => ({ lineId: l.id, boxes: l.boxes })) }),
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
