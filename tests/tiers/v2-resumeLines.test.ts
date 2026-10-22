import { describe, expect, it } from "vitest";
import { DOMParser as XmlDomParser } from "@xmldom/xmldom";
import JSZip from "jszip";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  htmlToLines,
  layoutLost,
  lineKind,
  normalizeLines,
  pdfItemsToLines,
  type PdfItem,
} from "@/lib/tiers/resumeLines";

// vitest runs in node (no DOMParser); mammoth emits well-formed markup, so xmldom stands in.
const parse = (html: string) =>
  new XmlDomParser().parseFromString(`<root>${html}</root>`, "text/xml") as unknown as Document;

const item = (str: string, x: number, y: number, width = str.length * 6, extra: Partial<PdfItem> = {}): PdfItem => ({
  str,
  transform: [12, 0, 0, 12, x, y],
  width,
  ...extra,
});

describe("pdfItemsToLines", () => {
  it("orders rows top to bottom and items left to right", () => {
    const lines = pdfItemsToLines([item("world", 100, 700), item("Bottom", 50, 600), item("hello", 50, 700)]);
    expect(lines).toEqual(["hello world", "Bottom"]);
  });
  it("joins touching items without a space and spaces real gaps", () => {
    expect(pdfItemsToLines([item("Jane", 50, 700, 24), item("Doe", 74, 700, 18)])).toEqual(["JaneDoe"]);
    expect(pdfItemsToLines([item("Jane", 50, 700, 24), item("Doe", 80, 700, 18)])).toEqual(["Jane Doe"]);
  });
  it("tolerates small baseline jitter and drops empty rows", () => {
    const lines = pdfItemsToLines([item("a", 50, 700), item("b", 70, 701), item("  ", 50, 650), item("", 50, 600)]);
    expect(lines).toEqual(["a b"]);
  });
  it("uses hasEOL as a tiebreak between touching items", () => {
    expect(pdfItemsToLines([item("one", 50, 700, 18, { hasEOL: true }), item("two", 68, 700, 18)])).toEqual(["one two"]);
  });
  it("ignores malformed items and handles empty input", () => {
    expect(pdfItemsToLines([])).toEqual([]);
    expect(pdfItemsToLines([{ str: "x", transform: [] } as PdfItem])).toEqual([]);
  });
});

describe("htmlToLines", () => {
  it("maps headings, paragraphs, list items and br to lines", () => {
    const html = "<h1>Jane Doe</h1><p>Line one<br />Line two</p><ul><li>Built a thing</li><li>Fixed a bug</li></ul>";
    expect(htmlToLines(html, parse)).toEqual(["Jane Doe", "Line one", "Line two", "• Built a thing", "• Fixed a bug"]);
  });
  it("handles nested lists", () => {
    const html = "<ul><li>Parent<ul><li>Child</li></ul></li></ul>";
    expect(htmlToLines(html, parse)).toEqual(["• Parent", "• Child"]);
  });
  it("collapses inline markup", () => {
    expect(htmlToLines("<p>A <strong>bold</strong> move</p>", parse)).toEqual(["A bold move"]);
  });
});

describe("normalizeLines", () => {
  it("collapses spaces within a line, trims, and caps blank runs", () => {
    expect(normalizeLines(["  a \t b  ", "", "", "", "c  d", ""])).toBe("a b\n\nc d");
  });
  it("drops leading blanks", () => {
    expect(normalizeLines(["", "x"])).toBe("x");
  });
});

describe("lineKind", () => {
  it("detects bullets", () => {
    for (const l of ["• Built it", "- Built it", "* Built it", "▪ x", "◦ x", "‣ x", "1. First", "2) Second"]) {
      expect(lineKind(l)).toBe("bullet");
    }
  });
  it("detects contact lines", () => {
    expect(lineKind("jane.doe@example.com | (555) 010-2030")).toBe("contact");
    expect(lineKind("linkedin.com/in/janedoe")).toBe("contact");
    expect(lineKind("github.com/janedoe")).toBe("contact");
  });
  it("detects headings", () => {
    expect(lineKind("EDUCATION")).toBe("heading");
    expect(lineKind("Work Experience")).toBe("heading");
    expect(lineKind("Skills:")).toBe("heading");
  });
  it("treats everything else as text", () => {
    expect(lineKind("Built a dashboard that cut report time by half")).toBe("text");
    expect(lineKind("Spring Boot")).toBe("text");
  });
});

