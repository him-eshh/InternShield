import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Setup from "@/components/interview/Setup";
import { Summary } from "@/components/interview/Summary";
import Runner from "@/components/interview/Runner";
import { FeedbackCard, TestResults } from "@/components/interview/ReviewPanels";
import CodingRound from "@/components/tiers/interview/CodingRound";
import SqlRound from "@/components/tiers/interview/SqlRound";
import { loadBank } from "@/lib/tiers/bank";
import { advance, applyLocalReview, buildSummary, defaultConfig, endEarly, loadActive, newPractice, saveActive, submitAnswer, type PracticeState } from "@/lib/tiers/session";
import type { CodeAttempt, InterviewContext, InterviewSession } from "@/lib/tiers/types";

vi.mock("@/lib/tiers/runner", () => ({ runCode: vi.fn(), runSql: vi.fn(), stopRunners: vi.fn(), preloadPython: vi.fn() }));

const context: InterviewContext = { company: null, role: null, description: null, resume: null, field: "tech" };
const noop = () => {};
const sessionFor = (round: "coding" | "sql", problemId: string, code: CodeAttempt | null): InterviewSession => ({
  id: "s", round, context, turns: [], pending: "q", used: 0, seed: 1, problemId, code, hints: [], feedback: null, status: "active", createdAt: 0, updatedAt: 0,
});
const html = (n: React.ReactElement) => renderToStaticMarkup(n);
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) });
});

function answeredState(round: "coding" | "sql", code: CodeAttempt, approach: string): PracticeState {
  const s = newPractice(defaultConfig({ rounds: [round], limit: { kind: "questions", count: 2 } }), context, { id: "ui", now: 1, seed: 7 }, []);
  const withProblem = { ...s, activeQuestion: { ...s.activeQuestion!, item: { ...s.activeQuestion!.item, problemId: code.problemId } } };
  return applyLocalReview(submitAnswer(withProblem, approach, 5, code), 6);
}

describe("results first, feedback matched to the question type", () => {
  it("coding: test results card shows passed/total and the failing case, before any approach feedback", () => {
    const s = answeredState("coding", { problemId: "count-vowels", language: "python", code: "def count_vowels(s): return 0", passed: 4, total: 6, detail: { failed: { input: '"AEIOU"', expected: "5", got: "0" } } }, "Loop over letters.");
    const c = s.activeQuestion!;
    const results = html(<TestResults c={c} />);
    expect(results).toContain("4 of 6 hidden tests passed");
    expect(results).toContain("First failing case");
    expect(results).toContain("AEIOU");
    const fb = html(<FeedbackCard c={c} />);
    expect(fb).toContain("Code review");
    expect(fb).toContain("edge case");
    expect(fb).toContain("complexity");
    expect(fb).not.toMatch(/own action|STAR/);
    expect(fb).not.toContain("hidden tests passed"); // shown once, in the results card
  });

  it("SQL: shows the query verdict and SQL checks (NULLs, joins), never the behavioral line", () => {
    const s = answeredState("sql", { problemId: "sql-top-courses", language: "sql", code: "SELECT title FROM courses", passed: 0, total: 1, detail: { message: "Rows: 2 missing, 0 extra", diffs: ["Missing (Algorithms, 87)"] } }, "Selected the titles.");
    const c = s.activeQuestion!;
    const results = html(<TestResults c={c} />);
    expect(results).toContain("Your result does not match the expected rows");
    expect(results).toContain("Missing (Algorithms, 87)");
    const fb = html(<FeedbackCard c={c} />);
    expect(fb).toContain("SQL review");
    expect(fb).toContain("NULL");
    expect(fb).toContain("JOIN");
    expect(fb).not.toMatch(/own action|STAR|quantify the trade-off/);
  });

  it("behavioral: keeps STAR-style feedback and no test card", () => {
    let s = newPractice(defaultConfig({ rounds: ["behavioral"], limit: { kind: "questions", count: 1 } }), context, { id: "b", now: 1, seed: 7 }, []);
    s = applyLocalReview(submitAnswer(s, "I led the rollout and cut load time 30 percent.", 5), 6);
    const c = s.activeQuestion!;
    expect(html(<TestResults c={c} />)).toBe("");
    const fb = html(<FeedbackCard c={c} />);
    expect(fb).toContain("Answer feedback (STAR)");
    expect(fb).toContain("You used first-person wording; make your own actions clear.");
  });
});

