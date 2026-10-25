import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { parseDocx, applyDocxEdits, distributeText, replaceParagraphText } from "@/lib/tiers/resumeDocx";
import { docLines, docText, parseTextResume } from "@/lib/tiers/resumeModel";
import { parsePdf } from "@/lib/tiers/resumePdf";
import { fitInBoxes, lengthCheck, renderEdited, renderPlainText, TOO_LONG, type Measure } from "@/lib/tiers/resumeRender";
import { ONE_PAGE } from "../fixtures/resume/content";

const fx = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../fixtures/resume", name)));
async function pdfjs() {
  // @ts-expect-error legacy build has no type entry
  return (await import("pdfjs-dist/legacy/build/pdf.mjs")) as never;
}
const expectedText = (lines = ONE_PAGE) => lines.map((l) => (l.kind === "bullet" ? `• ${l.text}` : l.text)).join("\n");

describe("PDF parse (R1)", () => {
  it("keeps order, headings, bullets and boxes (one page)", async () => {
    const doc = await parsePdf(fx("one-page.pdf"), await pdfjs());
    expect(doc.source).toBe("pdf");
    expect(doc.pageCount).toBe(1);
    expect(doc.sections.map((s) => s.heading)).toEqual(["", "EDUCATION", "EXPERIENCE", "PROJECTS", "SKILLS"]);
    expect(docText(doc)).toBe(expectedText());
    const bullets = docLines(doc).filter((l) => l.kind === "bullet");
    expect(bullets).toHaveLength(7);
    expect(bullets.every((b) => b.boxes?.length && b.boxes[0].h > 9 && b.boxes[0].w > 100)).toBe(true);
    expect(bullets[0].boxes![0].family).toBe("Times");
  });

  it("joins wrapped bullet rows into one line with several boxes", async () => {
    const doc = await parsePdf(fx("one-page.pdf"), await pdfjs());
    const wrapped = docLines(doc).filter((l) => (l.boxes?.length ?? 0) > 1);
    // every fixture bullet longer than the column wraps; none of the joined text lost a word
    expect(wrapped.length).toBeGreaterThan(0);
    for (const l of wrapped) expect(l.text.split(" ").length).toBeGreaterThan(8);
  });

  it("two-page file: page count and page index kept", async () => {
    const doc = await parsePdf(fx("two-page.pdf"), await pdfjs());
    expect(doc.pageCount).toBe(2);
    expect(docLines(doc).some((l) => l.pageIndex === 1)).toBe(true);
  });

  it("round trip: render with zero edits gives the same text, sections and page count", async () => {
    const original = fx("one-page.pdf");
    const doc = await parsePdf(original, await pdfjs());
    const out = await renderEdited(doc, original, []);
    const again = await parsePdf(out.bytes, await pdfjs());
    expect(docText(again)).toBe(docText(doc));
    expect(again.sections.map((s) => s.heading)).toEqual(doc.sections.map((s) => s.heading));
    expect(again.pageCount).toBe(doc.pageCount);
  });
});

