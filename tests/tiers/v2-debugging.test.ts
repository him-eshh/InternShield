import { describe, expect, it } from "vitest";
import ts from "typescript";
import { DEBUG_PROBLEMS, pickDebugProblem } from "@/lib/tiers/debugging";
import { getProblem, gradeOutputs, PROBLEMS } from "@/lib/tiers/problems";
import { buildRequest, canCall, newSession } from "@/lib/tiers/interview";
import type { CaseOutput, CodeTest } from "@/lib/tiers/types";

// Reference fixes live here, not in the app, so the user never gets them.
const FIX: Record<string, string> = {
  average_grade: `function average_grade(grades) {
    const done = grades.filter((g) => g !== null);
    return done.length ? done.reduce((a, b) => a + b, 0) / done.length : 0;
  }`,
  count_in_range: `function count_in_range(nums, lo, hi) { return nums.filter((x) => x >= lo && x <= hi).length; }`,
  top_k: `function top_k(nums, k) { return nums.slice().sort((a, b) => b - a).slice(0, k); }`,
  is_palindrome: `function is_palindrome(s) {
    const clean = s.toLowerCase().replace(/[^a-z0-9]/g, "");
    return clean === clean.split("").reverse().join("");
  }`,
  chunk: `function chunk(items, size) {
    const out = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
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

const failsSome = (code: string, name: string, cases: CodeTest[]) => gradeOutputs(cases, run(code, name, cases)).passed < cases.length;

describe("DEBUG_PROBLEMS", () => {
  it("has 5 problems with ids unique across all coding problems", () => {
    expect(DEBUG_PROBLEMS).toHaveLength(5);
    const ids = [...PROBLEMS, ...DEBUG_PROBLEMS].map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(DEBUG_PROBLEMS.map((p) => [p.id, p] as const))("%s: starters agree, buggy code fails, the fix passes", (_id, p) => {
    expect(p.starter.python).toContain(`def ${p.functionName}(`);
    expect(p.starter.typescript).toContain(`function ${p.functionName}`);
    expect(p.prompt.length).toBeLessThanOrEqual(400);
    const cases = [...p.examples, ...p.tests];
    const js = p.starter.javascript!;
    // The planted bug shows in a visible example and in the hidden tests.
    expect(failsSome(js, p.functionName, p.examples)).toBe(true);
    expect(failsSome(js, p.functionName, p.tests)).toBe(true);
    // TS starter transpiles to the same buggy program.
    const tsJs = ts.transpileModule(p.starter.typescript!, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    expect(gradeOutputs(cases, run(tsJs, p.functionName, cases))).toEqual(gradeOutputs(cases, run(js, p.functionName, cases)));
    expect(gradeOutputs(cases, run(FIX[p.functionName], p.functionName, cases)).passed).toBe(cases.length);
    expect(getProblem(p.id)).toBe(p);
  });

  it("picks by seed and wires a debugging session like coding", () => {
    expect(pickDebugProblem(7)).toBe(DEBUG_PROBLEMS[2]);
    expect(pickDebugProblem(NaN)).toBe(DEBUG_PROBLEMS[0]);
    const s = newSession("debugging", { company: "", role: "", description: "", resume: "", field: "tech" }, { id: "t", seed: 1, now: 0 });
    expect(s.problemId).toBe(DEBUG_PROBLEMS[1].id);
    expect(canCall(s, "hint")).toBe(true);
    expect(canCall(s, "question")).toBe(false);
    const code = { problemId: s.problemId!, language: "python" as const, code: "x", passed: 1, total: 6 };
    const req = buildRequest({ ...s, code }, "feedback");
    expect(req.code).toEqual(code);
    expect(req.problem).toBe(DEBUG_PROBLEMS[1].prompt);
  });
});
