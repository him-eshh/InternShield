import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KEYS, clearMyData } from "@/lib/client/storage";
import { fromJson, toJson } from "@/lib/tiers/board";
import { scriptFor } from "@/lib/tiers/scripted";
import {
  BEHAVIORAL_PROMPTS,
  CHALLENGE_PROMPTS,
  DESIGN_PROMPTS,
  PORTFOLIO_FIRST,
  answerPending,
  applyReply,
  buildRequest,
  canCall,
  challengeLeft,
  cleanLinks,
  firstQuestion,
  loadSessions,
  newSession,
  nextStep,
  removeSession,
  saveSession,
  validateFeedback,
} from "@/lib/tiers/interview";
import { getProblem, pickProblem } from "@/lib/tiers/problems";
import {
  CHALLENGE_MINUTES,
  MAX_ANSWER_CHARS,
  MAX_LINKS,
  MAX_LINK_CHARS,
  MAX_QUESTION_CHARS,
  MAX_SESSIONS,
  MAX_SESSION_TURNS,
  QUESTIONS_PER_ROUND,
  type InterviewContext,
  type InterviewRound,
  type InterviewSession,
  type InterviewTurn,
} from "@/lib/tiers/types";

// Made-up companies, roles and answers.
const ctx: InterviewContext = { company: "Brightleaf Labs", role: "Data Analyst Intern", description: null, resume: null, field: "tech" };
const none: InterviewContext = { company: null, role: null, description: null, resume: null, field: null };

const make = (round: InterviewRound, seed = 3, context = ctx) => newSession(round, context, { id: `s-${round}`, now: 100, seed });
const q = (text: string) => ({ text, feedback: null });

/** Answers the pending question and applies an AI follow-up, `n` times. */
function play(s: InterviewSession, n: number): InterviewSession {
  let cur = s;
  for (let i = 0; i < n; i++) {
    cur = answerPending(cur, `Answer ${i + 1}`, 200 + i);
    if (nextStep(cur) === "ask") cur = applyReply(cur, "question", q(`Follow-up ${i + 1}?`), 300 + i);
  }
  return cur;
}

describe("firstQuestion / newSession", () => {
  it("screen uses role and company when given, else 'this role'", () => {
    expect(firstQuestion("screen", ctx, 1)).toBe(
      "Thanks for making time. To start, tell me a little about yourself and why the Data Analyst Intern role at Brightleaf Labs interests you.",
    );
    expect(firstQuestion("screen", none, 1)).toBe(
      "Thanks for making time. To start, tell me a little about yourself and why this role interests you.",
    );
    expect(firstQuestion("screen", { ...none, company: "Acme" }, 1)).toContain("why this role at Acme interests you");
    expect(firstQuestion("screen", { ...none, role: "Design Intern" }, 1)).toContain("why the Design Intern role interests you");
  });

  it("behavioral and design pick a made-up prompt by seed", () => {
    expect(BEHAVIORAL_PROMPTS).toHaveLength(6);
    expect(DESIGN_PROMPTS).toHaveLength(4);
    expect(firstQuestion("behavioral", ctx, 0)).toBe(BEHAVIORAL_PROMPTS[0]);
    expect(firstQuestion("behavioral", ctx, 7)).toBe(BEHAVIORAL_PROMPTS[1]);
    expect(firstQuestion("design", ctx, 6)).toBe(DESIGN_PROMPTS[2]);
    expect(firstQuestion("design", ctx, -1)).toBe(DESIGN_PROMPTS[1]);
    expect(firstQuestion("behavioral", ctx, Number.NaN)).toBe(BEHAVIORAL_PROMPTS[0]);
  });

  it("coding uses the seeded problem's prompt and sets problemId", () => {
    const s = make("coding", 2);
    expect(s.problemId).toBe(pickProblem(2).id);
    expect(s.pending).toBe(pickProblem(2).prompt);
    expect(firstQuestion("coding", ctx, 2)).toBe(pickProblem(2).prompt);
  });

  it("starts active with the local question pending and no AI call used", () => {
    const s = make("screen");
    expect(s).toMatchObject({ id: "s-screen", round: "screen", turns: [], used: 0, seed: 3, problemId: null, code: null, board: null, hints: [], feedback: null, status: "active", createdAt: 100, updatedAt: 100 });
    expect(s.pending).toBe(firstQuestion("screen", ctx, 3));
    expect(nextStep(s)).toBe("answer");
  });
});

