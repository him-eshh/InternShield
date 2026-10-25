import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { typeGuide } from "@/lib/server/interview";
import { groqOk, req } from "./helpers";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));
import { POST } from "@/app/api/interview/route";

const context = { company: null, role: null, description: null, resume: null, field: "tech" };
const reviewJson = JSON.stringify({ summary: "ok", level: "ok", followUp: "", items: [{ index: 0, strength: "s", improve: "i", quote: "", star: { situation: false, task: false, action: false, result: false } }] });
let ip = 0;
const review = (round: string, extra: Record<string, unknown> = {}) =>
  POST(req("interview", { ask: "review", round, context, turns: [{ question: "Q", answer: "An answer" }], used: 1, problem: null, practice: true, followUpsLeft: 2, code: null, ...extra }, { ip: `16.0.0.${++ip}` }));
const systemOf = () => h.create.mock.calls[0][0].messages[0].content as string;

beforeEach(() => {
  resetServerState();
  h.create.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
  h.create.mockReturnValue(groqOk(reviewJson));
});

describe("question-type-aware review prompt (no live model: Groq is mocked)", () => {
  it("coding: tests are fact, then edge cases and complexity; follow-ups never ask about ten times the scale", async () => {
    await review("coding", { code: { problemId: "count-vowels", language: "python", code: "def f(s): return 0", passed: 4, total: 6 } });
    const sys = systemOf();
    expect(sys).toContain("This is a coding question");
    expect(sys).toMatch(/edge cases, time and space complexity/);
    expect(sys).toMatch(/an edge case, the complexity, or an alternative approach/);
    expect(sys).toMatch(/never "ten times the scale"/);
    expect(sys).not.toMatch(/10x larger/);
    expect(sys).not.toMatch(/Judge STAR/);
    expect(h.create.mock.calls[0][0].messages[1].content).toContain("Tests: passed 4 of 6 hidden tests");
  });

  it("SQL: NULL handling, joins and grouping; follow-ups about NULLs, indexes or duplicates", async () => {
    await review("sql", { code: { problemId: "sql-top-courses", language: "sql", code: "SELECT 1", passed: 0, total: 1 } });
    const sys = systemOf();
    expect(sys).toContain("This is a SQL question");
    expect(sys).toMatch(/NULL handling, join type and grouping/);
    expect(sys).toMatch(/NULL handling, indexes, or duplicate rows/);
    expect(sys).not.toMatch(/edge cases, time and space complexity/);
    expect(h.create.mock.calls[0][0].messages[1].content).toContain("did not match the expected rows");
  });

  it("behavioral: STAR judging, follow-ups about the result, learning or what happened next", async () => {
    await review("behavioral");
    const sys = systemOf();
    expect(sys).toContain("Judge STAR");
    expect(sys).toMatch(/measurable result, what they learned, what happened next/);
    expect(sys).not.toMatch(/This is a coding question|This is a SQL question/);
  });

  it("typeGuide is type-specific and keeps scale out of coding and SQL", () => {
    expect(typeGuide({ round: "coding", code: null }).followUp).not.toMatch(/10x|ten times the data/);
    expect(typeGuide({ round: "debugging", code: null }).judge).toMatch(/coding question/);
    expect(typeGuide({ round: "design", code: null }).judge).toBe("");
  });

  it.each([
    ["coding", { problemId: "count-vowels", language: "python", code: "def f(s): return 0", passed: 1, total: 6 }, "1 of 6 hidden tests passed.", "weak"],
    ["sql", { problemId: "sql-top-courses", language: "sql", code: "SELECT 1", passed: 0, total: 1 }, "The query result did not match the expected rows.", "weak"],
  ])("replaces model praise when %s executable results fail", async (round, code, summary, level) => {
    h.create.mockReturnValue(groqOk(JSON.stringify({
      summary: "Perfect solution.", level: "strong", followUp: "", items: [{
        index: 0, strength: "Everything is correct.", improve: "No changes needed.", quote: "", star: { situation: true, task: true, action: true, result: true },
      }],
    })));
    const json = await (await review(round, { code })).json();
    expect(json.data.feedback.summary).toBe(summary);
    expect(json.data.feedback.items[0].strength).not.toMatch(/Everything is correct/);
    expect(json.data.feedback.items[0].improve).not.toMatch(/No changes needed/);
    expect(json.data.level).toBe(level);
  });
});
