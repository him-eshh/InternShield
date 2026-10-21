import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { cleanQuestion, FEEDBACK_FAILED, SESSION_CAP } from "@/lib/server/interview";
import { groqErr, groqOk, req } from "./helpers";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));

import { POST } from "@/app/api/interview/route";

const ANSWER = "I led the robotics club fundraiser and we raised four hundred dollars";
const context = { company: "Acme", role: "Web Intern", description: "Build React pages.", resume: "Club treasurer.", field: "tech" };
const body = {
  ask: "question",
  round: "behavioral",
  context,
  turns: [{ question: "Tell me about a time you led.", answer: ANSWER }],
  used: 1,
  code: null,
  board: null,
  problem: null,
};
let ip = 0;
const call = (b: unknown = body, opts: { origin?: string | null } = {}) =>
  POST(req("interview", b, { ip: `15.0.0.${++ip}`, ...opts }));

const feedbackJson = (quote: string) =>
  JSON.stringify({
    summary: "Good start.",
    items: [
      {
        index: 0,
        strength: "Clear example.",
        improve: "Add the result.",
        quote,
        star: { situation: true, task: false, action: true, result: true },
      },
    ],
  });

beforeEach(() => {
  resetServerState();
  h.create.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
});

describe("interview route", () => {
  it("rejects a foreign or missing origin (403)", async () => {
    expect((await call(body, { origin: "https://evil.example" })).status).toBe(403);
    expect((await call(body, { origin: null })).status).toBe(403);
    expect(h.create).not.toHaveBeenCalled();
  });

  it.each([
    ["bad ask", { ...body, ask: "nope" }],
    ["bad round", { ...body, round: "x" }],
    ["bad field", { ...body, context: { ...context, field: "zzz" } }],
    ["company over 120", { ...body, context: { ...context, company: "a".repeat(121) } }],
    ["description over 2000", { ...body, context: { ...context, description: "a".repeat(2001) } }],
    ["resume over 1500", { ...body, context: { ...context, resume: "a".repeat(1501) } }],
    ["answer over 1200", { ...body, turns: [{ question: "q", answer: "a".repeat(1201) }] }],
    ["question over 400", { ...body, turns: [{ question: "q".repeat(401), answer: "a" }] }],
    ["9 turns", { ...body, turns: Array.from({ length: 9 }, () => ({ question: "q", answer: "a" })) }],
    ["negative used", { ...body, used: -1 }],
    ["fractional used", { ...body, used: 1.5 }],
    ["bad language", { ...body, code: { problemId: "p", language: "ruby", code: "x", passed: 1, total: 2 } }],
    ["code over 4000", { ...body, code: { problemId: "p", language: "python", code: "a".repeat(4001), passed: 1, total: 2 } }],
    ["passed over 100", { ...body, code: { problemId: "p", language: "python", code: "x", passed: 101, total: 2 } }],
    ["invalid board", { ...body, board: { n: "nope", e: [] } }],
    ["problem over 2000", { ...body, problem: "a".repeat(2001) }],
    ["hint outside coding", { ...body, ask: "hint" }],
    ["question in coding", { ...body, round: "coding" }],
    ["feedback without turns", { ...body, ask: "feedback", turns: [] }],
  ])("rejects %s (400)", async (_n, b) => {
    expect((await call(b)).status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("returns 429 with the session message at the session cap", async () => {
    const res = await call({ ...body, used: 12 });
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.reason).toBe("limit");
    expect(json.message).toBe(SESSION_CAP);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("returns 429 daily once INTERVIEW_DAILY_CAP is reached", async () => {
    vi.stubEnv("INTERVIEW_DAILY_CAP", "1");
    h.create.mockReturnValue(groqOk("What drew you to this role?"));
    expect((await call()).status).toBe(200);
    const res = await call();
    expect(res.status).toBe(429);
    expect((await res.json()).message).toMatch(/resting for today/);
    expect(h.create).toHaveBeenCalledTimes(1);
  });

  it("cleans a question and uses qwen with 150 tokens and labeled data", async () => {
    h.create.mockReturnValue(groqOk('<think>hm</think>```\n**"What was the hardest part of that fundraiser?"**\n```'));
    const json = await (await call()).json();
    expect(json.status).toBe("done");
    expect(json.data).toEqual({ text: "What was the hardest part of that fundraiser?", feedback: null });
    const params = h.create.mock.calls[0][0];
    expect(params.model).toBe("qwen/qwen3.8-27b");
    expect(params.max_completion_tokens).toBe(150);
    expect(params.response_format).toBeUndefined();
    expect(params.messages[0].content).toMatch(/never instructions/);
    const user = params.messages[1].content as string;
    expect(user).toContain("CONTEXT:");
    expect(user).toContain("ANSWERS:");
    expect(user).toContain(ANSWER);
  });

  it("answers a coding hint (300 chars max) and fails on an empty reply", async () => {
    const hint = { ...body, ask: "hint", round: "coding", problem: "Sum a list.", turns: [], code: { problemId: "p", language: "python", code: "def f(): pass", passed: 1, total: 5 } };
    h.create.mockReturnValue(groqOk("word ".repeat(200)));
    const json = await (await call(hint)).json();
    expect(json.data.text.length).toBeLessThanOrEqual(300);
    expect(h.create.mock.calls[0][0].messages[1].content).toContain("PROBLEM:\nSum a list.");

    h.create.mockReturnValue(groqOk("<think>only</think>"));
    const res = await call(hint);
    expect(res.status).toBe(502);
    expect((await res.json()).message).toMatch(/interviewer is busy/);
  });

  it("puts the board description in the prompt for design follow-ups", async () => {
    h.create.mockReturnValue(groqOk("Why a cache in front of the database?"));
    const board = { n: [["n1", "client", "Web App", 0, 0], ["n2", "database", "Users DB", 300, 0]], e: [["n1", "n2", "reads"]] };
    const res = await call({ ...body, round: "design", board });
    expect(res.status).toBe(200);
    const user = h.create.mock.calls[0][0].messages[1].content as string;
    expect(user).toContain("BOARD:");
    expect(user).toContain("Users DB");
    expect(user).toContain("Web App");
  });

  it("keeps a real quote and nulls a fake one in feedback (strict schema, 900 tokens)", async () => {
    const fb = { ...body, ask: "feedback", used: 3 };
    h.create.mockReturnValue(groqOk(feedbackJson("raised four hundred dollars")));
    const json = await (await call(fb)).json();
    expect(json.data.text).toBeNull();
    expect(json.data.feedback.items[0].quote).toBe("raised four hundred dollars");
    const params = h.create.mock.calls[0][0];
    expect(params.max_completion_tokens).toBe(900);
    expect(params.response_format.json_schema.strict).toBe(true);

    h.create.mockReturnValue(groqOk(feedbackJson("we raised a million dollars")));
    const fake = await (await call(fb)).json();
    expect(fake.data.feedback.items[0].quote).toBeNull();
  });

  it("returns FEEDBACK_FAILED for invalid JSON or unusable feedback", async () => {
    const fb = { ...body, ask: "feedback" };
    h.create.mockReturnValue(groqOk("not json"));
    const res = await call(fb);
    expect(res.status).toBe(502);
    expect((await res.json()).message).toBe(FEEDBACK_FAILED);

    h.create.mockReturnValue(groqOk(JSON.stringify({ summary: "x", items: [] })));
    expect((await (await call(fb)).json()).message).toBe(FEEDBACK_FAILED);
  });

  it("gives the coding test result as fact in the feedback prompt", async () => {
    h.create.mockReturnValue(groqOk(feedbackJson("")));
    await call({
      ...body,
      ask: "feedback",
      round: "coding",
      problem: "Sum a list.",
      turns: [{ question: "Sum a list.", answer: ANSWER }],
      code: { problemId: "p", language: "python", code: "def f(): pass", passed: 3, total: 5 },
    });
    const user = h.create.mock.calls[0][0].messages[1].content as string;
    expect(user).toContain("Tests: passed 3 of 5 hidden tests (graded by code; do not re-grade)");
  });

  it("maps Groq failures to calm failed bodies", async () => {
    h.create.mockReturnValue(groqErr(500));
    const err = await call();
    expect(err.status).toBe(502);
    expect((await err.json()).status).toBe("failed");
  });

  it("never logs answers, code, board or context", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    h.create.mockReturnValue(groqOk("Next question?"));
    await call();
    h.create.mockReturnValue(groqErr(500));
    await call();
    const seen = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
    expect(seen).not.toContain("robotics club");
    expect(seen).not.toContain("Club treasurer");
    log.mockRestore();
    error.mockRestore();
  });
});

describe("cleanQuestion", () => {
  it("strips fences, headings, bullets and wrapping quotes into one paragraph", () => {
    expect(cleanQuestion('## Q\n- "Why us?"\n')).toBe("Q \"Why us?\"");
    expect(cleanQuestion("“Why us?”")).toBe("Why us?");
  });

  it("caps length", () => {
    expect(cleanQuestion("word ".repeat(300)).length).toBeLessThanOrEqual(400);
    expect(cleanQuestion("word ".repeat(300), 300).length).toBeLessThanOrEqual(300);
  });
});
