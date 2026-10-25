import { beforeEach, describe, expect, it, vi } from "vitest";
import { advance, applyLocalReview, applyReview, awaiting, buildSummary, defaultConfig, newPractice, submitAnswer, type PracticeState } from "@/lib/tiers/session";
import { fitFollowUp, followUpFits, FOLLOWUP_POOLS, formatDuration, localReview, questionType, reviewChecks, summaryNumbers } from "@/lib/tiers/sessionFeedback";
import { sampleTables } from "@/lib/tiers/sql";
import type { InterviewContext, InterviewReply, CodeAttempt } from "@/lib/tiers/types";

const context: InterviewContext = { company: null, role: null, description: null, resume: null, field: "tech" };
const start = (round: "coding" | "sql" | "behavioral") => newPractice(defaultConfig({ rounds: [round], limit: { kind: "questions", count: 2 } }), context, { id: "t", now: 1, seed: 7 }, []);
const reply = (followUp: string | null): InterviewReply => ({ text: null, followUp, level: "ok", feedback: { summary: "s", items: [{ index: 0, strength: "ok", improve: "better", quote: "", star: null }] } });
const answered = (s: PracticeState, answer: string, code?: CodeAttempt) => submitAnswer(s, answer, 5, code ?? null);
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) });
});

describe("question types", () => {
  it("tells coding, SQL and behavioral apart", () => {
    expect(questionType({ kind: "code", round: "coding" })).toBe("coding");
    expect(questionType({ kind: "text", round: "coding" })).toBe("coding");
    expect(questionType({ kind: "sql", round: "sql" })).toBe("sql");
    expect(questionType({ kind: "text", round: "behavioral" })).toBe("behavioral");
    expect(questionType({ kind: "text", round: "design" })).toBe("discussion");
  });
});

describe("follow-ups match the question type", () => {
  it("rejects scale talk for coding and SQL, and coding talk for behavioral", () => {
    const scale = "How would your approach change at ten times the scale?";
    expect(followUpFits("coding", scale)).toBe(false);
    expect(followUpFits("sql", "What if the table had 10x more rows?")).toBe(false);
    expect(followUpFits("coding", "What edge case would break this?")).toBe(true);
    expect(followUpFits("behavioral", "What is the time complexity?")).toBe(false);
    expect(followUpFits("discussion", scale)).toBe(true);
  });

  it("swaps a mismatched model follow-up for one from the type's own pool, once per question", () => {
    const scale = "How would your approach change at ten times the scale?";
    const q = fitFollowUp("coding", scale, "k", []);
    expect(FOLLOWUP_POOLS.coding).toContain(q);
    expect(fitFollowUp("coding", scale, "k", [q])).not.toBe(q);
    expect(fitFollowUp("coding", "Which edge case first?", "k", [])).toBe("Which edge case first?");
    for (const p of FOLLOWUP_POOLS.coding.concat(FOLLOWUP_POOLS.sql, FOLLOWUP_POOLS.behavioral)) expect(p).not.toMatch(/ten times|10x|scale/i);
  });

  it("never offers 'ten times the scale' after a count_vowels warm-up", () => {
    let s = start("coding");
    const c = s.activeQuestion!;
    if (c.item.kind !== "code") s = { ...s, activeQuestion: { ...c, item: { ...c.item, kind: "code", problemId: "count-vowels" } } };
    s = answered(s, "I loop over the letters.");
    s = applyReview(s, reply("How would your approach change at ten times the scale?"), 6);
    expect(awaiting(s)).toBe("followup");
    const q = s.activeQuestion!.followUps[0].question;
    expect(q).not.toMatch(/scale|ten times/i);
    expect(FOLLOWUP_POOLS.coding).toContain(q);
  });
});