describe("coding and SQL panels", () => {
  it("groups Hint and Skip with the run actions and makes Finish the primary step after a passing Submit", () => {
    const out = html(<CodingRound session={sessionFor("coding", "count-vowels", { problemId: "count-vowels", language: "python", code: "x", passed: 6, total: 6 })} onUpdate={noop} ask={async () => null} busy={false} onSkip={noop} />);
    const actions = out.slice(out.indexOf('aria-label="Actions"'), out.indexOf("hidden tests passed"));
    expect(actions).toContain("Run examples");
    expect(actions).toContain("Resubmit");
    expect(actions).toContain('aria-label="Ask for a hint"');
    expect(actions).toContain('aria-label="Skip question"');
    const finish = out.slice(out.indexOf("Finish and get feedback") - 520, out.indexOf("Finish and get feedback"));
    expect(finish).toContain("bg-accent");
    expect(out).not.toContain("Submit your code first");
  });

  it("keeps Finish secondary and explains the lock before any Submit", () => {
    const out = html(<CodingRound session={sessionFor("coding", "count-vowels", null)} onUpdate={noop} ask={async () => null} busy={false} />);
    expect(out).toContain("Submit your code to unlock feedback");
    expect(out).not.toContain("Finish and get feedback");
    expect(out).toMatch(/>\s*Submit<\/button>/);
  });

  it("shows the SQL tables as a row preview with an editor area and a wider question column", () => {
    const out = html(<SqlRound session={sessionFor("sql", "sql-top-courses", null)} onUpdate={noop} ask={async () => null} busy={false} onSkip={noop} />);
    expect(out).toContain("<caption");
    expect(out).toContain("students");
    expect(out).toContain("Ava Chen");
    expect(out).toContain("enrollments");
    expect(out).toContain("Run query");
    expect(out).toContain("text-pretty!");
    expect(out).toContain("lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)]");
  });
});

describe("Setup", () => {
  it("tells the user plainly when a company is outside the bank, and offers Most asked", async () => {
    const bank = await loadBank();
    const out = html(<Setup bank={bank} initial={defaultConfig({ company: "Stripe", role: "Backend engineer" })} onStart={noop} />);
    expect(out).toContain("No Stripe-tagged questions; showing similar fintech questions.");
    expect(out).toContain("Most asked at Stripe");
    expect(out).toContain('role="switch"');
  });

  it("confirms an exact company and lists grouped, searchable topics instead of a wall of chips", async () => {
    const bank = await loadBank();
    const out = html(<Setup bank={bank} initial={defaultConfig({ company: "Amazon" })} onStart={noop} />);
    expect(out).toMatch(/\d+ Amazon coding questions in the bank/);
    expect(out).not.toContain("showing similar");
    expect(out).toContain("Arrays and strings");
    expect(out).toContain("Trees and graphs");
    expect(out).toContain('type="search"');
    expect(out).toContain("<datalist");
    // Only the first group is open by default.
    expect(out.match(/<details[^>]* open/g)?.length).toBe(1);
    // Selects are wrapped with a chevron and keep their labels.
    for (const label of ["Difficulty", "Language", "Practice preset", "Count by"]) expect(out).toContain(`aria-label="${label}"`);
    expect(out).toContain("appearance-none");
  });

  it("hides Most asked when the coding round is off", async () => {
    const bank = await loadBank();
    const out = html(<Setup bank={bank} initial={defaultConfig({ rounds: ["behavioral"] })} onStart={noop} />);
    expect(out).not.toContain("Most asked");
  });
});

