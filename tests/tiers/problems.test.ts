import { describe, expect, it } from "vitest";
import { getProblem, gradeOutputs, pickProblem, PROBLEMS, sameValue } from "@/lib/tiers/problems";
import type { CaseOutput, CodeTest } from "@/lib/tiers/types";

// Reference solutions live here, not in the app, so the user never gets them.
const RIGHT: Record<string, string> = {
  count_vowels: `function count_vowels(s) { return (s.match(/[aeiou]/gi) || []).length; }`,
  reverse_words: `function reverse_words(s) { return s.split(/\\s+/).filter(Boolean).reverse().join(" "); }`,
  two_sum: `function two_sum(nums, target) {
    const seen = new Map();
    for (let j = 0; j < nums.length; j++) {
      if (seen.has(target - nums[j])) return [seen.get(target - nums[j]), j];
      if (!seen.has(nums[j])) seen.set(nums[j], j);
    }
    return [];
  }`,
  running_max: `function running_max(nums) {
    const out = [];
    for (const n of nums) out.push(out.length ? Math.max(out[out.length - 1], n) : n);
    return out;
  }`,
  group_anagrams: `function group_anagrams(words) {
    const groups = new Map();
    for (const w of words) {
      const k = w.split("").sort().join("");
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(w);
    }
    return [...groups.values()].map((g) => g.sort()).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  }`,
};

// Plausible beginner mistakes: each must fail at least one case.
const WRONG: Record<string, string> = {
  count_vowels: `function count_vowels(s) { return (s.match(/[aeiou]/g) || []).length; }`,
  reverse_words: `function reverse_words(s) { return s.split(" ").reverse().join(" "); }`,
  two_sum: `function two_sum(nums, target) {
    for (let i = 0; i < nums.length; i++) for (let j = 0; j < nums.length; j++) if (nums[i] + nums[j] === target) return [i, j];
    return [];
  }`,
  running_max: `function running_max(nums) { return nums.map((_, i) => Math.max(...nums.slice(0, i + 1), 0)); }`,
  group_anagrams: `function group_anagrams(words) {
    const groups = new Map();
    for (const w of words) {
      const k = w.split("").sort().join("");
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(w);
    }
    return [...groups.values()];
  }`,
};