describe("state machine", () => {
  it("moves the pending question into turns", () => {
    const s = make("behavioral");
    const a = answerPending(s, "  I organized a campus food drive.  ", 150);
    expect(a.turns).toEqual([{ question: s.pending, answer: "I organized a campus food drive." }]);
    expect(a.pending).toBeNull();
    expect(a.updatedAt).toBe(150);
    expect(s.turns).toHaveLength(0);
  });

  it("ignores an empty answer or no pending question, and caps long answers", () => {
    const s = make("screen");
    expect(answerPending(s, "   ", 1)).toBe(s);
    const a = answerPending(s, "x", 1);
    expect(answerPending(a, "again", 2)).toBe(a);
    expect(answerPending(s, "y".repeat(5000), 1).turns[0].answer).toHaveLength(MAX_ANSWER_CHARS);
  });

  it.each(["screen", "behavioral", "design"] as const)("%s asks follow-ups until its question count, then feedback", (round) => {
    const total = QUESTIONS_PER_ROUND[round];
    let s = make(round);
    for (let i = 0; i < total; i++) {
      expect(nextStep(s)).toBe("answer");
      s = answerPending(s, `Answer ${i}`, 10);
      if (i < total - 1) {
        expect(nextStep(s)).toBe("ask");
        s = applyReply(s, "question", q(`Next ${i}?`), 11);
      }
    }
    expect(s.turns).toHaveLength(total);
    expect(s.used).toBe(total - 1);
    expect(nextStep(s)).toBe("feedback");
    expect(canCall(s, "question")).toBe(false);
    expect(canCall(s, "feedback")).toBe(true);
  });

  it("coding has one question and no AI follow-ups", () => {
    const s = make("coding");
    expect(canCall(s, "question")).toBe(false);
    const a = answerPending(s, "Loop and count.", 5);
    expect(nextStep(a)).toBe("feedback");
  });

  it("applyReply counts every call and routes question, hint and feedback", () => {
    const s = answerPending(make("coding"), "My approach", 5);
    const h1 = applyReply(s, "hint", q("Think about a set of vowels."), 6);
    const h2 = applyReply(h1, "hint", q("Lower-case the string first."), 7);
    expect(h2.used).toBe(2);
    expect(h2.hints).toEqual(["Think about a set of vowels.", "Lower-case the string first."]);
    expect(s.hints).toEqual([]);

    const fb = { summary: "Good work.", items: [{ index: 0, strength: "Clear.", improve: "Test edge cases.", quote: "My approach", star: null }] };
    const d = applyReply(h2, "feedback", { text: null, feedback: fb }, 8);
    expect(d.used).toBe(3);
    expect(d.status).toBe("done");
    expect(d.feedback).toEqual(fb);
    expect(d.pending).toBeNull();
    expect(nextStep(d)).toBe("done");
    expect(canCall(d, "feedback")).toBe(false);

    const asked = applyReply(answerPending(make("screen"), "Hi", 1), "question", q("Why data?"), 2);
    expect(asked.pending).toBe("Why data?");
    expect(asked.used).toBe(1);
    expect(asked.updatedAt).toBe(2);
  });

  it("an empty or mismatched reply still counts but changes nothing else", () => {
    const s = answerPending(make("screen"), "Hi", 1);
    const r = applyReply(s, "question", q("   "), 2);
    expect(r.used).toBe(1);
    expect(r.pending).toBeNull();
    const f = applyReply(s, "feedback", q("not feedback"), 3);
    expect(f.status).toBe("active");
    expect(f.used).toBe(1);
  });

  it("hint is only for coding", () => {
    expect(canCall(make("screen"), "hint")).toBe(false);
    expect(canCall(make("design"), "hint")).toBe(false);
    expect(canCall(make("coding"), "hint")).toBe(true);
  });

  it("feedback needs at least one answer", () => {
    const s = make("screen");
    expect(canCall(s, "feedback")).toBe(false);
    expect(canCall(answerPending(s, "Hi", 1), "feedback")).toBe(true);
  });

  it("always keeps the last session call for feedback", () => {
    const s = { ...answerPending(make("coding"), "x", 1), used: MAX_SESSION_TURNS - 2 };
    expect(canCall(s, "hint")).toBe(true);
    const last = applyReply(s, "hint", q("Nudge."), 2);
    expect(last.used).toBe(MAX_SESSION_TURNS - 1);
    expect(canCall(last, "hint")).toBe(false);
    expect(canCall(last, "feedback")).toBe(true);
    expect(canCall({ ...last, used: MAX_SESSION_TURNS }, "feedback")).toBe(false);

    const text = { ...answerPending(make("screen"), "x", 1), used: MAX_SESSION_TURNS - 1 };
    expect(canCall(text, "question")).toBe(false);
    expect(nextStep(text)).toBe("feedback");
  });

  it("play helper reaches feedback for a full screen round", () => {
    const s = play(make("screen"), 4);
    expect(s.turns.map((t) => t.answer)).toEqual(["Answer 1", "Answer 2", "Answer 3", "Answer 4"]);
    expect(nextStep(s)).toBe("feedback");
  });
});

