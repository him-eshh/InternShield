import { describe, expect, it } from "vitest";
import { CASES, FINANCE_BANK, checkAnswer, checkTurn, describeCheck, extractNumber, findQuestion, scriptFor } from "@/lib/tiers/scripted";
import { MAX_QUESTION_CHARS, QUESTIONS_PER_ROUND, type AnswerCheck, type ScriptedQuestion } from "@/lib/tiers/types";

const ALL: ScriptedQuestion[] = [...CASES.flatMap((c) => c.questions), ...FINANCE_BANK];
const byId = (id: string) => ALL.find((q) => q.id === id)!;
const expected = (id: string) => {
  const c = byId(id).check;
  if (c?.kind !== "number") throw new Error(`${id} is not numeric`);
  return c;
};

describe("content", () => {
  it("has >= 4 cases of structure (rubric), calculation (number), recommendation (rubric)", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(4);
    for (const c of CASES) {
      expect(c.questions.map((q) => q.check?.kind)).toEqual(["rubric", "number", "rubric"]);
      expect(c.questions[1].prompt.endsWith("End with your final number.")).toBe(true);
      expect(c.questions[0].prompt).toMatch(/How would you structure this/);
    }
  });

  it("has >= 12 finance questions, >= 5 numeric, rubrics with 3-4 points", () => {
    expect(FINANCE_BANK.length).toBeGreaterThanOrEqual(12);
    expect(FINANCE_BANK.filter((q) => q.check?.kind === "number").length).toBeGreaterThanOrEqual(5);
    for (const q of FINANCE_BANK) {
      if (q.check?.kind === "rubric") {
        expect(q.check.points.length).toBeGreaterThanOrEqual(3);
        expect(q.check.points.length).toBeLessThanOrEqual(4);
      } else {
        expect(q.prompt.endsWith("End with your final number.")).toBe(true);
      }
    }
  });

  it("ids and prompts are unique, checked, and fit the route's question cap", () => {
    expect(new Set(ALL.map((q) => q.id)).size).toBe(ALL.length);
    expect(new Set(ALL.map((q) => q.prompt)).size).toBe(ALL.length);
    for (const q of ALL) {
      expect(q.check).not.toBeNull();
      expect(q.prompt.length).toBeLessThanOrEqual(MAX_QUESTION_CHARS);
      if (q.check?.kind === "rubric") for (const p of q.check.points) expect(p.any.length).toBeGreaterThan(0);
    }
  });

  it("script lengths match QUESTIONS_PER_ROUND", () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(scriptFor("case", seed)).toHaveLength(QUESTIONS_PER_ROUND.case);
      expect(scriptFor("finance", seed)).toHaveLength(QUESTIONS_PER_ROUND.finance);
    }
  });
});

