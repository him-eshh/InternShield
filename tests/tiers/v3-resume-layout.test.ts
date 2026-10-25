import { describe, expect, it } from "vitest";
import { keepsWordLayout, WORD_LAYOUT } from "@/lib/tiers/resumeLayout";
import { checkEdit } from "@/lib/tiers/resumeEdits";
import { parseDocx } from "@/lib/tiers/resumeDocx";
import { docLines } from "@/lib/tiers/resumeModel";
import { renderEdited } from "@/lib/tiers/resumeRender";
import { readFileSync } from "node:fs";
const original = "Built a small website for the team with JavaScript.";
describe("Word layout cannot expand", () => {
  it("allows complete-word deletions while preserving surviving order and glyphs", () => {
    expect(keepsWordLayout(original, "Built a website for the team with JavaScript.")).toBe(true);
    expect(keepsWordLayout(original, "Built a website with JavaScript.")).toBe(true);
  });
  it.each(["Built a small website for the team using JavaScript.", "Built a JavaScript website for the team.", "Built a small website for the team with WWWWWWWWWW.", "Built  a website with JavaScript."]) ("rejects added/reordered words or expanding whitespace: %s", (proposed) => {
    expect(keepsWordLayout(original, proposed)).toBe(false);
    expect(checkEdit({ resume: original, original, proposed, source: "docx" }).failures).toContain("width");
  });
  it("rejects whitespace that could add width or a new line", () => {
    expect(keepsWordLayout(original, "Built a website with JavaScript.\n")).toBe(false);
    expect(keepsWordLayout(original, " Built a website with JavaScript.")).toBe(false);
  });
  it("enforces the rule again during DOCX export rather than trusting UI state", async () => {
    const bytes = new Uint8Array(readFileSync("tests/fixtures/resume/one-page.docx"));
    const doc = await parseDocx(bytes);
    const line = docLines(doc).find((l) => l.kind === "bullet")!;
    const output = await renderEdited(doc, bytes, [{ lineId: line.id, text: line.text + " WWWWW" }]);
    expect(output.rejected).toEqual([{ lineId: line.id, reason: WORD_LAYOUT }]);
    expect(output.bytes).toBe(bytes);
  });
});