describe("buildRequest", () => {
  it("sends the session state for a question", () => {
    const s = answerPending(make("behavioral"), "I led a club event.", 1);
    expect(buildRequest(s, "question")).toEqual({
      ask: "question",
      round: "behavioral",
      context: ctx,
      turns: s.turns,
      used: 0,
      code: null,
      board: null,
      problem: null,
    });
  });

  it("coding includes the problem prompt and code; design includes the board", () => {
    const c = { ...make("coding", 1), code: { problemId: pickProblem(1).id, language: "python" as const, code: "def f(): pass", passed: 1, total: 5 } };
    const r = buildRequest(c, "hint");
    expect(r.problem).toBe(getProblem(c.problemId)?.prompt);
    expect(r.code).toEqual(c.code);
    expect(r.board).toBeNull();

    const board = { n: [["n1", "client", "Web app", 0, 0]], e: [] } as InterviewSession["board"];
    const d = buildRequest({ ...answerPending(make("design"), "A client.", 1), board }, "question");
    expect(d.board).toEqual(board);
    expect(d.problem).toBeNull();
    expect(d.code).toBeNull();
  });

  it("caps every field to what the route accepts", () => {
    const long: InterviewContext = { company: "c".repeat(300), role: "r".repeat(300), description: "d".repeat(3000), resume: "e".repeat(3000), field: "tech" };
    const s = { ...make("coding", 0, long), turns: [{ question: "q".repeat(900), answer: "a".repeat(5000) }] };
    const r = buildRequest(s, "feedback");
    expect(r.context.company).toHaveLength(120);
    expect(r.context.role).toHaveLength(120);
    expect(r.context.description).toHaveLength(2000);
    expect(r.context.resume).toHaveLength(1500);
    expect(r.turns[0].question).toHaveLength(400);
    expect(r.turns[0].answer).toHaveLength(1200);
  });
});