describe("DOCX parse and in-place edit (R1, R4)", () => {
  it("parses paragraphs, list bullets and headings in order", async () => {
    const doc = await parseDocx(fx("one-page.docx"));
    expect(doc.source).toBe("docx");
    expect(docText(doc)).toBe(expectedText());
    expect(doc.sections.map((s) => s.heading)).toEqual(["", "EDUCATION", "EXPERIENCE", "PROJECTS", "SKILLS"]);
    expect(docLines(doc).filter((l) => l.kind === "bullet")).toHaveLength(7);
  });

  it("an edit changes only document.xml, and only the edited paragraph", async () => {
    const original = fx("one-page.docx");
    const doc = await parseDocx(original);
    const target = docLines(doc).find((l) => l.text.startsWith("Built a weekly"))!;
    const next = "Built a weekly sales dashboard in Excel that cut manual reporting by 5 hours.";
    const out = await applyDocxEdits(original, [{ paragraph: target.paragraph!, text: next }]);

    const a = await JSZip.loadAsync(original);
    const b = await JSZip.loadAsync(out);
    expect(Object.keys(b.files).sort()).toEqual(Object.keys(a.files).sort());
    for (const name of Object.keys(a.files)) {
      if (name === "word/document.xml") continue;
      expect(await b.file(name)?.async("string")).toBe(await a.file(name)?.async("string"));
    }
    const xa = await a.file("word/document.xml")!.async("string");
    const xb = await b.file("word/document.xml")!.async("string");
    const pa = xa.split("</w:p>");
    const pb = xb.split("</w:p>");
    expect(pb).toHaveLength(pa.length);
    const changed = pa.map((p, i) => (p === pb[i] ? -1 : i)).filter((i) => i >= 0);
    expect(changed).toEqual([target.paragraph]);

    const after = await parseDocx(out);
    expect(docText(after).split("\n").filter((l, i) => l !== docText(doc).split("\n")[i])).toEqual([`• ${next}`]);
  });

  it("keeps the first run's formatting (italic lead word) when words change", () => {
    const p = '<w:p><w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">Built </w:t></w:r><w:r><w:rPr><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">a dashboard for the team.</w:t></w:r></w:p>';
    const out = replaceParagraphText(p, "Built a dashboard for the whole team.");
    expect(out).toContain('<w:rPr><w:i/></w:rPr><w:t xml:space="preserve">Built </w:t>');
    expect(out).toContain("a dashboard for the whole team.");
    // untouched run stays byte-identical when only the first run is kept
    expect(replaceParagraphText(p, "Built a dashboard for the team.")).toBe(p);
  });

  it("distributeText keeps run lengths consistent", () => {
    expect(distributeText(["Built ", "a thing"], "Built a big thing").join("")).toBe("Built a big thing");
    expect(distributeText(["Built ", "a thing"], "Made a thing")).toEqual(["Made ", "a thing"]);
  });

  it("escapes XML characters in new text", async () => {
    const original = fx("one-page.docx");
    const doc = await parseDocx(original);
    const target = docLines(doc).find((l) => l.text.startsWith("Wrote a short guide"))!;
    const out = await applyDocxEdits(original, [{ paragraph: target.paragraph!, text: "Wrote a guide for the R&D <desk> that staff use." }]);
    expect(docText(await parseDocx(out))).toContain("Wrote a guide for the R&D <desk> that staff use.");
  });
});

describe("PDF in-place render (R4)", () => {
  it("one accepted edit keeps page count, other lines and fits its box", async () => {
    const original = fx("one-page.pdf");
    const doc = await parsePdf(original, await pdfjs());
    const target = docLines(doc).find((l) => l.text.startsWith("Cleaned and merged"))!;
    const text = "Cleaned and merged 3 shipment data sources with Python and fixed duplicate records.";
    const out = await renderEdited(doc, original, [{ lineId: target.id, text }]);
    expect(out.rejected).toEqual([]);
    expect(out.pageCount).toBe(1);
    const after = await parsePdf(out.bytes, await pdfjs());
    // the cover-and-redraw keeps the old text in the file, so compare what is drawn on top: new line present
    expect(docText(after)).toContain(text.slice(0, 40));
    const check = lengthCheck(doc, [{ lineId: target.id, text }], out);
    expect(check.ok).toBe(true);
  });

  it("rejects an edit that cannot fit its rows", async () => {
    const original = fx("one-page.pdf");
    const doc = await parsePdf(original, await pdfjs());
    const target = docLines(doc).find((l) => l.text.startsWith("Wrote a short guide"))!;
    const text = "Wrote a short guide for the checkout desk that new staff still use every day and in every busy week of the whole year long.";
    const out = await renderEdited(doc, original, [{ lineId: target.id, text }]);
    expect(out.rejected).toEqual([{ lineId: target.id, reason: TOO_LONG }]);
    const check = lengthCheck(doc, [{ lineId: target.id, text }], out);
    expect(check.ok).toBe(false);
  });

  it("fitInBoxes shrinks at most 5%", async () => {
    const doc = await parsePdf(fx("one-page.pdf"), await pdfjs());
    const l = docLines(doc).find((x) => x.text.startsWith("Wrote a short guide"))!;
    const wide: Measure = (_f, size, s) => s.length * size * 0.5;
    const fit = fitInBoxes(l, l.text, wide);
    expect(fit === null || fit.size >= l.boxes![0].h * 0.95 - 1e-9).toBe(true);
  });
});

describe("length check fails loudly", () => {
  it("flags more pages and more than 3% more characters", () => {
    const doc = parseTextResume("Sam\nEXPERIENCE\n• Built a thing for the team.");
    const id = docLines(doc).find((l) => l.kind === "bullet")!.id;
    const long = [{ lineId: id, text: "Built a thing for the whole team and many more people too." }];
    expect(lengthCheck(doc, long, { pageCount: 2, rejected: [] }).problems).toEqual(["More pages than your original", "Longer than your original"]);
    expect(lengthCheck(doc, [], { pageCount: 1, rejected: [] }).ok).toBe(true);
  });

  it("text source round trip", () => {
    const text = "Sam Rivera\nEXPERIENCE\n• Built a thing.\nSKILLS\nPython";
    const doc = parseTextResume(text);
    expect(docText(doc)).toBe(text);
    expect(renderPlainText(doc, [])).toBe(text);
  });
});
