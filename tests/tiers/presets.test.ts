import { describe, expect, it } from "vitest";
import { getPreset, LP_PROMPTS, lpTags, PRESETS } from "@/lib/tiers/presets";
import { textPool } from "@/lib/tiers/sessionPools";
import { buildScorecard } from "@/lib/tiers/scorecard";
import { parseInterview } from "@/lib/server/interview";
import { INTERVIEW_ROUNDS, type InterviewContext, type InterviewSession } from "@/lib/tiers/types";

const ctx = (preset?: InterviewContext["preset"]): InterviewContext => ({
  company: null,
  role: null,
  description: null,
  resume: null,
  field: "tech",
  ...(preset ? { preset } : {}),
});

describe("company-style presets", () => {
  it("say -style, link only official https pages, and use real rounds", () => {
    expect(PRESETS).toHaveLength(5);
    for (const p of PRESETS) {
      expect(p.label).toMatch(/-style/);
      expect(p.source.url).toMatch(/^https:\/\/(www\.)?(google\.com|metacareers\.com|amazon\.jobs|mckinsey\.com|goldmansachs\.com)\//);
      for (const r of p.rounds) expect(INTERVIEW_ROUNDS.some((x) => x.id === r)).toBe(true);
    }
    expect(getPreset("nope")).toBeNull();
  });

  it("Amazon-style behavioral draws from the LP bank and tags the LPs on the scorecard", () => {
    const pool = textPool("behavioral", { values: [], preset: "amazon" }).shuffled.map((o) => o.text);
    for (const p of LP_PROMPTS) expect(pool).toContain(p.prompt);
    expect(lpTags([LP_PROMPTS[1].prompt, "Something else"])).toEqual(["Dive Deep"]);
    const done: InterviewSession = {
      id: "a", round: "behavioral", context: ctx("amazon"), turns: [{ question: LP_PROMPTS[1].prompt, answer: "I pulled the logs and found 30% of errors came from one form." }],
      pending: null, used: 1, seed: 1, problemId: null, code: null, hints: [], feedback: null, status: "done", createdAt: 0, updatedAt: 1,
    };
    const card = buildScorecard(done)!;
    expect(card.axes.find((a) => a.id === "complete")!.evidence).toContain("Leadership Principles: Dive Deep");
    expect(card.axes.find((a) => a.id === "ownership")!.evidence[0]).toMatch(/“I\/my” 1 time/);
  });

  it("without a preset, behavioral has no LP prompts", () => {
    const pool = textPool("behavioral", { values: [] }).shuffled.map((o) => o.text);
    expect(LP_PROMPTS.some((p) => pool.includes(p.prompt))).toBe(false);
  });

  it("the route accepts known presets and rejects others", () => {
    const body = (preset: unknown) => ({ ask: "question", round: "behavioral", context: { ...ctx(), preset }, turns: [{ question: "Q", answer: "A" }], used: 1 });
    expect(parseInterview(body("google"))?.context.preset).toBe("google");
    expect(parseInterview(body("acme"))).toBeNull();
    expect(parseInterview(body(undefined))?.context.preset).toBeUndefined();
  });
});