describe("Tier 4 rounds", () => {
  const biz: InterviewContext = { ...none, field: "business" };

  it("case and finance start with their first scripted question", () => {
    expect(firstQuestion("case", biz, 2)).toBe(scriptFor("case", 2)![0].prompt);
    expect(firstQuestion("finance", biz, 9)).toBe(scriptFor("finance", 9)![0].prompt);
    expect(make("case", 2).pending).toBe(scriptFor("case", 2)![0].prompt);
  });

  it("portfolio and challenge first questions are local and fit the question cap", () => {
    expect(firstQuestion("portfolio", ctx, 7)).toBe(PORTFOLIO_FIRST);
    expect(CHALLENGE_PROMPTS.length).toBeGreaterThanOrEqual(4);
    expect(firstQuestion("challenge", ctx, 0)).toBe(CHALLENGE_PROMPTS[0]);
    expect(firstQuestion("challenge", ctx, CHALLENGE_PROMPTS.length + 1)).toBe(CHALLENGE_PROMPTS[1]);
    expect(firstQuestion("challenge", ctx, Number.NaN)).toBe(CHALLENGE_PROMPTS[0]);
    for (const p of [PORTFOLIO_FIRST, ...CHALLENGE_PROMPTS]) expect(p.length).toBeLessThanOrEqual(MAX_QUESTION_CHARS);
  });

  it.each(["case", "finance"] as const)("%s advances locally through its script, then feedback, with zero AI calls", (round) => {
    const script = scriptFor(round, 11)!;
    expect(script).toHaveLength(QUESTIONS_PER_ROUND[round]);
    let s = make(round, 11);
    for (let i = 0; i < script.length; i++) {
      expect(nextStep(s)).toBe("answer");
      expect(s.pending).toBe(script[i].prompt);
      expect(canCall(s, "question")).toBe(false);
      s = answerPending(s, `My answer ${i}`, 10 + i);
    }
    expect(s.pending).toBeNull();
    expect(s.used).toBe(0);
    expect(s.turns.map((t) => t.question)).toEqual(script.map((q) => q.prompt));
    expect(nextStep(s)).toBe("feedback");
    expect(canCall(s, "question")).toBe(false);
    expect(canCall(s, "hint")).toBe(false);
    expect(canCall(s, "feedback")).toBe(true);
    expect(answerPending(s, "extra", 99)).toBe(s);

    const fb = { summary: "Solid.", items: [{ index: 0, strength: "Clear.", improve: "Be concise.", quote: null, star: null }] };
    const done = applyReply(s, "feedback", { text: null, feedback: fb }, 50);
    expect(done.used).toBe(1);
    expect(nextStep(done)).toBe("done");
  });

  it("a scripted round mid-way can still get feedback, and never asks the AI", () => {
    const s = answerPending(make("case", 0), "Revenue and costs.", 1);
    expect(nextStep(s)).toBe("answer");
    expect(canCall(s, "question")).toBe(false);
    expect(canCall(s, "feedback")).toBe(true);
  });

  it.each(["portfolio", "challenge"] as const)("%s asks AI follow-ups until its question count", (round) => {
    const total = QUESTIONS_PER_ROUND[round];
    let s = make(round);
    for (let i = 0; i < total; i++) {
      s = answerPending(s, `Answer ${i}`, 10);
      if (i < total - 1) {
        expect(nextStep(s)).toBe("ask");
        s = applyReply(s, "question", q(`Next ${i}?`), 11);
      }
    }
    expect(s.used).toBe(total - 1);
    expect(nextStep(s)).toBe("feedback");
  });

  it("buildRequest sends the board for challenge and links only when present", () => {
    const board = toJson(fromJson({ n: [["n1", "screen", "Welcome", 0, 0], ["n2", "screen", "Pick a slot", 200, 0]], e: [["n1", "n2", "Next"]] })!);
    const c = buildRequest({ ...answerPending(make("challenge"), "Two screens.", 1), board }, "question");
    expect(c.board).toEqual(board);
    expect(buildRequest({ ...make("screen"), board }, "question").board).toBeNull();
    expect("links" in buildRequest(make("portfolio"), "question").context).toBe(false);

    const links = ["https://example.com/a", "javascript:alert(1)", `https://example.com/${"x".repeat(MAX_LINK_CHARS)}`, ...Array.from({ length: 8 }, (_, i) => `https://example.com/p${i}`)];
    const p = buildRequest(make("portfolio", 1, { ...ctx, field: "design", links }), "question");
    expect(p.context.links).toEqual(["https://example.com/a", "https://example.com/p0", "https://example.com/p1", "https://example.com/p2", "https://example.com/p3"]);
    expect(p.context.links).toHaveLength(MAX_LINKS);
  });

  it("challengeLeft counts down CHALLENGE_MINUTES from createdAt and stops at 0", () => {
    const s = make("challenge"); // createdAt 100
    const full = CHALLENGE_MINUTES * 60_000;
    expect(challengeLeft(s, 100)).toBe(full);
    expect(challengeLeft(s, 100 + 60_000)).toBe(full - 60_000);
    expect(challengeLeft(s, 100 + full)).toBe(0);
    expect(challengeLeft(s, 100 + full + 5_000)).toBe(0);
  });
});

