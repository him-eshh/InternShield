// Bug C ("$1.2 million" to a percent question showed "1,200,000%") and standing issue #2 (which number is the answer).
import { describe, expect, it } from "vitest";
import { checkUnit, extractCandidates, formatInUnit, pickFinal, type NumUnit } from "@/lib/tiers/numbers";
import { checkAnswer, describeCheck, extractNumber } from "@/lib/tiers/scripted";
import type { AnswerCheck } from "@/lib/tiers/types";

const first = (s: string) => extractCandidates(s)[0];
const wacc: AnswerCheck = { kind: "number", expected: 7.5, tolerance: 0.05, unit: "%" };

describe("extractCandidates: the 19-case table from devpost/research/findings/05-assets/test.mjs", () => {
  // [input, value, unit]. "7-8%" is a range; its value is the midpoint 7.5 (the sketch kept the low end, 7).
  it.each<[string, number, NumUnit]>([
    ["$1.2 million", 1.2e6, "$"],
    ["$1.2M", 1.2e6, "$"],
    ["1.2mm", 1.2e6, ""],
    ["(1.2)", -1.2, ""],
    ["–7.5%", -7.5, "%"],
    ["-7.5%", -7.5, "%"],
    ["7.5 pct", 7.5, "%"],
    ["7.5 percent", 7.5, "%"],
    ["seven and a half percent", 7.5, "%"],
    ["7½%", 7.5, "%"],
    ["7-8%", 7.5, "%"],
    ["7–8%", 7.5, "%"],
    ["approx 7.5", 7.5, ""],
    ["≈7.5%", 7.5, "%"],
    ["7,5%", 7.5, "%"],
    ["0.075", 0.075, ""],
    ["$1,200,000", 1.2e6, "$"],
    ["1.2 billion dollars", 1.2e9, "$"],
    ["12 bps", 12, "bps"],
  ])("%s -> %s %s", (input, value, unit) => {
    const c = first(input);
    expect(c.value).toBeCloseTo(value, 9);
    expect(c.unit).toBe(unit);
  });

  it("keeps the range ends and flags approximations", () => {
    expect(first("7–8%").range).toEqual([7, 8]);
    expect(first("7.5%").range).toBeUndefined();
    expect(first("approx 7.5").approx).toBe(true);
    expect(first("≈7.5%").approx).toBe(true);
    expect(first("7.5%").approx).toBe(false);
  });
});

describe("extractCandidates: more shapes", () => {
  it.each<[string, number, NumUnit]>([
    ["1.2 M USD", 1.2e6, "$"],
    ["−$3.4bn", -3.4e9, "$"],
    ["7.5 per cent", 7.5, "%"],
    ["7.5x", 7.5, "x"],
    ["four thousand", 4000, ""],
    ["one and a half percent", 1.5, "%"],
    ["twelve thousand five hundred dollars", 12_500, "$"],
    ["€2,5 million", 2.5e6, "$"],
    ["1,200", 1200, ""],
    ["7,50", 7.5, ""],
    ["12 basis points", 12, "bps"],
    ["(2.5%)", -2.5, "%"],
  ])("%s -> %s %s", (input, value, unit) => {
    const c = first(input);
    expect(c.value).toBeCloseTo(value, 9);
    expect(c.unit).toBe(unit);
  });

  it("a numbered list item like (1) is not a negative", () => {
    expect(extractCandidates("(1) price, (2) volume").map((c) => c.value)).toEqual([1, 2]);
  });

  it("ranges merge, but a change or a subtraction does not", () => {
    expect(first("3,000-5,000").value).toBe(4000);
    expect(first("between 3k and 5k").range).toEqual([3000, 5000]);
    expect(extractCandidates("from 3,600 to 4,000 cups").map((c) => c.value)).toEqual([3600, 4000]);
    expect(extractCandidates("1350 - 1200").map((c) => c.value)).toEqual([1350, 1200]);
  });
});

describe("pickFinal", () => {
  const pick = (s: string, u: NumUnit = "") => pickFinal(extractCandidates(s), u)?.value ?? null;

  it("takes the number after the final-answer cue over distractors", () => {
    expect(pick("final answer: 7.5%, though WACC could be 8%", "%")).toBe(7.5);
    expect(pick("My answer is 7.5%. Debt was 40% of capital and equity 60%.", "%")).toBe(7.5);
    expect(pick("Revenue is $1.2 million, 40 employees, so the WACC is 7.5%", "%")).toBe(7.5);
    expect(pick("(6 * 1.25) = 7.5 so it comes to 7.5%", "%")).toBe(7.5);
  });

  it("about 7 or 8 percent, so 7.5% -> 7.5", () => {
    expect(pick("about 7 or 8 percent, so 7.5%", "%")).toBe(7.5);
  });

  it("without a cue, prefers the last number in the question's unit", () => {
    expect(pick("revenue 4.5 million, growth 12%, WACC 7.5%", "%")).toBe(7.5);
    expect(pick("WACC 7.5%, revenue $1.2 million", "%")).toBe(7.5);
    expect(pick("7.5% on $1.2 million", "$")).toBe(1.2e6);
  });

  it("falls back to a bare number, then to the last", () => {
    expect(pick("$1.2 million of revenue, I get 7.5", "%")).toBe(7.5);
    expect(pick("$1.2 million", "%")).toBe(1.2e6);
    expect(pick("")).toBeNull();
  });

  it("skips per-day counts unless that is all there is", () => {
    expect(pick("4,000 cups a month, so about 133 a day")).toBe(4000);
    expect(pick("$150 a day")).toBe(150);
  });
});

