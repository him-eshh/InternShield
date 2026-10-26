import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Report from "@/components/report/Report";
import QuickQuestions from "@/components/report/QuickQuestions";
import { fixtureOutcome } from "@/fixtures/outcome";
import { diffReports, impactCopy } from "@/lib/impact";
import { realReport } from "@/fixtures/reports";
import { EXAMPLES } from "@/lib/examples";
import { runPipeline } from "@/lib/client/pipeline";
import { score } from "@/lib/scoring/score";

describe("v3 report rules", () => {
  it("keeps the medium fixture's quotes, facts, and score consistent with its message", async () => {
    const { input, outcome } = (await fixtureOutcome("medium"))!;
    const report = outcome.report!;
    expect(input.text).not.toMatch(/deposit (?:a |the )?check|send (?:the )?remaining balance|buy (?:your )?equipment/i);
    expect(outcome.facts?.asks).toEqual([]);
    expect([
      outcome.facts?.company?.quote,
      outcome.facts?.role?.quote,
      outcome.facts?.offPlatform?.quote,
      outcome.facts?.interview.quote,
      ...outcome.facts!.pressure.map((item) => item.quote),
    ].every((quote) => !quote || input.text.includes(quote))).toBe(true);
    expect(report.flags.every((flag) => !flag.quote || input.text.includes(flag.quote))).toBe(true);
    expect(report.score).toBe(report.flags.reduce((total, flag) => total + flag.points, 0));
    expect(report).toEqual(score(outcome.scoreInput));
    expect(outcome.facts?.offPlatform?.quote).toBe(report.flags.find((flag) => flag.id === "off_platform")?.quote);
  });
  for (const name of ["real", "medium", "scam"]) {
    it(`${name} has exactly one filled primary action`, async () => {
      const fx = (await fixtureOutcome(name))!;
      const html = renderToStaticMarkup(<Report {...fx} onRetry={() => {}} onAgain={() => {}} />);
      const actions = html.match(/<(?:button|a) [^>]*class="[^"]*bg-accent text-accent-contrast[^"]*"/g) ?? [];
      expect(actions).toHaveLength(1);
      expect(html.includes("Copy report")).toBe(name !== "real");
      expect(html).toContain('data-tool="check"');
    });
  }
  it("places the full impact directly below its collapsed answer", () => {
    const q = { id: "channel" as const, text: "Where did it reach you?", options: [{ value: "email", label: "Email" }] };
    const value = "email" as const;
    const impact = diffReports(realReport, realReport, "question", q.options[0].label, q.text);
    const html = renderToStaticMarkup(<QuickQuestions questions={[q]} answers={{ [q.id]: value }} change={impactCopy(impact)} lastId={q.id} confirmations={{ [q.id]: impact }} onAnswer={() => {}} />);
    const fieldset = html.slice(html.indexOf("<fieldset"), html.indexOf("</fieldset>"));
    expect(fieldset.indexOf("What you added")).toBeGreaterThan(fieldset.indexOf("Change"));
    expect(fieldset).toContain(`Score ${realReport.score} → ${realReport.score}, still`);
    expect(html).toContain("You added:");
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain("no score impact");
  });
  it("uses an explicitly added sender for lookup even when extraction contains the old one", async () => {
    const ex = EXAMPLES.real;
    const bodies: { email?: string }[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      const path = String(url);
      if (path.includes("/sender")) bodies.push(JSON.parse(String(init?.body)));
      const data = path.includes("/extract") && ex.savedSteps.extract.status === "done" ? ex.savedSteps.extract.data : null;
      return new Response(JSON.stringify(data ? { status: "done", data } : { status: "failed", reason: "error" }), { status: data ? 200 : 503 });
    }) as typeof fetch;
    const outcome = await runPipeline({ text: ex.text, form: { company: null, sender: "new@example.com" }, source: null, stage: null, profile: null, resumeText: null }, { fetch: fetchImpl, log: false });
    await outcome.pendingExplanation;
    expect(bodies[0]?.email).toBe("new@example.com");
  });
});
