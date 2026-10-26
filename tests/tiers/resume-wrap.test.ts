import { describe, expect, it } from "vitest";
import { buildDoc, docLines, type RawRow } from "@/lib/tiers/resumeModel";

const box = (x: number, y: number) => ({ pageIndex: 0, x, y, w: 400, h: 9.5, family: "Helvetica" as const, bold: false, italic: false });
const row = (text: string, x: number, y: number): RawRow => ({ text, pageIndex: 0, box: box(x, y), bodyX: x });

describe("PDF wrapped bullets", () => {
  it("joins a wrapped row that hangs ~3pt left of the bullet's first word (Word export)", () => {
    const doc = buildDoc([row("EXPERIENCE", 36, 500), row("• Built a club website with JavaScript and", 53.9, 488), row("React for 12 members.", 51, 476.6)], 1, "pdf");
    const bullets = docLines(doc).filter((l) => l.kind === "bullet");
    expect(bullets).toHaveLength(1);
    expect(bullets[0].text).toBe("Built a club website with JavaScript and React for 12 members.");
    expect(bullets[0].boxes).toHaveLength(2);
  });
  it("keeps a row at the left margin as its own line", () => {
    const doc = buildDoc([row("• Built a club website with JavaScript.", 53.9, 488), row("Data Intern | Northwind", 36, 476.6)], 1, "pdf");
    expect(docLines(doc).map((l) => l.kind)).toEqual(["bullet", "text"]);
  });
});
