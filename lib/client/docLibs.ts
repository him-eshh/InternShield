// Lazy loaders for the two heavy document libraries, so no route pays for them until a file is opened.
// The pdf.js worker path is set here and nowhere else.

/** pdf.js with its worker pointed at the copy in public/. */
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

export const loadMammoth = () => import("mammoth");