describe("answer keys equal the arithmetic in their prompts", () => {
  // Each entry: the figures as they appear in the prompt, and the key recomputed from them.
  const keys: { id: string; shown: string[]; value: number }[] = [
    // Contribution $3.00 - $1.00 per cup; (target profit + fixed costs) / contribution.
    { id: "coffee-cart-2", shown: ["$3.00", "$1.00", "$6,000", "3,600", "$1,200", "$2,000"], value: (2000 + 6000) / (3 - 1) },
    { id: "bike-share-2", shown: ["$2 a ride", "9,000", "$3 a ride", "7,000", "$0.50"], value: 7000 * (3 - 0.5) - 9000 * (2 - 0.5) },
    { id: "bookstore-2", shown: ["$60,000", "$15,000", "60%", "$4,000"], value: 60000 / (15000 * (1 - 0.6) - 4000) },
    { id: "food-truck-2", shown: ["40 orders", "$10", "3 hours", "50 orders", "$9"], value: 50 * 9 * 3 - 40 * 10 * 3 },
    { id: "fin-ev-math", shown: ["$800,000", "$300,000", "$100,000"], value: 800000 + 300000 - 100000 },
    { id: "fin-wacc-math", shown: ["60%", "40%", "10%", "5%", "25%"], value: 0.6 * 10 + 0.4 * 5 * (1 - 0.25) },
    { id: "fin-growth-math", shown: ["$200,000", "10%", "2 years"], value: 200000 * 1.1 ** 2 },
    { id: "fin-margin-math", shown: ["$400,000", "$240,000", "$60,000"], value: ((400000 - 240000 - 60000) / 400000) * 100 },
    { id: "fin-multiple-math", shown: ["8 times", "$250,000", "$500,000", "$100,000"], value: 8 * 250000 - 500000 + 100000 },
    { id: "fin-receivables-math", shown: ["$30,000"], value: 30000 },
  ];

  it.each(keys)("$id", ({ id, shown, value }) => {
    const q = byId(id);
    for (const s of shown) expect(q.prompt).toContain(s);
    expect(expected(id).expected).toBeCloseTo(value, 6);
  });

  it("covers every numeric question", () => {
    const numeric = ALL.filter((q) => q.check?.kind === "number").map((q) => q.id);
    expect(keys.map((k) => k.id).sort()).toEqual(numeric.sort());
  });

  it("the coffee cart's current profit in the prompt is consistent too", () => {
    expect(3600 * (3 - 1) - 6000).toBe(1200);
  });

  it("percent keys use the percent value and unit %", () => {
    expect(expected("fin-wacc-math")).toMatchObject({ expected: 7.5, unit: "%" });
    expect(expected("fin-margin-math")).toMatchObject({ expected: 25, unit: "%" });
  });
});

describe("extractNumber", () => {
  it.each([
    ["$1,500", 1500],
    ["1.5k", 1500],
    ["1.5K", 1500],
    ["$1.2 million", 1200000],
    ["2m", 2000000],
    ["$3 billion", 3000000000],
    ["1.5bn", 1500000000],
    ["12%", 12],
    ["7.5 %", 7.5],
    ["-3", -3],
    ["a loss of -$250", -250],
    ["1,200 then 1,500", 1500],
    ["The answer is 4000.", 4000],
    ["between 10-20", 20],
    ["year-over-year 30 months", 30],
    ["in Q4", null],
    ["none", null],
    ["", null],
    ["0.25", 0.25],
    ["it's 3 km away", 3],
  ] as const)("%s -> %s", (text, want) => {
    expect(extractNumber(text)).toBe(want);
  });
});

describe("checkAnswer", () => {
  const n: AnswerCheck = { kind: "number", expected: 1500, tolerance: 1, unit: "$" };

  it("number: correct within the absolute tolerance, using the last number", () => {
    expect(checkAnswer(n, "So it's $1,500")).toEqual({ kind: "number", found: 1500, expected: 1500, correct: true, unit: "$" });
    expect(checkAnswer(n, "1,501")).toMatchObject({ correct: true });
    expect(checkAnswer(n, "1,499")).toMatchObject({ correct: true });
    expect(checkAnswer(n, "1,502")).toMatchObject({ correct: false });
    expect(checkAnswer(n, "1500 at first, then 1200")).toMatchObject({ found: 1200, correct: false });
    expect(checkAnswer(n, "I'm not sure")).toEqual({ kind: "number", found: null, expected: 1500, correct: false, unit: "$" });
  });

  it("rubric: case-insensitive, any keyword per point, labels in order", () => {
    const r: AnswerCheck = {
      kind: "rubric",
      points: [
        { label: "revenue", any: ["revenue", "sales"] },
        { label: "costs", any: ["cost"] },
        { label: "competition", any: ["compet", "rival"] },
      ],
    };
    expect(checkAnswer(r, "First SALES, then the COSTS side.")).toEqual({ kind: "rubric", covered: ["revenue", "costs"], missed: ["competition"] });
    expect(checkAnswer(r, "")).toEqual({ kind: "rubric", covered: [], missed: ["revenue", "costs", "competition"] });
    // Keywords start at a word: "cost" is not found inside "accosted".
    expect(checkAnswer(r, "He accosted me.")).toMatchObject({ covered: [] });
  });

  it("real case rubric: a good structure covers all four areas", () => {
    const q = CASES[0].questions[0];
    const r = checkAnswer(q.check!, "I'd split profit into revenue and costs, then look at customers and competitors nearby.");
    expect(r).toEqual({ kind: "rubric", covered: ["revenue", "costs", "customers", "competition"], missed: [] });
  });
});

