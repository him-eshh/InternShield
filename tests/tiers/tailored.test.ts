import { beforeEach, describe, expect, it } from "vitest";
import { loadTailored, resetTailored, resumeKey, resumeLines, saveTailored } from "@/lib/tiers/tailored";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

const RESUME = "Sam Rivera\n\n  Projects  \n• Built a club site • Ran a study group\n- Tutored algebra";

describe("resumeLines", () => {
  it("trims, drops blanks and splits joined bullets", () => {
    expect(resumeLines(RESUME)).toEqual([
      "Sam Rivera",
      "Projects",
      "• Built a club site",
      "• Ran a study group",
      "- Tutored algebra",
    ]);
  });
});

describe("resumeLines long paragraphs", () => {
  it("splits lines over 600 characters at sentence ends", () => {
    const sentence = "I wrote clear notes for the whole team every week.";
    const para = Array.from({ length: 30 }, () => sentence).join(" ");
    const lines = resumeLines(para);
    expect(para.length).toBeGreaterThan(600);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((l) => l.length <= 600 && l.endsWith("."))).toBe(true);
    expect(lines.join(" ")).toBe(para);
  });
});

describe("resumeKey", () => {
  it("is stable and changes with the text", () => {
    expect(resumeKey(RESUME)).toBe(resumeKey(RESUME));
    expect(resumeKey(RESUME)).not.toBe(resumeKey(RESUME + "x"));
  });
});

describe("tailored storage", () => {
  it("falls back to the resume lines", () => {
    expect(loadTailored(RESUME)).toEqual(resumeLines(RESUME));
  });
  it("loads saved lines for the same resume only", () => {
    saveTailored(RESUME, ["Edited"]);
    expect(loadTailored(RESUME)).toEqual(["Edited"]);
    expect(loadTailored("Another resume")).toEqual(["Another resume"]);
  });
  it("ignores malformed stored data and resets", () => {
    store.set("is:tailored", JSON.stringify({ resumeKey: 5 }));
    expect(loadTailored(RESUME)).toEqual(resumeLines(RESUME));
    saveTailored(RESUME, ["Edited"]);
    resetTailored();
    expect(loadTailored(RESUME)).toEqual(resumeLines(RESUME));
  });
});
