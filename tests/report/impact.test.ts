import { describe, expect, it } from "vitest";
import { diffReports, impactCopy } from "@/lib/impact";
import { realReport, scamReport } from "@/fixtures/reports";

describe("report additions", () => {
  it("supports a before/after-only diff", () => { expect(diffReports(realReport, realReport).scoreAfter).toBe(realReport.score); });
  it("names added and removed signals and level changes", () => {
    const impact = diffReports(realReport, scamReport, "question", "Asked for money");
    expect(impact.added.length).toBeGreaterThan(0);
    expect(impact.removed.length).toBeGreaterThan(0);
    expect(impact.levelAfter).toBe("high");
    expect(impactCopy(impact)).toContain(`Score ${realReport.score} \u2192 ${scamReport.score}`);
    for (const f of impact.added) expect(impactCopy(impact)).toContain(`+ ${f.title}`);
    for (const f of impact.removed) expect(impactCopy(impact)).toContain(`\u2212 ${f.title}`);
  });
  for (const kind of ["question", "detail", "message"] as const) {
    it(`confirms unchanged ${kind} with a score and level`, () => {
      const copy = impactCopy(diffReports(realReport, realReport, kind, "Company email"));
      expect(copy).toContain("Added: Company email.");
      expect(copy).toContain("Confirmed: Company email.");
      expect(copy).toContain(`Score unchanged at ${realReport.score}`);
      expect(copy).toContain("No red flags found");
    });
  }
  it("reports changed weights even when the capped score stays unchanged", () => {
    const after = { ...scamReport, flags: scamReport.flags.map((f, i) => i ? f : { ...f, points: f.points + 5 }) };
    const impact = diffReports(scamReport, after, "detail", "More evidence");
    expect(impact.changed).toHaveLength(1);
    expect(impactCopy(impact)).toContain("points");
  });
  it("handles multiple simultaneous changes", () => {
    const after = { ...realReport, score: 50, level: "medium" as const, flags: scamReport.flags };
    const impact = diffReports(realReport, after, "message", "Second message");
    expect(impact.added.length + impact.removed.length).toBeGreaterThan(1);
    expect(impactCopy(impact)).toContain("now Some warning signs");
  });
});
