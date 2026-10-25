// Optional Windows-only QA: local Word measures fabricated fixtures, never personal documents/APIs.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";
import { parseDocx } from "../lib/tiers/resumeDocx";
import { docLines } from "../lib/tiers/resumeModel";
import { lengthCheck, renderEdited } from "../lib/tiers/resumeRender";

async function main() {
  const shots = process.env.QA_SHOTS;
  assert(shots, "QA_SHOTS required");
  const original = new Uint8Array(readFileSync("tests/fixtures/resume/one-page.docx"));
  const doc = await parseDocx(original);
  const proposals = [
    ["Cleaned and merged", "Cleaned 3 shipment data sources with Python to fix duplicate records."],
    ["Presented route", "Presented findings to a team of 8 and helped choose two new carriers."],
    ["Wrote a short", "Wrote a guide for the checkout desk that new staff use."],
  ];
  const edits = proposals.map(([prefix, text]) => ({ lineId: docLines(doc).find((l) => l.text.startsWith(prefix))!.id, text }));
  const output = await renderEdited(doc, original, edits);
  assert(lengthCheck(doc, edits, output).ok);
  writeFileSync(join(shots, "word-before.docx"), original);
  writeFileSync(join(shots, "word-after.docx"), output.bytes);
  if (!process.argv.includes("--verify-only")) {
    const result = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", resolve("qa/v3-resume-word.ps1"), "-Shots", shots], { encoding: "utf8", timeout: 180000, windowsHide: true });
    console.log(result.trim());
  }
  const before = await PDFDocument.load(readFileSync(join(shots, "word-before.pdf")));
  const after = await PDFDocument.load(readFileSync(join(shots, "word-after.pdf")));
  assert.equal(before.getPageCount(), 1);
  assert.equal(after.getPageCount(), 1);
  const engine = await import("pdfjs-dist/legacy/build/pdf.mjs");
  for (const [name, edited] of [["word-before.pdf", false], ["word-after.pdf", true]] as const) {
    const task = engine.getDocument({ data: new Uint8Array(readFileSync(join(shots, name))) });
    const pdf = await task.promise;
    try {
      const page = await pdf.getPage(1);
      const content = await page.getTextContent();
      const items = content.items.filter((item): item is Extract<typeof item, { str: string }> => "str" in item);
      const text = items.map((item) => item.str).join(" ").replace(/\s+/g, " ");
      for (const item of items.filter((item) => item.str.trim())) {
        assert(item.transform[4] >= 53, `${name}: text left of original margin`);
        assert(item.transform[4] + item.width <= 559, `${name}: text overflows original page content width`);
      }
      if (edited) for (const [, proposed] of proposals) assert(text.includes(proposed), `Word output must contain the actual edit: ${proposed}`);
    } finally { await task.destroy(); }
  }
  console.log("ALL OK actual Word fixture: 1 page -> 1 page, three edits present, no text outside original margins");
}
void main();
