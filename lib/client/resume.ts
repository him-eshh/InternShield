// Resume Reader (spec.md > Resume Reader). Runs entirely in the browser: the file is never uploaded.
import type { ResumeData } from "../types";

export const RESUME_MAX_CHARS = 20000;

export type ResumeResult = { ok: true; data: ResumeData } | { ok: false; message: string };

const UNSUPPORTED = "We can read PDF and Word (.docx) files. You can also skip this step.";
const EMPTY = "We couldn't find any readable text in that file. You can try another one or skip this step.";
const FAILED = "We couldn't open that file. You can try another one or skip this step.";

async function readPdf(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"; // copied into public/
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages && parts.join(" ").length < RESUME_MAX_CHARS; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return parts.join("\n");
}

async function readDocx(buf: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const out = await mammoth.extractRawText({ arrayBuffer: buf });
  return out.value;
}

export async function readResume(file: File): Promise<ResumeResult> {
  const name = file.name || "resume";
  const lower = name.toLowerCase();
  const isPdf = lower.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx = lower.endsWith(".docx");
  if (!isPdf && !isDocx) return { ok: false, message: UNSUPPORTED };
  try {
    const buf = await file.arrayBuffer();
    const raw = isPdf ? await readPdf(buf) : await readDocx(buf);
    const text = raw.replace(/\s+/g, " ").trim().slice(0, RESUME_MAX_CHARS);
    if (!text) return { ok: false, message: EMPTY };
    return { ok: true, data: { text, fileName: name } };
  } catch {
    return { ok: false, message: FAILED };
  }
}
