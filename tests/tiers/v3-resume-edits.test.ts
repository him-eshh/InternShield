import { describe, expect, it } from "vitest";
import { checkedEdits, checkEdit } from "@/lib/tiers/resumeEdits";
import { bannedIn, emDashCount, styleIssues, adjectiveStack } from "@/lib/tiers/resumeTells";
import { docLines, parseTextResume } from "@/lib/tiers/resumeModel";

const original = "Built a club website with JavaScript.";
const proposed = "Built a club website using JavaScript.";
const resume = `Sam Rivera\nEXPERIENCE\n- ${original}\nSKILLS\nPython`;
const doc = parseTextResume(resume);
const bullet = docLines(doc).find((l) => l.kind === "bullet")!;
const candidate = { lineId: bullet.id, proposed };

describe("shared resume edit guard", () => {
  it("allows a small factual edit and derives metadata from the source", () => {
    const out = checkedEdits(doc, [{ ...candidate, original: "fake", section: "fake", reason: "Fake award", keywords: ["Rust"] }], ["JavaScript"]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ original, section: "EXPERIENCE", keywords: [], status: "pending" });
    expect(out[0].reason).not.toContain("award");
  });
  it.each([
    "Built a club website with Rust.",
    "Built 12 club websites with JavaScript.",
    "Built a club website for Microsoft.",
    "Built a club website in 2025.",
    "Built a club website with innovative JavaScript.",
    "Built a club website with JavaScript.\nAdded a section",
    "Build a club website with JavaScript.",
    "Built a club website with JavaScript",
    "Built a club website using JavaScript?",
    "I built a club website with JavaScript.",
    "Built a club website with JavaScript and lots of other things too.",
    "Built a club website \u2014 with JavaScript.",
  ])("drops adversarial model text: %s", (proposed) => {
    expect(checkedEdits(doc, [{ lineId: bullet.id, proposed }], [])).toEqual([]);
  });
  it("does not treat posting keywords as user facts", () => {
    const proposed = "Built a club website using React.";
    expect(checkEdit({ resume, original, proposed, posting: "React required" }).ok).toBe(false);
    expect(checkEdit({ resume, original, proposed, facts: ["React"] }).ok).toBe(true);
  });
  it("rejects headings, fabricated ids, duplicate edits and malformed objects", () => {
    const heading = docLines(doc).find((l) => l.kind === "heading")!;
    expect(checkedEdits(doc, [null, {}, { ...candidate, lineId: heading.id }, { ...candidate, lineId: "missing" }, candidate, candidate], [])).toHaveLength(1);
    expect(checkedEdits(doc, {}, [])).toEqual([]);
  });
  it("caps output at six existing bullets", () => {
    const many = parseTextResume(`EXPERIENCE\n${Array.from({ length: 9 }, () => `- ${original}`).join("\n")}`);
    const candidates = docLines(many).filter((l) => l.kind === "bullet").map((l) => ({ lineId: l.id, proposed }));
    expect(checkedEdits(many, candidates, [])).toHaveLength(6);
  });
  it("enforces the resume-wide 3% budget even if individual edits fit 10%", () => {
    const source = "Built a small website with JavaScript.";
    const many = parseTextResume(Array.from({ length: 6 }, () => `- ${source}`).join("\n"));
    const candidates = docLines(many).map((l) => ({ lineId: l.id, proposed: "Built a small web website with JavaScript." }));
    const out = checkedEdits(many, candidates, []);
    expect(out.length).toBeLessThan(6);
    expect(out.reduce((n, e) => n + e.proposed.length - e.original.length, 0)).toBeLessThanOrEqual(source.length * 6 * 0.03);
  });
  it("recognizes every required banned phrase, adjective stacks, em dashes and voice changes", () => {
    for (const word of ["spearheaded", "leveraged", "utilized", "passionate", "synergy", "cutting-edge", "dynamic", "results-driven", "orchestrated", "seamlessly", "robust", "innovative", "proven track record", "in today's fast-paced", "drove impact", "drive impact", "showcasing", "demonstrating"]) expect(bannedIn(word).length).toBeGreaterThan(0);
    expect(adjectiveStack("modern, scalable and reliable dashboard")).toBe(true);
    expect(emDashCount("one\u2014two")).toBe(1);
    expect(styleIssues(original, "Build a club website with JavaScript")).toEqual(["tense", "punctuation"]);
  });
});