describe("cleanLinks", () => {
  it("keeps http(s) links split on whitespace, deduped, first MAX_LINKS", () => {
    expect(cleanLinks("https://a.example/work\n\n  http://b.example  https://a.example/work")).toEqual(["https://a.example/work", "http://b.example"]);
    const many = Array.from({ length: 9 }, (_, i) => `https://site.example/${i}`).join("\n");
    expect(cleanLinks(many)).toEqual(Array.from({ length: MAX_LINKS }, (_, i) => `https://site.example/${i}`));
  });

  it("rejects other protocols, bare text and over-long links", () => {
    expect(cleanLinks("javascript:alert(1) data:text/html,hi ftp://files.example/x file:///etc/passwd mailto:a@b.example")).toEqual([]);
    expect(cleanLinks("my portfolio example.com www.example.com http:/broken https://")).toEqual([]);
    const long = `https://example.com/${"y".repeat(MAX_LINK_CHARS)}`;
    const edge = `https://example.com/${"z".repeat(MAX_LINK_CHARS - "https://example.com/".length)}`;
    expect(edge).toHaveLength(MAX_LINK_CHARS);
    expect(cleanLinks(`${long} ${edge}`)).toEqual([edge]);
    expect(cleanLinks("")).toEqual([]);
  });
});

describe("board screen kind", () => {
  it("round-trips through toJson / fromJson", () => {
    const raw = { n: [["n1", "screen", "Sign up", 20, 20]], e: [] };
    const b = fromJson(raw);
    expect(b?.nodes[0].kind).toBe("screen");
    expect(toJson(b!)).toEqual(raw);
  });
});

