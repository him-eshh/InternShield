import { describe, expect, it } from "vitest";
import { buildScorecard, findQuote } from "@/lib/tiers/scorecard";
import type { InterviewSession } from "@/lib/tiers/types";

const base: InterviewSession = {
  id: "s",
  round: "coding",
  context: { company: null, role: null, description: null, resume: null, field: "tech" },
  turns: [],
  pending: null,
  used: 1,
  seed: 1,
  problemId: "two-sum",
  code: null,
  board: null,
  hints: [],
  feedback: null,
  status: "done",
  createdAt: 0,
  updatedAt: 0,
};
const band = (s: InterviewSession, id: string) => buildScorecard(s)!.axes.find((a) => a.id === id)!;
const PLAN = "Use a hash map from value to index, one pass, check the complement before storing each number. That is O(n) time and O(n) space overall here.";

describe("buildScorecard: coding", () => {
  const coded: InterviewSession = {
    ...base,
    turns: [{ question: "Two sum", answer: `${PLAN}\n\nCode:\ndef f(): pass` }],
    code: { problemId: "two-sum", language: "python", code: "x", passed: 6, total: 6 },
    stats: { runsBeforeSubmit: 2, submits: 1, firstSubmitAt: 5 * 60000 },
    feedback: { summary: "", items: [{ index: 0, strength: "a", improve: "b", quote: "Use a hash map", star: null }] },
  };

  it("has the four tech axes, in order", () => {
    expect(buildScorecard(coded)!.axes.map((a) => a.id)).toEqual(["communication", "problem", "coding", "verification"]);
  });
  it("fills from code signals; all strong means no drill", () => {
    const c = buildScorecard(coded)!;
    expect(c.axes.every((a) => a.band === "Strong")).toBe(true);
    expect(c.nextDrill).toBeUndefined();
    expect(band(coded, "coding").evidence).toEqual(["6 of 6 hidden tests passed"]);
    expect(band(coded, "coding").byCode).toBe(true);
    expect(band(coded, "problem").evidence).toContain("First submit after 5 min");
  });
  it("submitting without running caps verification", () => {
    expect(band({ ...coded, stats: { runsBeforeSubmit: 0, submits: 1, firstSubmitAt: 1 } }, "verification").band).toBe("Developing");
    expect(band({ ...coded, stats: undefined, code: { ...coded.code!, passed: 2 } }, "verification").band).toBe("Not yet");
  });
  it("evidence-or-cap: no quote caps communication at Developing", () => {
    const noQuote = { ...coded, feedback: { summary: "", items: [{ ...coded.feedback!.items[0], quote: null }] } };
    const a = band(noQuote, "communication");
    expect(a.band).toBe("Developing");
    expect(a.evidence).toContain("Not enough evidence");
    expect(a.byCode).toBe(false);
  });
  it("hints and failing tests lower problem solving; weakest axis picks the drill", () => {
    const weak = { ...coded, hints: ["a", "b", "c"], code: { ...coded.code!, passed: 1 } };
    expect(band(weak, "problem").band).toBe("Not yet");
    expect(band(weak, "coding").band).toBe("Not yet");
    expect(buildScorecard(weak)!.nextDrill).toMatch(/hint/); // problem comes before coding: first worst wins
  });
});

describe("buildScorecard: other rounds", () => {
  it("behavioral: ownership and numbers checked by code", () => {
    const s: InterviewSession = {
      ...base,
      round: "behavioral",
      turns: [
        { question: "q1", answer: "I built the signup flow and I cut drop-off by 20%." },
        { question: "q2", answer: "We planned it and our team shipped it." },
      ],
    };
    const own = band(s, "ownership");
    expect(own.byCode).toBe(true);
    expect(own.evidence[0]).toBe("“I/my” 2 times, “we/our” 2 times");
    expect(band(s, "numbers").evidence[0]).toBe("1 of 2 answers include a number");
    expect(band(s, "star").band).toBe("Not yet"); // no feedback STAR, no quotes
    expect(band(s, "complete").evidence[0]).toBe("2 of 4 questions answered");
  });
  it("design: board size and links", () => {
    const s: InterviewSession = {
      ...base,
      round: "design",
      turns: [{ question: "q", answer: "a" }],
      board: { n: [["n1", "client", "App", 0, 0], ["n2", "api", "API", 0, 0], ["n3", "db", "DB", 0, 0]], e: [["n1", "n2", ""]] },
    } as InterviewSession;
    expect(band(s, "components").band).toBe("Developing");
    expect(band(s, "connections").band).toBe("Solid");
  });
  it("returns null with nothing to grade", () => {
    expect(buildScorecard({ ...base, round: "screen" })).toBeNull();
  });
});

describe("findQuote", () => {
  it("finds a quote across spacing, case and curly quotes", () => {
    const a = "I said  “Let's ship it”\nand we did.";
    const at = findQuote(a, 'i said "let’s ship it" and');
    expect(at).not.toBeNull();
    expect(a.slice(...at!)).toBe("I said  “Let's ship it”\nand");
  });
  it("returns null when absent or too short", () => {
    expect(findQuote("hello world", "goodbye")).toBeNull();
    expect(findQuote("hello", "he")).toBeNull();
  });
});
