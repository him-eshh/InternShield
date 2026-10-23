import { describe, expect, it } from "vitest";
import { getPreset, LP_PROMPTS, lpTags, PRESETS } from "@/lib/tiers/presets";
import { answerPending, buildRequest, newSession } from "@/lib/tiers/interview";
import { buildScorecard } from "@/lib/tiers/scorecard";
import { parseInterview } from "@/lib/server/interview";
import { INTERVIEW_ROUNDS, type InterviewContext } from "@/lib/tiers/types";

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

  it("Amazon-style behavioral asks from the LP bank and tags the LPs on the scorecard", () => {
    const s = newSession("behavioral", ctx("amazon"), { id: "a", now: 0, seed: 1 });
    expect(s.pending).toBe(LP_PROMPTS[1].prompt);
    expect(lpTags([s.pending!, "Something else"])).toEqual(["Dive Deep"]);
    const answered = answerPending(s, "I pulled the logs and found 30% of errors came from one form.", 1);
    const done = { ...answered, status: "done" as const };
    const card = buildScorecard(done)!;
    expect(card.axes.find((a) => a.id === "complete")!.evidence).toContain("Leadership Principles: Dive Deep");
    expect(card.axes.find((a) => a.id === "ownership")!.evidence[0]).toMatch(/“I\/my” 1 time/);
    expect(buildRequest(s, "question").context.preset).toBe("amazon");
  });

  it("without a preset, behavioral is unchanged and no LP line appears", () => {
    const s = newSession("behavioral", ctx(), { id: "b", now: 0, seed: 1 });
    expect(LP_PROMPTS.some((p) => p.prompt === s.pending)).toBe(false);
    expect("preset" in buildRequest(s, "question").context).toBe(false);
  });

  it("the route accepts known presets and rejects others", () => {
    const body = (preset: unknown) => ({ ask: "question", round: "behavioral", context: { ...ctx(), preset }, turns: [{ question: "Q", answer: "A" }], used: 1 });
    expect(parseInterview(body("google"))?.context.preset).toBe("google");
    expect(parseInterview(body("acme"))).toBeNull();
    expect(parseInterview(body(undefined))?.context.preset).toBeUndefined();
  });
});