describe("validateFeedback", () => {
  const turns: InterviewTurn[] = [
    { question: "Tell me about a time you led.", answer: "I led the chess club fundraiser and we raised three hundred dollars." },
    { question: "What went wrong?", answer: "We picked a date during exams, so fewer people came." },
  ];
  const item = (over: Record<string, unknown> = {}) => ({
    index: 0,
    strength: "Clear example.",
    improve: "Say what you learned.",
    quote: "raised three hundred dollars",
    star: { situation: true, task: false, action: true, result: true },
    ...over,
  });

  it("keeps a real quote and STAR for behavioral", () => {
    const fb = validateFeedback({ summary: "  Good start. ", items: [item()] }, turns, "behavioral");
    expect(fb).toEqual({
      summary: "Good start.",
      items: [{ index: 0, strength: "Clear example.", improve: "Say what you learned.", quote: "raised three hundred dollars", star: { situation: true, task: false, action: true, result: true } }],
    });
  });

  it("drops a fake quote or a quote from another answer", () => {
    const fb = validateFeedback({ summary: "x", items: [item({ quote: "raised a million dollars" }), item({ index: 1, quote: "chess club" })] }, turns, "behavioral");
    expect(fb?.items.map((i) => i.quote)).toEqual([null, null]);
    expect(validateFeedback({ summary: "x", items: [item({ quote: "" })] }, turns, "screen")?.items[0].quote).toBeNull();
  });

  it("drops out-of-range, non-integer and duplicate indexes", () => {
    const fb = validateFeedback(
      { summary: "x", items: [item({ index: 5 }), item({ index: -1 }), item({ index: 0.5 }), item({ index: "0" }), item({ index: 1, quote: "fewer people came" }), item({ index: 1, strength: "dup" })] },
      turns,
      "screen",
    );
    expect(fb?.items).toHaveLength(1);
    expect(fb?.items[0]).toMatchObject({ index: 1, strength: "Clear example.", quote: "fewer people came" });
  });

  it("sets star to null outside behavioral and when malformed", () => {
    expect(validateFeedback({ summary: "x", items: [item()] }, turns, "screen")?.items[0].star).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item()] }, turns, "coding")?.items[0].star).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item({ star: "yes" })] }, turns, "behavioral")?.items[0].star).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item({ star: { situation: true } })] }, turns, "behavioral")?.items[0].star).toEqual({
      situation: true,
      task: false,
      action: false,
      result: false,
    });
  });

  it("trims and caps strings", () => {
    const fb = validateFeedback({ summary: "s".repeat(900), items: [item({ strength: ` ${"a".repeat(500)} `, improve: "b".repeat(500) })] }, turns, "screen");
    expect(fb?.summary).toHaveLength(400);
    expect(fb?.items[0].strength).toHaveLength(300);
    expect(fb?.items[0].improve).toHaveLength(300);
  });

  it("sorts items by index", () => {
    const fb = validateFeedback({ summary: "x", items: [item({ index: 1, quote: "" }), item()] }, turns, "screen");
    expect(fb?.items.map((i) => i.index)).toEqual([0, 1]);
  });

  it("returns null when nothing usable remains", () => {
    expect(validateFeedback(null, turns, "screen")).toBeNull();
    expect(validateFeedback("feedback", turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: [] }, turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: "nope" }, turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item({ index: 9 })] }, turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item({ strength: 4 })] }, turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item({ strength: " ", improve: "" })] }, turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item()] }, [], "screen")).toBeNull();
  });

  it("allows a missing summary as empty text", () => {
    expect(validateFeedback({ items: [item()] }, turns, "screen")?.summary).toBe("");
  });
});