describe("Summary", () => {
  it("shows a trivial discussion answer as recorded without a quality grade", () => {
    let s = newPractice(defaultConfig({ rounds: ["behavioral"], limit: { kind: "questions", count: 1 } }), context, { id: "recorded", now: 1, seed: 7 }, []);
    s = advance(applyLocalReview(submitAnswer(s, "An answer", 5), 6), [], 7);
    const out = html(<Summary state={s} onAgain={noop} onHome={noop} onOpenTracker={noop} />);
    expect(out).toContain("Not scored");
    expect(out).toContain("Answers without runnable results are recorded without a quality grade.");
    expect(out).not.toContain("Solid");
    expect(out).not.toContain("Build on these strengths");
    const summary = buildSummary(s);
    const legacy = {
      ...summary, grounded: undefined,
      rounds: [{ ...summary.rounds[0], band: "Strong" as const, note: "You doubled sales" }],
      turns: summary.turns.map((t) => ({ ...t, level: "strong" as const, feedback: { ...t.feedback!, strength: "You doubled sales", improve: "You led ten teams", index: 0 }, followUps: [{ question: "How did you double sales?", answer: "My saved answer", note: "Strong leadership" }] })),
      strengths: ["You doubled sales"], next: ["Lead ten teams"],
    };
    const older = html(<Summary summary={legacy} onAgain={noop} onHome={noop} onOpenTracker={noop} />);
    expect(older).toContain("Not scored");
    expect(older).not.toContain("You doubled sales");
    expect(older).not.toContain("How did you double sales");
    expect(older).not.toContain("Lead ten teams");
    expect(older).toContain("My saved answer");
    expect(older).not.toContain("Strong");
  });
  it("shows no band or axes for a coding answer with no runnable result", () => {
    let s = newPractice(defaultConfig({ rounds: ["coding"], limit: { kind: "questions", count: 1 } }), context, { id: "no-tests", now: 1, seed: 7 }, []);
    s = advance(applyLocalReview(submitAnswer(s, "I would loop over the input.", 5), 6), [], 7);
    const out = html(<Summary state={s} onAgain={noop} onHome={noop} onOpenTracker={noop} />);
    expect(out).toContain("Not scored");
    expect(out).toContain("No runnable test result was recorded.");
    expect(out).not.toContain("Strong");
  });
  it("shows real numbers: answered, tests passed, time, per-round counts", () => {
    let s = answeredState("coding", { problemId: "count-vowels", language: "python", code: "x", passed: 5, total: 6 }, "Loop.");
    s = advance(s, [], 100_000);
    s = endEarly(s, 14 * 60_000 + 1);
    const out = html(<Summary state={s} onAgain={noop} onHome={noop} onOpenTracker={noop} />);
    expect(out).toContain("Session numbers");
    expect(out).toContain("1 of 1");
    expect(out).toContain("5 of 6");
    expect(out).toContain("Tests passed");
    expect(out).toContain("14 min");
    expect(out).toContain("1 of 1 answered · 5 of 6 tests passed");
  });
});

it("does not render older model praise or an invented pending follow-up after resume", () => {
  let s = newPractice(defaultConfig({ rounds: ["behavioral"], limit: { kind: "questions", count: 1 } }), context, { id: "old-active", now: 1, seed: 7 }, []);
  s = submitAnswer(s, "My real answer", 5);
  saveActive({ ...s, grounded: undefined, activeQuestion: { ...s.activeQuestion!, item: { ...s.activeQuestion!.item, source: "ai", question: "How did you double sales?" }, feedback: { index: 0, strength: "You doubled sales", improve: "Lead ten teams", quote: "My real answer", star: null }, level: "strong", followUps: [{ question: "How did you double sales?", answer: null }], reviewed: 1 } });
  const resumed = loadActive()!;
  const out = html(<Runner state={resumed} bank={[]} onChange={noop} />);
  expect(out).toContain("What would you check or change next?");
  expect(out).not.toMatch(/doubled sales|lead ten teams/i);
});