describe("checkUnit", () => {
  const c = (s: string, u: NumUnit) => checkUnit(pickFinal(extractCandidates(s), u), u);

  it("a dollar amount on a percent question is a mismatch with a plain message and no percent on the user's number", () => {
    const r = c("$1.2 million", "%");
    expect(r).toMatchObject({ ok: false, mismatch: true, value: 1.2e6, unit: "$" });
    expect(r.msg).toBe("This question expects a percent, but your answer looks like a dollar amount.");
  });

  it("a percent on a dollar question is a mismatch too", () => {
    expect(c("7.5%", "$").msg).toBe("This question expects a dollar amount, but your answer looks like a percent.");
  });

  it("reads a bare fraction on a percent question as a percent", () => {
    expect(c("0.075", "%")).toMatchObject({ ok: true, value: 7.5, unit: "%", note: "We read 0.075 as 7.5%" });
  });

  it("does not do that when the expected answer is itself under 1", () => {
    const r = checkUnit(first("0.5"), "%", 0.5);
    expect(r).toMatchObject({ ok: true, value: 0.5 });
    expect(r.note).toBeUndefined();
  });

  it("bps -> percent", () => {
    expect(c("12 bps", "%")).toMatchObject({ ok: true, value: 0.12, unit: "%" });
    expect(c("12 bps", "%").note).toBe("We read 12 bps as 0.12%");
  });

  it("a question with no unit never mismatches; no candidate says so", () => {
    expect(c("$150", "")).toMatchObject({ ok: true, mismatch: false });
    expect(checkUnit(null, "%")).toMatchObject({ ok: false, value: null });
  });

  it("converts a range the same way", () => {
    expect(c("0.07-0.08", "%")).toMatchObject({ ok: true, range: [7, 8], value: 7.5 });
  });
});

describe("formatInUnit", () => {
  it.each<[number, NumUnit, string]>([
    [1_200_000, "$", "$1,200,000"],
    [7.5, "%", "7.5%"],
    [-3.4e9, "$", "-$3,400,000,000"],
    [12, "bps", "12 bps"],
    [7.5, "x", "7.5x"],
    [4000, "", "4,000"],
    [0.123456, "%", "0.12%"],
  ])("%s %s -> %s", (v, u, want) => {
    expect(formatInUnit(v, u)).toBe(want);
  });
});

describe("checkAnswer / describeCheck: Bug C", () => {
  it("'$1.2 million' to the WACC question is a unit mismatch, shown in dollars, not percent", () => {
    const r = checkAnswer(wacc, "$1.2 million");
    expect(r).toMatchObject({ kind: "number", found: 1.2e6, correct: false, unitMismatch: true, foundUnit: "$", read: "$1,200,000", unit: "%" });
    expect(r.kind === "number" && r.read).not.toContain("%");
    const line = describeCheck(r);
    expect(line).toContain("Final number $1,200,000");
    expect(line).toContain("This question expects a percent, but your answer looks like a dollar amount.");
    expect(line).not.toContain("1,200,000%");
    expect(line).not.toContain("1200000%");
  });

  it("0.075 is read as 7.5% and graded correct, with the note", () => {
    expect(checkAnswer(wacc, "0.075")).toMatchObject({ found: 7.5, correct: true, note: "We read 0.075 as 7.5%" });
  });

  it("a bare 7.5 and '7,5%' are right; 12 bps is not", () => {
    expect(checkAnswer(wacc, "7.5")).toMatchObject({ found: 7.5, correct: true });
    expect(checkAnswer(wacc, "7,5%")).toMatchObject({ found: 7.5, correct: true });
    expect(checkAnswer(wacc, "12 bps")).toMatchObject({ found: 0.12, correct: false });
  });

  it("a range uses its midpoint and says so", () => {
    expect(checkAnswer(wacc, "5-10%")).toMatchObject({ found: 7.5, correct: true });
    expect(checkAnswer(wacc, "7 to 9%")).toMatchObject({ found: 8, correct: false });
    expect(checkAnswer(wacc, "7 to 9%")).toMatchObject({ note: "We used the midpoint of your range (7% to 9%)" });
  });

  it("a range that holds the answer within 2x tolerance is correct", () => {
    const r = checkAnswer({ kind: "number", expected: 7.1, tolerance: 0.5, unit: "%" }, "7-7.9%");
    expect(r).toMatchObject({ correct: true });
    expect(r.kind === "number" && r.note).toContain("includes the expected value");
  });

  it("a final-answer cue beats a later distractor", () => {
    expect(checkAnswer(wacc, "final answer: 7.5%, though WACC could be 8%")).toMatchObject({ found: 7.5, correct: true });
  });

  it("extractNumber stays a plain number", () => {
    expect(extractNumber("−$3.4bn")).toBe(-3.4e9);
    expect(extractNumber("7½%")).toBe(7.5);
    expect(extractNumber("no numbers")).toBeNull();
  });
});
