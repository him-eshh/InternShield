import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ImpactCard from "@/components/report/ImpactCard";
import { diffReports, impactCopy, impactLines, scoreLine } from "@/lib/impact";
import { realReport, scamReport } from "@/fixtures/reports";
import { LEVEL_LABELS, type Flag, type Report } from "@/lib/types";

const withFlags = (r: Report, flags: Flag[]): Report => ({ ...r, flags });
const flag = (over: Partial<Flag> & Pick<Flag, "id" | "title">): Flag => ({ group: "sender", kind: "red", critical: false, points: 20, quote: null, why: "why", ...over });

describe("report additions", () => {
  it("supports a before/after-only diff", () => { expect(diffReports(realReport, realReport).scoreAfter).toBe(realReport.score); });
  it("names new and gone signs once each, and level changes", () => {
    const impact = diffReports(realReport, scamReport, "question", "Asked for money");
    expect(impact.added.length).toBeGreaterThan(0);
    expect(impact.removed.length).toBeGreaterThan(0);
    expect(impact.levelAfter).toBe("high");
    const copy = impactCopy(impact);
    expect(copy).toContain(`Score ${realReport.score} → ${scamReport.score}, now ${LEVEL_LABELS.high}`);
    for (const f of impact.added) expect(copy).toContain(`New warning sign: ${f.title}`);
    for (const f of impact.removed) expect(copy).toContain(`No longer counted as a good sign: ${f.title}`);
  });
  for (const kind of ["question", "detail", "message"] as const) {
    it(`confirms unchanged ${kind} with one coherent score line`, () => {
      const copy = impactCopy(diffReports(realReport, realReport, kind, "Company email"));
      expect(copy).toContain("You added: Company email.");
      expect(copy).toContain(`Score ${realReport.score} → ${realReport.score}, still ${LEVEL_LABELS.low}`);
      expect(copy).not.toContain("Score unchanged");
      expect(copy).toContain("Nothing new turned up");
    });
  }
  it("reports changed weights even when the capped score stays unchanged", () => {
    const after = { ...scamReport, flags: scamReport.flags.map((f, i) => (i === 2 ? { ...f, points: f.points + 5 } : f)) };
    const impact = diffReports(scamReport, after, "detail", "More evidence");
    expect(impact.changed).toHaveLength(1);
    expect(impactCopy(impact)).toContain("now counts for more");
  });
  it("never prints a 0 to N points line for a critical flag", () => {
    const after = { ...scamReport, flags: scamReport.flags.map((f) => (f.critical ? { ...f, points: 40 } : f)) };
    const copy = impactCopy(diffReports(scamReport, after));
    expect(copy).not.toMatch(/0 → 40/);
  });
  it("handles multiple simultaneous changes", () => {
    const after = { ...realReport, score: 50, level: "medium" as const, flags: scamReport.flags };
    const impact = diffReports(realReport, after, "message", "Second message");
    expect(impact.added.length + impact.removed.length).toBeGreaterThan(1);
    expect(impactCopy(impact)).toContain("now Some warning signs");
  });
});

describe("one flag, one label", () => {
  // The screenshot bug: the same free-email flag came back under two ids and wordings, so it showed as + and -.
  const before = withFlags(scamReport, [
    flag({ id: "free_email_established", title: "Sent from a free email address" }),
    flag({ id: "vague_high_pay", group: "offer", title: "Vague duties, high pay, no experience" }),
  ]);
  const after = withFlags(scamReport, [
    flag({ id: "free_email", title: "Sent from a free email account" }),
    flag({ id: "vague_easy_pay", group: "offer", title: "Vague duties, easy pay, no experience needed" }),
    flag({ id: "posting_mismatch", group: "offer", title: "The details don't match the real posting" }),
  ]);

  it("the same flag is neither added nor removed when its id or wording differs", () => {
    const impact = diffReports(before, after, "detail", "Company: Northbeam Analytics");
    expect(impact.removed).toEqual([]);
    expect(impact.added.map((f) => f.id)).toEqual(["posting_mismatch"]);
  });
  it("no title appears under both new and gone, in any pair of reports", () => {
    for (const [a, b] of [[before, after], [after, before], [realReport, scamReport], [scamReport, realReport]] as const) {
      const impact = diffReports(a, b);
      const lines = impactLines(impact);
      const gone = new Set(impact.removed.map((f) => f.title));
      expect(impact.added.filter((f) => gone.has(f.title))).toEqual([]);
      expect(new Set(lines.map((l) => l.text)).size).toBe(lines.length);
    }
  });
  it("uses one canonical wording per flag", () => {
    expect(diffReports(withFlags(scamReport, []), after).added.map((f) => f.title)).toContain("Sent from a free email account");
    expect(diffReports(withFlags(scamReport, []), before).added.map((f) => f.title)).toContain("Sent from a free email account");
  });
  it("a sign that was added never appears in the copy as plus and minus", () => {
    const copy = impactCopy(diffReports(before, after, "detail", "Company: Northbeam Analytics"));
    expect(copy).not.toMatch(/^[+−]/m);
    expect(copy.match(/free email/g) ?? []).toHaveLength(0);
    expect(copy).toContain(`Score ${scamReport.score} → ${scamReport.score}, still ${LEVEL_LABELS.high}`);
  });
});

describe("ImpactCard", () => {
  it("shows what was added, then what changed, in the Check color and never grey chrome", () => {
    const html = renderToStaticMarkup(<ImpactCard impact={diffReports(realReport, scamReport, "question", "Asked for money", "Did they ask for money?")} />);
    expect(html).toContain('data-tool="check"');
    expect(html).toContain("bg-tool-tint");
    expect(html.indexOf("What you added")).toBeLessThan(html.indexOf("What changed"));
    expect(html).toContain("Did they ask for money?");
    expect(html).toContain(scoreLine(diffReports(realReport, scamReport)));
    expect(html).not.toMatch(/text-\[1[0-3]px\] text-muted/);
  });
});