function run(code: string, name: string, cases: CodeTest[]): CaseOutput[] {
  const fn = new Function(`${code}\nreturn ${name};`)() as (...a: unknown[]) => unknown;
  return cases.map((c) => {
    try {
      return { ok: true, value: JSON.parse(JSON.stringify(fn(...JSON.parse(JSON.stringify(c.args))))) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
}

describe("PROBLEMS", () => {
  it("has 5 problems with unique ids and function names", () => {
    expect(PROBLEMS).toHaveLength(5);
    expect(new Set(PROBLEMS.map((p) => p.id)).size).toBe(5);
    expect(new Set(PROBLEMS.map((p) => p.functionName)).size).toBe(5);
  });

  it.each(PROBLEMS.map((p) => [p.id, p] as const))("%s is well formed", (_id, p) => {
    expect(p.title).toBeTruthy();
    expect(p.prompt.length).toBeGreaterThan(20);
    expect(p.prompt.length).toBeLessThanOrEqual(400);
    expect(p.functionName).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(p.starter.python).toContain(`def ${p.functionName}(`);
    expect(p.starter.javascript).toContain(`function ${p.functionName}(`);
    expect(p.examples).toHaveLength(2);
    expect(p.tests.length).toBeGreaterThanOrEqual(5);
    for (const c of [...p.examples, ...p.tests]) {
      expect(Array.isArray(c.args)).toBe(true);
      expect(JSON.parse(JSON.stringify(c))).toEqual(c);
    }
  });

  it.each(PROBLEMS.map((p) => [p.id, p] as const))("%s: the reference solution passes everything", (_id, p) => {
    expect(RIGHT[p.functionName]).toBeTruthy();
    const cases = [...p.examples, ...p.tests];
    const g = gradeOutputs(cases, run(RIGHT[p.functionName], p.functionName, cases));
    expect(g).toEqual({ passed: cases.length, total: cases.length, results: cases.map(() => true) });
  });

  it.each(PROBLEMS.map((p) => [p.id, p] as const))("%s: a wrong solution fails a hidden test", (_id, p) => {
    const g = gradeOutputs(p.tests, run(WRONG[p.functionName], p.functionName, p.tests));
    expect(g.passed).toBeLessThan(g.total);
  });

  it("the starter code alone passes nothing", () => {
    for (const p of PROBLEMS) {
      const g = gradeOutputs(p.tests, run(p.starter.javascript, p.functionName, p.tests));
      expect(g.passed).toBe(0);
    }
  });
});

describe("getProblem / pickProblem", () => {
  it("finds by id, null otherwise", () => {
    expect(getProblem(PROBLEMS[2].id)).toBe(PROBLEMS[2]);
    expect(getProblem("nope")).toBeNull();
    expect(getProblem(null as unknown as string)).toBeNull();
  });

  it("picks deterministically for any seed", () => {
    expect(pickProblem(0)).toBe(PROBLEMS[0]);
    expect(pickProblem(7)).toBe(PROBLEMS[2]);
    expect(pickProblem(7)).toBe(pickProblem(7));
    expect(PROBLEMS).toContain(pickProblem(-3));
    expect(PROBLEMS).toContain(pickProblem(2.7));
    expect(pickProblem(NaN)).toBe(PROBLEMS[0]);
    expect(pickProblem(Infinity)).toBe(PROBLEMS[0]);
  });
});

describe("sameValue", () => {
  it("compares numbers within 1e-9", () => {
    expect(sameValue(0.1 + 0.2, 0.3)).toBe(true);
    expect(sameValue(1, 1.0000001)).toBe(false);
    expect(sameValue(3, "3")).toBe(false);
  });

  it("arrays are order-sensitive, objects are not", () => {
    expect(sameValue([1, 2], [1, 2])).toBe(true);
    expect(sameValue([1, 2], [2, 1])).toBe(false);
    expect(sameValue([1, 2], [1, 2, 3])).toBe(false);
    expect(sameValue({ a: 1, b: [2] }, { b: [2], a: 1 })).toBe(true);
    expect(sameValue({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(sameValue([], {})).toBe(false);
    expect(sameValue([[1, ["x"]]], [[1, ["x"]]])).toBe(true);
  });

  it("follows JSON semantics", () => {
    expect(sameValue(NaN, null)).toBe(true);
    expect(sameValue([undefined], [null])).toBe(true);
    expect(sameValue({ a: undefined, b: 1 }, { b: 1 })).toBe(true);
    expect(sameValue(null, null)).toBe(true);
    expect(sameValue(null, 0)).toBe(false);
    expect(sameValue(true, 1)).toBe(false);
    expect(sameValue("a", "a")).toBe(true);
  });

  it("never throws on values JSON can't encode", () => {
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(sameValue(loop, loop)).toBe(false);
    expect(sameValue(BigInt(1), 1)).toBe(false);
  });
});

describe("gradeOutputs", () => {
  const cases: CodeTest[] = [
    { args: [1], expected: [1, 2] },
    { args: [2], expected: "x" },
    { args: [3], expected: 0.3 },
  ];

  it("counts ok outputs that match", () => {
    const g = gradeOutputs(cases, [
      { ok: true, value: [1, 2] },
      { ok: true, value: "y" },
      { ok: true, value: 0.1 + 0.2 },
    ]);
    expect(g).toEqual({ passed: 2, total: 3, results: [true, false, true] });
  });

  it("errors and missing outputs fail", () => {
    const g = gradeOutputs(cases, [{ ok: false, error: "boom" }]);
    expect(g).toEqual({ passed: 0, total: 3, results: [false, false, false] });
    expect(gradeOutputs(cases, null as unknown as CaseOutput[]).passed).toBe(0);
  });

  it("an error carrying the right value still fails", () => {
    const bad = { ok: false, error: "x", value: [1, 2] } as unknown as CaseOutput;
    expect(gradeOutputs(cases.slice(0, 1), [bad]).results).toEqual([false]);
  });

  it("extra outputs are ignored", () => {
    const g = gradeOutputs(cases.slice(0, 1), [
      { ok: true, value: [1, 2] },
      { ok: true, value: 9 },
    ]);
    expect(g).toEqual({ passed: 1, total: 1, results: [true] });
  });
});
