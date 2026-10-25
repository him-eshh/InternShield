import { beforeEach, describe, expect, it, vi } from "vitest";
import { advance, answerFollowUp, applyReview, awaiting, buildReviewRequest, buildSlots, buildSummary, canCallModel, defaultConfig, endEarly, loadActive, loadHistory, newPractice, progress, saveActive, saveToHistory, skip, skipReview, submitAnswer, totalBlocks } from "@/lib/tiers/session";
import { loadBank } from "@/lib/tiers/bank";
import type { InterviewContext, InterviewReply, SessionConfig } from "@/lib/tiers/types";
const context: InterviewContext = { company: null, role: null, description: null, resume: null, field: "tech" };
const start = (over: Partial<SessionConfig> = {}) => newPractice(defaultConfig(over), context, { id: "test", now: 10, seed: 7 }, []);
const review = (followUp: string | null = null, level: "strong" | "ok" | "weak" = "ok"): InterviewReply => ({ text: null, feedback: { summary: "Review", items: [{ index: 0, strength: "Clear example", improve: "Quantify the result", quote: "", star: { situation: true, task: true, action: true, result: false } }] }, followUp, level });
const finish = (s: ReturnType<typeof start>) => advance(skipReview(submitAnswer(s, "I worked with the team and measured the result.", 20), 21), [], 22);
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) });
});
describe("continuous session engine", () => {
  it("asks five questions across selected rounds and stops exactly at five", () => {
    let s = start();
    const questions: string[] = [];
    for (let i = 0; i < 5; i++) {
      expect(s.status).toBe("active");
      expect(progress(s).question).toBe(i + 1);
      questions.push(s.activeQuestion!.item.question);
      s = finish(s);
    }
    expect(s.status).toBe("done");
    expect(s.turns).toHaveLength(5);
    expect(new Set(questions).size).toBe(5);
    expect(new Set(s.turns.map((t) => t.round))).toEqual(new Set(["coding", "behavioral", "sql"]));
    expect(advance(s, [], 30)).toEqual(s);
  });
  it("counts complete rounds rather than questions in rounds mode", () => {
    let s = start({ rounds: ["behavioral", "sql"], limit: { kind: "rounds", count: 3 } });
    expect(totalBlocks(s)).toBe(3);
    expect(s.slots).toHaveLength(8);
    for (let i = 0; i < 8; i++) s = skip(s, [], 20 + i);
    expect(s.status).toBe("done");
    expect(s.turns).toHaveLength(8);
  });
  it("keeps custom questions first and verbatim, within the chosen limit", () => {
    const config = defaultConfig({ customQuestions: ["Why this team?", "Describe your approach."], rounds: ["sql"], limit: { kind: "questions", count: 3 } });
    expect(buildSlots(config).map((s) => s.custom ?? s.round)).toEqual(["Why this team?", "Describe your approach.", "sql"]);
  });
  it("never repeats runnable questions, even when they are skipped", () => {
    let s = start({ rounds: ["coding"], limit: { kind: "questions", count: 12 } });
    const ids: string[] = [];
    while (s.status === "active") {
      if (s.activeQuestion!.item.problemId) ids.push(s.activeQuestion!.item.problemId);
      s = skip(s, [], 40);
    }
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("honors coding topics, company and hard difficulty using the real bank", async () => {
    const bank = await loadBank();
    const s = newPractice(defaultConfig({ rounds: ["coding"], topics: ["array"], company: "Amazon", difficulty: "hard", language: "java" }), context, { id: "bank", now: 0, seed: 3 }, bank);
    expect(s.activeQuestion!.item.difficulty).toBe("Hard");
    expect(s.activeQuestion!.item.tags).toContain("array");
    expect(bank.find((q) => q.id === s.activeQuestion!.item.source)!.companies).toContain("Amazon");
    expect(s.activeQuestion!.item.kind).toBe("text");
  });
  it("requires review and limits follow-ups to two", () => {
    let s = submitAnswer(start({ rounds: ["behavioral"] }), "My example", 11);
    expect(awaiting(s)).toBe("review");
    expect(advance(s, [], 12)).toEqual(s);
    s = applyReview(s, review("What did you measure?"), 12);
    expect(awaiting(s)).toBe("followup");
    s = answerFollowUp(s, "Revenue increased 10 percent", 13);
    expect(buildReviewRequest(s, "review")!.turns).toHaveLength(2);
    s = applyReview(s, review("What would you change?"), 14);
    s = answerFollowUp(s, "I would start measuring earlier", 15);
    s = applyReview(s, review("A third follow-up?"), 16);
    expect(s.activeQuestion!.followUps).toHaveLength(2);
    expect(awaiting(s)).toBe("next");
    expect(buildReviewRequest(s, "review")!.followUpsLeft).toBe(0);
    expect(advance(s, [], 17).turns[0].followUps).toHaveLength(2);
  });
  it("steps mixed difficulty up and down after reviewed answers", () => {
    let s = start({ rounds: ["behavioral"] });
    s = advance(applyReview(submitAnswer(s, "example", 11), review(null, "strong"), 12), [], 13);
    expect(s.level).toBe(2);
    s = advance(applyReview(submitAnswer(s, "example", 14), review(null, "weak"), 15), [], 16);
    expect(s.level).toBe(1);
  });
  it("ends early, saves the answered current question and produces a recap", () => {
    const s = endEarly(submitAnswer(start(), "My approach", 12), 100);
    expect(s.status).toBe("done");
    expect(s.endedEarly).toBe(true);
    expect(buildSummary(s).answered).toBe(1);
    expect(endEarly(start(), 100).turns).toHaveLength(0);
  });
  it("resumes the exact in-flight follow-up after storage round trip", () => {
    const s = applyReview(submitAnswer(start({ rounds: ["behavioral"] }), "Example", 11), review("What result?"), 12);
    saveActive(s);
    expect(loadActive()).toEqual(s);
    expect(awaiting(loadActive()!)).toBe("followup");
    const ended = endEarly(s, 50);
    saveToHistory(ended);
    saveToHistory(ended);
    expect(loadHistory()).toHaveLength(1);
    expect(loadHistory()[0].summary.endedEarly).toBe(true);
  });
  it("enforces the model-call budget independently of question count", () => {
    const s = start();
    expect(canCallModel({ ...s, calls: 29 })).toBe(true);
    expect(canCallModel({ ...s, calls: 30 })).toBe(false);
    expect(buildReviewRequest(s, "review")!.practice).toBe(true);
  });
});

// Regression coverage for chosen filters, custom wording, saved data and variable-length scorecards.
describe("practice configuration and recovery", () => {
  it("falls back to the closest pool, same topic and difficulty, and says what it substituted", async () => {
    const bank = await loadBank();
    const s = newPractice(defaultConfig({ company: "No such company", rounds: ["coding"], topics: ["graph"], difficulty: "hard" }), context, { id: "none", now: 0, seed: 3 }, bank);
    const item = s.activeQuestion!.item;
    expect(item.source).not.toBe("unavailable");
    expect(item.tags).toContain("graph");
    expect(item.difficulty).toBe("Hard");
    expect(item.note).toMatch(/No No such company-tagged questions; showing/);
  });
  it("only reports no question when the whole bank is used up", () => {
    const tiny = [{ id: "lc-x", title: "X", difficulty: "Easy" as const, url: "https://leetcode.com/problems/x/", tags: ["array"], companies: ["Amazon"], source: "t" }];
    let s = newPractice(defaultConfig({ rounds: ["coding"], language: "java", limit: { kind: "questions", count: 3 } }), context, { id: "tiny", now: 0, seed: 3 }, tiny);
    expect(s.activeQuestion!.item.source).toBe("lc-x");
    s = skip(s, tiny, 5);
    expect(s.activeQuestion!.item.source).toBe("unavailable");
    expect(s.activeQuestion!.item.note).toMatch(/used/);
  });
  it("preserves custom question whitespace and removes duplicate questions", () => {
    const question = "  Explain your trade-offs?  ";
    const s = start({ customQuestions: [question, question] });
    expect(s.activeQuestion!.item.question).toBe(question);
    expect(s.slots.filter((slot) => slot.custom)).toHaveLength(1);
  });
  it("rejects damaged saved active state and history instead of crashing the page", () => {
    localStorage.setItem("is:practice-active", JSON.stringify({ ...start(), activeQuestion: { item: {} } }));
    expect(loadActive()).toBeNull();
    localStorage.setItem("is:practice-history", JSON.stringify([{ id: "broken", summary: {} }]));
    expect(loadHistory()).toEqual([]);
  });
  it("scores completeness against the chosen length and deduplicates strengths", () => {
    let s = start({ rounds: ["behavioral"], limit: { kind: "questions", count: 2 } });
    for (let i = 0; i < 2; i++) s = advance(applyReview(submitAnswer(s, "I owned the rollout and improved response time 20 percent", 12), review(null, "strong"), 13), [], 14);
    const summary = buildSummary(s);
    expect(summary.rounds[0].axes!.find((a) => a.id === "complete")!.band).toBe("Strong");
    expect(summary.strengths).toEqual(["Clear example"]);
  });
  it("does not score text system design as an empty drawing board", () => {
    let s = start({ rounds: ["design"], limit: { kind: "questions", count: 1 } });
    s = advance(applyReview(submitAnswer(s, "I would define load, data access, failure modes and a rollout plan.", 12), review(null, "strong"), 13), [], 14);
    expect(buildSummary(s).rounds[0].axes!.some((a) => a.id === "components")).toBe(false);
    expect(buildSummary(s).rounds[0].axes!.some((a) => a.id === "reasoning")).toBe(true);
  });
});

it("keeps failed SQL correctness visible in the summary instead of grading answer length", () => {
  let s = start({ rounds: ["sql"], limit: { kind: "questions", count: 1 } });
  s = submitAnswer(s, "I joined the tables and explained the result in detail.\n\nQuery:\nSELECT 123", 12, { problemId: s.activeQuestion!.item.problemId!, language: "sql", code: "SELECT 123", passed: 0, total: 1 });
  s = advance(applyReview(s, review(null, "strong"), 13), [], 14);
  const summary = buildSummary(s);
  expect(summary.rounds[0].axes!.find((a) => a.id === "coding")!.band).toBe("Not yet");
  expect(summary.rounds[0].axes!.find((a) => a.id === "coding")!.label).toBe("Query correctness");
  expect(summary.rounds[0].band).not.toBe("Strong");
});

it("lists distinct next drills when several rounds share the same weakest skill", () => {
  let s = start();
  for (let i = 0; i < 5; i++) s = advance(applyReview(submitAnswer(s, "I made a careful plan and checked the outcome with the team.", 12), review(null, "ok"), 13), [], 14);
  const next = buildSummary(s).next;
  expect(next.length).toBeGreaterThan(0);
  expect(new Set(next).size).toBe(next.length);
});