describe("checkTurn / findQuestion", () => {
  it("findQuestion round-trips every question and rejects near misses", () => {
    for (const q of ALL) expect(findQuestion(q.prompt)).toBe(q);
    expect(findQuestion(`${ALL[0].prompt} `)).toBeNull();
    expect(findQuestion("Tell me about yourself.")).toBeNull();
  });

  it("checkTurn checks scripted turns and ignores the rest", () => {
    const q = byId("food-truck-2");
    expect(checkTurn({ question: q.prompt, answer: "50 x 9 x 3 = 1350, minus 1200 = 150" })).toMatchObject({ found: 150, correct: true });
    expect(checkTurn({ question: "Why this role?", answer: "150" })).toBeNull();
  });
});

describe("scriptFor", () => {
  it("is deterministic and null for other rounds", () => {
    expect(scriptFor("case", 5)).toEqual(scriptFor("case", 5));
    expect(scriptFor("finance", 17)).toEqual(scriptFor("finance", 17));
    expect(scriptFor("screen", 1)).toBeNull();
    expect(scriptFor("portfolio", 1)).toBeNull();
  });

  it("case picks one case by seed with the same seed rule as pick", () => {
    expect(scriptFor("case", 0)).toEqual(CASES[0].questions);
    expect(scriptFor("case", CASES.length + 1)).toEqual(CASES[1].questions);
    expect(scriptFor("case", -1)).toEqual(CASES[1].questions);
    expect(scriptFor("case", Number.NaN)).toEqual(CASES[0].questions);
    expect(scriptFor("case", 2.9)).toEqual(CASES[2].questions);
  });

  it("finance always gives 4 distinct bank questions, and seeds vary the set", () => {
    const sets = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const s = scriptFor("finance", seed)!;
      expect(s).toHaveLength(4);
      expect(new Set(s.map((q) => q.id)).size).toBe(4);
      for (const q of s) expect(FINANCE_BANK).toContain(q);
      sets.add(s.map((q) => q.id).join(","));
    }
    expect(sets.size).toBeGreaterThan(20);
    expect(scriptFor("finance", Number.POSITIVE_INFINITY)).toEqual(scriptFor("finance", 0));
  });

  it("returns a copy the caller can't use to change the bank", () => {
    const s = scriptFor("case", 0)!;
    s.pop();
    expect(CASES[0].questions).toHaveLength(3);
  });
});

describe("describeCheck", () => {
  it("writes one plain line ending (checked by code)", () => {
    expect(describeCheck({ kind: "number", found: 1500, expected: 1500, correct: true, unit: "$" })).toBe(
      "Final number 1500 vs expected 1500: correct (checked by code)",
    );
    expect(describeCheck({ kind: "number", found: 1200, expected: 1500, correct: false, unit: "$" })).toBe(
      "Final number 1200 vs expected 1500: not quite (checked by code)",
    );
    expect(describeCheck({ kind: "number", found: null, expected: 1500, correct: false, unit: "" })).toBe(
      "No final number found; expected 1500 (checked by code)",
    );
    expect(describeCheck({ kind: "number", found: 7.5, expected: 7.5, correct: true, unit: "%" })).toBe(
      "Final number 7.5% vs expected 7.5%: correct (checked by code)",
    );
    expect(describeCheck({ kind: "rubric", covered: ["revenue", "costs"], missed: ["competition"] })).toBe(
      "Key points covered: revenue, costs; missed: competition (checked by code)",
    );
    expect(describeCheck({ kind: "rubric", covered: [], missed: ["a"] })).toBe("Key points covered: none; missed: a (checked by code)");
    expect(describeCheck({ kind: "rubric", covered: ["a"], missed: [] })).toBe("Key points covered: a; missed: none (checked by code)");
  });
});