describe("code-built review", () => {
  const code = (passed: number, total = 6, extra: Partial<CodeAttempt> = {}): CodeAttempt => ({ problemId: "count-vowels", language: "python", code: "def f(s): pass", passed, total, ...extra });

  it("leads coding with test results and the first failing case, then edge cases and complexity", () => {
    const s = answered(start("coding"), "I count each vowel in one pass.", code(4, 6, { detail: { failed: { input: '"AEIOU"', expected: "5", got: "0" } } }));
    const checks = reviewChecks(s.activeQuestion!);
    expect(checks[0].id).toBe("tests");
    expect(checks[0].text).toMatch(/4 of 6 hidden tests passed\. First failure: input "AEIOU", expected 5, got 0\./);
    expect(checks.map((k) => k.id)).toEqual(expect.arrayContaining(["edge", "complexity"]));
    expect(checks.find((k) => k.id === "edge")!.ok).toBe(false);
    expect(checks.find((k) => k.id === "complexity")!.text).toMatch(/O\(n\)/);
    const r = localReview(s.activeQuestion!);
    expect(r.level).toBe("ok");
    expect(r.feedback.improve).toBe('Fix the first failing case: input "AEIOU", expected 5, got 0.');
    expect(r.feedback.strength).toBe("Your code ran and passed 4 of 6 hidden tests.");
    expect(JSON.stringify(r)).not.toMatch(/own action|quantify the trade-off/i);
  });

  it("credits a stated edge case and complexity", () => {
    const s = answered(start("coding"), "Single pass, O(n) time and O(1) space. Empty string returns 0.", code(6));
    const checks = reviewChecks(s.activeQuestion!);
    expect(checks.find((k) => k.id === "edge")!.ok).toBe(true);
    expect(checks.find((k) => k.id === "complexity")!.ok).toBe(true);
    expect(localReview(s.activeQuestion!).level).toBe("strong");
  });

  it("reviews SQL on the result, NULL handling, joins and grouping", () => {
    let s = start("sql");
    const item = s.activeQuestion!.item;
    expect(item.kind).toBe("sql");
    s = { ...s, activeQuestion: { ...s.activeQuestion!, item: { ...item, problemId: "sql-top-courses" } } };
    s = answered(s, "I averaged the grades.", { problemId: "sql-top-courses", language: "sql", code: "SELECT title, AVG(grade) FROM courses JOIN enrollments ON 1=1", passed: 0, total: 1, detail: { message: "Rows: 1 missing, 0 extra", diffs: ["Missing (Statistics, 91.5)"] } });
    const checks = reviewChecks(s.activeQuestion!);
    expect(checks[0].text).toMatch(/does not match the expected rows \(Rows: 1 missing, 0 extra\)\. First difference: Missing/);
    expect(checks.find((k) => k.id === "null")!.ok).toBe(false);
    expect(checks.find((k) => k.id === "null")!.text).toMatch(/IS NULL|COUNT\(column\)/);
    expect(checks.find((k) => k.id === "group")!.text).toMatch(/GROUP BY/);
    expect(checks.every((k) => !/STAR|edge case|complexity/i.test(k.text))).toBe(true);
    const good = reviewChecks({ ...s.activeQuestion!, code: { problemId: "sql-top-courses", language: "sql", passed: 1, total: 1, code: "SELECT c.title, ROUND(AVG(e.grade),1) FROM courses c JOIN enrollments e ON e.course_id=c.id WHERE e.grade IS NOT NULL GROUP BY c.id HAVING AVG(e.grade) >= 85" } });
    expect(good.filter((k) => k.id !== "tests").every((k) => k.ok)).toBe(true);
  });

  it("keeps STAR feedback for behavioral answers", () => {
    let s = answered(start("behavioral"), "We shipped a fix and things got better.");
    s = applyReview(s, { text: null, level: "ok", followUp: null, feedback: { summary: "", items: [{ index: 0, strength: "Clear story", improve: "Add a result", quote: "", star: { situation: true, task: true, action: true, result: false } }] } }, 6);
    const checks = reviewChecks(s.activeQuestion!);
    expect(checks.find((k) => k.id === "star")!.text).toMatch(/Missing from your story: result/);
    expect(checks.find((k) => k.id === "own")!.ok).toBe(false);
    expect(checks.find((k) => k.id === "result")!.ok).toBe(false);
  });

  it("applyLocalReview fills feedback and lets the session move on", () => {
    let s = answered(start("coding"), "A loop.", code(6));
    expect(awaiting(s)).toBe("review");
    s = applyLocalReview(s, 9);
    expect(awaiting(s)).toBe("next");
    expect(s.activeQuestion!.feedback!.strength).toBe("All 6 hidden tests passed.");
    expect(s.calls).toBe(0);
    expect(advance(s, [], 10).turns[0].level).toBe("strong");
  });
});

describe("summary numbers", () => {
  it("counts answered, tests passed, solved, time and hints for real", () => {
    let s = answered(start("coding"), "approach", { problemId: "count-vowels", language: "python", code: "x", passed: 5, total: 6 });
    s = advance(applyLocalReview(s, 6), [], 7);
    s = answered(s, "second", { problemId: "reverse-words", language: "python", code: "y", passed: 6, total: 6 });
    s = advance(applyLocalReview(s, 8), [], 9);
    expect(s.status).toBe("done");
    const n = summaryNumbers({ ...buildSummary(s), durationMs: 14 * 60_000 });
    expect(n.answered).toBe(2);
    expect(n.tests).toEqual({ passed: 11, total: 12 });
    expect(n.solved).toEqual({ done: 1, of: 2 });
    expect(n.rounds[0]).toMatchObject({ round: "coding", asked: 2, answered: 2 });
    expect(n.seconds).toBe(840);
    expect(formatDuration(30)).toBe("under 1 min");
    expect(formatDuration(840)).toBe("14 min");
    expect(formatDuration(4000)).toBe("1 h 7 min");
  });
});

describe("sample table preview", () => {
  it("parses the seeded tables so the preview matches the data", () => {
    const t = sampleTables();
    expect(t.map((x) => x.name)).toEqual(["students", "courses", "enrollments"]);
    expect(t[0].columns).toEqual(["id", "name", "major", "year"]);
    expect(t[0].rows).toHaveLength(8);
    expect(t[0].rows[0]).toEqual(["1", "Ava Chen", "CS", "2"]);
    expect(t[2].rows).toHaveLength(17);
    expect(t[2].rows.some((r) => r[2] === "NULL")).toBe(true);
  });
});
