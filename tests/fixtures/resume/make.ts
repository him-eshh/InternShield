// Regenerates the made-up fixtures: `npx tsx tests/fixtures/resume/make.ts`
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ONE_PAGE, TWO_PAGE, type FxLine } from "./content";

const dir = __dirname;

async function makePdf(lines: FxLine[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const W = 612;
  const H = 792;
  let page = doc.addPage([W, H]);
  let y = H - 54;
  const left = 54;
  const max = W - 108;
  for (const l of lines) {
    const size = l.kind === "name" ? 20 : l.kind === "heading" ? 11 : 10.5;
    const font = l.kind === "name" || l.kind === "heading" || l.kind === "role" ? bold : reg;
    const gap = l.kind === "heading" ? 8 : 0;
    const lead = size * 1.3;
    if (y - gap < 54) {
      page = doc.addPage([W, H]);
      y = H - 54;
    }
    y -= gap;
    if (l.kind === "bullet") {
      // wrap to the width past the bullet indent
      const words = l.text.split(" ");
      let cur = "";
      const rows: string[] = [];
      for (const w of words) {
        const t = cur ? `${cur} ${w}` : w;
        if (reg.widthOfTextAtSize(t, size) > max - 14 && cur) {
          rows.push(cur);
          cur = w;
        } else cur = t;
      }
      if (cur) rows.push(cur);
      rows.forEach((r, i) => {
        if (i === 0) page.drawText("•", { x: left + 2, y, size, font: reg, color: rgb(0, 0, 0) });
        page.drawText(r, { x: left + 14, y, size, font: reg });
        y -= lead;
      });
    } else {
      page.drawText(l.text, { x: left, y, size, font });
      if (l.kind === "heading") page.drawLine({ start: { x: left, y: y - 2 }, end: { x: left + max, y: y - 2 }, thickness: 0.6, color: rgb(0, 0, 0) });
      y -= lead;
    }
  }
  doc.setTitle("Made-up fixture resume");
  return doc.save({ useObjectStreams: false });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const run = (t: string, rpr = "") => `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;

function makeDocxXml(lines: FxLine[]): string {
  const body = lines
    .map((l) => {
      if (l.kind === "name") return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${run(l.text, '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="40"/>')}</w:p>`;
      if (l.kind === "contact") return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${run(l.text, '<w:sz w:val="20"/>')}</w:p>`;
      if (l.kind === "heading") return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="000000"/></w:pBdr></w:pPr>${run(l.text, '<w:b/><w:sz w:val="22"/>')}</w:p>`;
      if (l.kind === "role") return `<w:p>${run(l.text, '<w:b/><w:sz w:val="21"/>')}</w:p>`;
      if (l.kind === "bullet") {
        // two runs: the first word in italics shows run-splitting survives an edit
        const [first, ...rest] = l.text.split(" ");
        return `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${run(first + " ", '<w:i/><w:sz w:val="21"/>')}${run(rest.join(" "), '<w:sz w:val="21"/>')}</w:p>`;
      }
      return `<w:p>${run(l.text, '<w:sz w:val="21"/>')}</w:p>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

async function makeDocx(lines: FxLine[]): Promise<Uint8Array> {
  const z = new JSZip();
  z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  z.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`);
  z.file("word/numbering.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`);
  z.file("word/document.xml", makeDocxXml(lines));
  return z.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

async function main() {
  writeFileSync(join(dir, "one-page.pdf"), await makePdf(ONE_PAGE));
  writeFileSync(join(dir, "two-page.pdf"), await makePdf(TWO_PAGE));
  writeFileSync(join(dir, "one-page.docx"), await makeDocx(ONE_PAGE));
  console.log("fixtures written");
}
void main();