describe("loadSessions / saveSession / removeSession", () => {
  let store: Map<string, string>;
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  beforeEach(() => {
    store = new Map();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    });
  });
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  const sess = (id: string, over: Partial<InterviewSession> = {}): InterviewSession => ({ ...make("screen"), id, ...over });

  it("round-trips through is:interviews, newest first", () => {
    saveSession(sess("a"));
    saveSession(sess("b"));
    expect(JSON.parse(store.get(KEYS.interviews)!).map((s: InterviewSession) => s.id)).toEqual(["b", "a"]);
    expect(loadSessions()).toEqual([sess("b"), sess("a")]);
  });

  it("re-saving moves a session to the front without duplicating it", () => {
    saveSession(sess("a"));
    saveSession(sess("b"));
    saveSession(sess("a", { used: 2 }));
    const all = loadSessions();
    expect(all.map((s) => s.id)).toEqual(["a", "b"]);
    expect(all[0].used).toBe(2);
  });

  it("keeps at most MAX_SESSIONS", () => {
    for (let i = 0; i < MAX_SESSIONS + 5; i++) saveSession(sess(`s${i}`));
    const all = loadSessions();
    expect(all).toHaveLength(MAX_SESSIONS);
    expect(all[0].id).toBe(`s${MAX_SESSIONS + 4}`);
    store.set(KEYS.interviews, JSON.stringify(Array.from({ length: 30 }, (_, i) => sess(`x${i}`))));
    expect(loadSessions()).toHaveLength(MAX_SESSIONS);
  });

  it("removes one session", () => {
    saveSession(sess("a"));
    saveSession(sess("b"));
    removeSession("a");
    expect(loadSessions().map((s) => s.id)).toEqual(["b"]);
  });

  it("returns [] for nothing or junk and drops bad entries", () => {
    expect(loadSessions()).toEqual([]);
    store.set(KEYS.interviews, "{not json");
    expect(loadSessions()).toEqual([]);
    store.set(KEYS.interviews, JSON.stringify({ sessions: [] }));
    expect(loadSessions()).toEqual([]);
    const good = sess("ok");
    store.set(
      KEYS.interviews,
      JSON.stringify([
        good,
        null,
        "s",
        { ...good, id: "" },
        { ...good, id: "r", round: "panel" },
        { ...good, id: "st", status: "paused" },
        { ...good, id: "u", used: -1 },
        { ...good, id: "t", turns: [{ question: 1, answer: "a" }] },
        { ...good, id: "c", context: null },
        { ...good, id: "f", context: { ...ctx, field: "law" } },
        { ...good, id: "p", pending: 5 },
        { ...good, id: "code", code: { problemId: "x", language: "ruby", code: "", passed: 0, total: 0 } },
        { ...good, id: "b", board: { n: "junk", e: [] } },
        { ...good, id: "h", hints: [1, 2] },
        { ...good, id: "time", createdAt: "today" },
      ]),
    );
    expect(loadSessions().map((s) => s.id)).toEqual(["ok"]);
  });

  it("gives old sessions without hints an empty list and drops unusable feedback", () => {
    const { hints: _h, ...old } = sess("old");
    void _h;
    store.set(KEYS.interviews, JSON.stringify([{ ...old, status: "done", feedback: { summary: "x", items: [] } }]));
    const [s] = loadSessions();
    expect(s.hints).toEqual([]);
    expect(s.feedback).toBeNull();
    expect(s.status).toBe("done");
  });

  it("Tier 3 sessions without links still load unchanged", () => {
    const old = sess("t3", { round: "design", board: { n: [["n1", "client", "Web app", 20, 20]], e: [] } });
    store.set(KEYS.interviews, JSON.stringify([old]));
    const [s] = loadSessions();
    expect(s).toEqual(old);
    expect("links" in s.context).toBe(false);
  });

  it("new-round sessions with links round-trip; links are capped on load and junk links reject the session", () => {
    const links = ["https://example.com/case-study", "http://example.org/work"];
    const portfolio = sess("p", { round: "portfolio", context: { ...ctx, field: "design", links } });
    const cased = sess("c", { round: "case", pending: scriptFor("case", 3)![0].prompt });
    const fin = sess("f", { round: "finance" });
    const challenge = sess("ch", { round: "challenge", board: { n: [["n1", "screen", "Home", 20, 20]], e: [] } });
    for (const x of [portfolio, cased, fin, challenge]) saveSession(x);
    expect(loadSessions()).toEqual([challenge, fin, cased, portfolio]);

    const dirty = { ...portfolio, id: "d", context: { ...portfolio.context, links: [...links, "javascript:alert(1)", ...Array.from({ length: 6 }, (_, i) => `https://example.net/${i}`)] } };
    store.set(KEYS.interviews, JSON.stringify([dirty, { ...portfolio, id: "bad", context: { ...portfolio.context, links: [1] } }, { ...portfolio, id: "bad2", context: { ...portfolio.context, links: "https://x.example" } }]));
    const loaded = loadSessions();
    expect(loaded.map((s) => s.id)).toEqual(["d"]);
    expect(loaded[0].context.links).toEqual([...links, "https://example.net/0", "https://example.net/1", "https://example.net/2"]);
  });

  it("Clear my data removes is:interviews", () => {
    saveSession(sess("a"));
    clearMyData();
    expect(store.has(KEYS.interviews)).toBe(false);
    expect(loadSessions()).toEqual([]);
  });
});
