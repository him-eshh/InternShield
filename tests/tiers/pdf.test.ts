import { describe, expect, it } from "vitest";
import { buildResumePdf, toWinAnsi } from "@/lib/tiers/pdf";

const head = (b: Uint8Array) => new TextDecoder().decode(b.slice(0, 5));

describe("buildResumePdf", () => {
  it("returns PDF bytes", async () => {
    const bytes = await buildResumePdf(["Sam Rivera", "• Built a small site for a club", "- Led weekly study groups"]);
    expect(head(bytes)).toBe("%PDF-");
  });

  it("handles 200 long lines across pages", async () => {
    const lines = Array.from({ length: 200 }, (_, i) => `• Item ${i} ` + "wrote clear documentation for the team ".repeat(6));
    const bytes = await buildResumePdf(lines, "Long");
    expect(head(bytes)).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("survives smart quotes, emoji and unbroken words", async () => {
    const bytes = await buildResumePdf(["“Quoted” — it’s fine \u{1F600} 你好", "x".repeat(500)]);
    expect(head(bytes)).toBe("%PDF-");
  });

  it("keeps WinAnsi extras and builds with them", async () => {
    expect(toWinAnsi("€5 Acme™")).toBe("€5 Acme™");
    const bytes = await buildResumePdf(["Saved €5 on Acme™ -not a bullet", "-5 degrees"]);
    expect(head(bytes)).toBe("%PDF-");
  });

  it("replaces non-WinAnsi characters", () => {
    expect(toWinAnsi("“hi” it’s")).toBe('"hi" it\'s');
    expect(toWinAnsi("a\u{1F600}b")).toBe("a?b");
  });
});
