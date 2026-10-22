// Regression tests for devpost/fix-log.md B10 (rubric matching) and B11 (number reading).
import { describe, expect, it } from "vitest";
import { CASES, FINANCE_BANK, checkAnswer, extractNumber } from "@/lib/tiers/scripted";
import type { AnswerCheck, ScriptedQuestion } from "@/lib/tiers/types";

const ALL: ScriptedQuestion[] = [...CASES.flatMap((c) => c.questions), ...FINANCE_BANK];
const byId = (id: string) => ALL.find((q) => q.id === id)!;

describe("B11 extractNumber: units, words, percents", () => {
  it.each([
    ["$1.2 million", 1_200_000],
    ["1.2M", 1_200_000],
    ["1.2m", 1_200_000],
    ["$1,200,000", 1_200_000],
    ["1.2 mil", 1_200_000],
    ["$1.2MM", 1_200_000],
    ["1,200k", 1_200_000],
    ["4k", 4000],
    ["about 4,000 cups", 4000],
    ["four thousand", 4000],
    ["twelve thousand five hundred", 12_500],
    ["one hundred and fifty", 150],
    ["twenty-five", 25],
    ["a million", 1_000_000],
    ["30 percent", 30],
    ["30 per cent", 30],
    ["30%", 30],
    ["no one knows, maybe 40", 40],
    ["someone said so", null],
    ["it's the one", null],
    ["2 miles", 2],
  ] as const)("%s -> %s", (text, want) => {
    expect(extractNumber(text)).toBe(want);
  });
});

describe("B11 extractNumber: ranges use the midpoint", () => {
  it.each([
    ["3,000-5,000", 4000],
    ["3,000 – 5,000 cups", 4000],
    ["between 3k and 5k", 4000],
    ["3k to 5k", 4000],
    ["3-5k", 4000],
    ["10%-20%", 15],
    // Not ranges: a change ("from ... to") and subtraction (second number smaller).
    ["from 3,600 to 4,000 cups", 4000],
    ["1350 - 1200", 1200],
  ] as const)("%s -> %s", (text, want) => {
    expect(extractNumber(text)).toBe(want);
  });
});

describe("B11 extractNumber: picks the stated answer, not a trailing number", () => {
  it.each([
    ["The answer is 4,000 cups, about 400 more than today.", 4000],
    ["Final answer: 150. I checked it twice over 3 days.", 150],
    ["4000 is my final answer.", 4000],
    ["(2,000 + 6,000) / 2 = 4,000 cups, which takes about 3 months to reach", 4000],
    ["I need 4,000 cups a month. That's about 133 cups a day.", 4000],
    ["4,000 cups a month, so about 133 a day", 4000],
    ["Total cost is $6,000 so I need about 4000 cups", 4000],
    ["50*9*3 = 1350 vs 1200, so $150 a day", 150],
    ["so the answer is four thousand cups", 4000],
    ["roughly 4000, give or take", 4000],
    ["$150 a day", 150],
  ] as const)("%s -> %s", (text, want) => {
    expect(extractNumber(text)).toBe(want);
  });
});

describe("B11 checkAnswer number: tolerance unchanged", () => {
  const q = byId("coffee-cart-2");
  it.each([
    ["four thousand cups", true],
    ["4,000 cups a month, roughly 133 a day", true],
    ["between 3,900 and 4,100", true],
    ["I'd say 4k", true],
    ["I'm guessing 3,000", false],
    ["4,001", false],
  ] as const)("%s -> correct %s", (answer, correct) => {
    expect(checkAnswer(q.check!, answer)).toMatchObject({ kind: "number", correct });
  });

  it("percent answers keep the percent value", () => {
    expect(checkAnswer(byId("fin-wacc-math").check!, "7.5 percent")).toMatchObject({ found: 7.5, correct: true });
    expect(checkAnswer(byId("fin-margin-math").check!, "about twenty-five percent")).toMatchObject({ found: 25, correct: true });
  });
});

describe("B10 rubric: stems and synonyms", () => {
  const one = (any: string[]): AnswerCheck => ({ kind: "rubric", points: [{ label: "p", any }] });

  it.each([
    [["student"], "How many STUDENTS pass by?"],
    [["drink"], "what people drinks"],
    [["price"], "Pricing first."],
    [["price"], "how it is priced"],
    [["rent"], "they rented a bigger spot"],
    [["supplies"], "the supply side"],
    [["customer"], "who the clients are"],
  ] as const)("%j matches %s", (any, answer) => {
    expect(checkAnswer(one([...any]), answer)).toMatchObject({ covered: ["p"] });
  });

  it("stems match whole words only", () => {
    expect(checkAnswer(one(["sales"]), "staff salaries")).toMatchObject({ covered: [] });
    expect(checkAnswer(one(["speed"]), "what they spend")).toMatchObject({ covered: [] });
    expect(checkAnswer(one(["cost"]), "He accosted me.")).toMatchObject({ covered: [] });
  });

  it("coffee structure: students / how many drink / cups per day cover customers and revenue", () => {
    const r = checkAnswer(byId("coffee-cart-1").check!, "number of students, how many drink coffee, cups per day");
    expect(r).toEqual({ kind: "rubric", covered: ["revenue", "customers"], missed: ["costs", "competition"] });
  });

  it("coffee structure: a reasonable full answer covers all four", () => {
    const r = checkAnswer(
      byId("coffee-cart-1").check!,
      "Look at pricing and cups sold per day, then overhead like milk and beans, who the student buyers are, and whether a new cart opened in the dining hall.",
    );
    expect(r).toMatchObject({ missed: [] });
  });

  it("recommendation: 'they should' is a call, a bare 'it should' is not", () => {
    const q = byId("coffee-cart-3");
    expect(checkAnswer(q.check!, "They should push volume to 4,000 cups and run an experiment.")).toMatchObject({ missed: [] });
    expect(checkAnswer(q.check!, "It should be fine.")).toMatchObject({ covered: [] });
  });

  const rubrics = ALL.filter((q) => q.check?.kind === "rubric");

  it.each(["", "   ", "I really enjoy hiking with my dog on weekends.", "um, I don't know"])(
    "an empty or off-topic answer %j covers nothing on any rubric",
    (answer) => {
      for (const q of rubrics) expect(checkAnswer(q.check!, answer)).toMatchObject({ covered: [] });
    },
  );
});