describe("layoutLost", () => {
  it("is false for short text and text with line breaks", () => {
    expect(layoutLost("a ".repeat(100))).toBe(false);
    expect(layoutLost(("word ".repeat(10) + "\n").repeat(20))).toBe(false);
  });
  it("is true for long text with almost no line breaks", () => {
    expect(layoutLost("word ".repeat(200))).toBe(true);
  });
});

async function pdfItemsFromBytes(bytes: Uint8Array): Promise<PdfItem[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerUrl = new URL("../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).href;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: bytes, useWorkerFetch: false, verbosity: 0 })
    .promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  return content.items.filter((it): it is Extract<typeof it, { str: string }> => "str" in it);
}

describe("file -> pipeline: PDF", () => {
  it("keeps headings, contact and bullets as separate lines", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const page = pdf.addPage([612, 792]);
    const rows = [
      "Jane Doe",
      "jane.doe@example.com | (555) 010-2030",
      "EDUCATION",
      "Example State University, B.S. Computer Science",
      "EXPERIENCE",
      "- Built a scheduling tool used by 40 students",
      "- Cut build times by moving tests to a cache",
      "- Wrote docs for the onboarding flow",
      "SKILLS",
      "Python, TypeScript, SQL",
    ];
    rows.forEach((t, i) => page.drawText(t, { x: 50, y: 740 - i * 20, size: 12, font }));
    const items = await pdfItemsFromBytes(await pdf.save());
    const lines = pdfItemsToLines(items);
    expect(lines).toEqual(rows);
    const kinds = lines.map(lineKind);
    expect(kinds.filter((k) => k === "bullet")).toHaveLength(3);
    expect(kinds[1]).toBe("contact");
    expect(kinds[2]).toBe("heading");
    expect(kinds[4]).toBe("heading");
    expect(kinds[8]).toBe("heading");
    const text = normalizeLines(lines);
    expect(layoutLost(text)).toBe(false);
  });

  it("does not crash on a two-column layout and keeps all text", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const page = pdf.addPage([612, 792]);
    const left = ["SKILLS", "Python", "SQL"];
    const right = ["EXPERIENCE", "Built a small tool", "Wrote some docs"];
    left.forEach((t, i) => page.drawText(t, { x: 50, y: 740 - i * 20, size: 12, font }));
    right.forEach((t, i) => page.drawText(t, { x: 330, y: 740 - i * 20, size: 12, font }));
    const lines = pdfItemsToLines(await pdfItemsFromBytes(await pdf.save()));
    expect(lines).toHaveLength(3);
    const joined = lines.join("\n");
    for (const t of [...left, ...right]) expect(joined).toContain(t);
    expect(lines[0].indexOf("SKILLS")).toBeLessThan(lines[0].indexOf("EXPERIENCE"));
  });
});

describe("file -> pipeline: DOCX", () => {
  it("keeps list bullets and w:br line breaks", async () => {
    const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    const bullet = (t: string) =>
      `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${t}</w:t></w:r></w:p>`;
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
    );
    zip.file(
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    );
    zip.file(
      "word/_rels/document.xml.rels",
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`,
    );
    zip.file(
      "word/numbering.xml",
      `<?xml version="1.0" encoding="UTF-8"?><w:numbering ${W}><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`,
    );
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body><w:p><w:r><w:t>Jane Doe</w:t></w:r></w:p><w:p><w:r><w:t>jane.doe@example.com</w:t><w:br/><w:t>Springfield</w:t></w:r></w:p>${bullet("Built a scheduling tool")}${bullet("Wrote onboarding docs")}${bullet("Mentored two interns")}</w:body></w:document>`,
    );
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const { value } = await mammoth.convertToHtml({ buffer });
    const lines = htmlToLines(value, parse);
    expect(lines).toEqual([
      "Jane Doe",
      "jane.doe@example.com",
      "Springfield",
      "• Built a scheduling tool",
      "• Wrote onboarding docs",
      "• Mentored two interns",
    ]);
    expect(lines.map(lineKind).filter((k) => k === "bullet")).toHaveLength(3);
  });
});
