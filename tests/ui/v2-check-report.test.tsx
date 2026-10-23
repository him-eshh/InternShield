// Report redesign (C3): order, severity list, good signs, footer per level, quotes as marks.
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EvidenceCard from "@/components/report/EvidenceCard";
import EvidenceList from "@/components/report/EvidenceList";
import Report from "@/components/report/Report";
import ReportFooter from "@/components/report/ReportFooter";
import TopReasons from "@/components/report/TopReasons";
import { fixtureOutcome } from "@/fixtures/outcome";
import { mediumReport, realReport, scamReport } from "@/fixtures/reports";
import { actionLine, sortFlags, topReasons } from "@/lib/reportView";
import type { Flag } from "@/lib/types";

const flag = (id: string, over: Partial<Flag> = {}): Flag => ({
  id,
  group: "message",
  kind: "red",
  title: `Title ${id}`,
  quote: null,
  why: `Why ${id}`,
  points: 10,
  critical: false,
  ...over,
});

const MIXED: Flag[] = [
  flag("good1", { kind: "good", points: -5, title: "Official domain" }),
  flag("low1", { severity: "low", points: 3 }),
  flag("crit1", { severity: "critical", critical: true, points: 40 }),
  flag("med1", { severity: "medium", points: 12 }),
  flag("high1", { severity: "high", points: 28 }),
];

describe("severity ordering", () => {
  it("sorts red flags critical -> low, then good signs", () => {
    expect(sortFlags(MIXED).map((f) => f.id)).toEqual(["crit1", "high1", "med1", "low1", "good1"]);
  });
  it("top reasons are the three most severe reds", () => {
    expect(topReasons(MIXED).map((f) => f.id)).toEqual(["crit1", "high1", "med1"]);
  });
  it("the evidence list renders cards in that order with severity as text", () => {
    const html = renderToStaticMarkup(<EvidenceList flags={MIXED} level="medium" />);
    const at = (id: string) => html.indexOf(`id="flag-${id}"`);
    expect(at("crit1")).toBeLessThan(at("high1"));
    expect(at("high1")).toBeLessThan(at("med1"));
    expect(at("med1")).toBeLessThan(at("low1"));
    expect(at("low1")).toBeLessThan(at("good1"));
    for (const label of [">Critical<", ">High<", ">Medium<", ">Low<", ">Good sign<"]) expect(html).toContain(label);
  });
  it("renders one list, not one per group", () => {
    const html = renderToStaticMarkup(<EvidenceList flags={MIXED} level="medium" />);
    expect(html.match(/<h3/g)).toHaveLength(1);
  });
});

describe("good signs", () => {
  it("are collapsed in a details element on high risk", () => {
    const html = renderToStaticMarkup(<EvidenceList flags={MIXED} level="high" />);
    expect(html).toMatch(/<details[^>]*>[\s\S]*Official domain[\s\S]*<\/details>/);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(html.indexOf("<details")).toBeGreaterThan(html.indexOf("Title crit1"));
  });
  it("are plain cards on low and medium", () => {
    expect(renderToStaticMarkup(<EvidenceList flags={MIXED} level="low" />)).not.toContain("<details");
    expect(renderToStaticMarkup(<EvidenceList flags={MIXED} level="medium" />)).not.toContain("<details");
  });
});

describe("EvidenceCard", () => {
  it("shows the action and the learn-more link when present", () => {
    const f = flag("a", { severity: "high", action: "Call the company's listed number.", learnMore: { label: "FTC guidance", url: "https://consumer.ftc.gov/x" } });
    const html = renderToStaticMarkup(<ul><EvidenceCard flag={f} /></ul>);
    expect(html).toContain("Call the company&#x27;s listed number.");
    expect(html).toContain('href="https://consumer.ftc.gov/x"');
    expect(html).toContain("FTC guidance");
  });
  it("omits them when absent, and marks quotes without accent blue", () => {
    const html = renderToStaticMarkup(<ul><EvidenceCard flag={flag("b", { quote: "send a deposit" })} /></ul>);
    expect(html).not.toContain("Check: ");
    expect(html).toContain('<mark class="quote-mark">');
    expect(html).not.toContain("bg-accent");
  });
  it("never hides itself until scrolled", () => {
    const html = renderToStaticMarkup(<ul><EvidenceCard flag={flag("c")} /></ul>);
    expect(html).not.toContain("opacity-0");
    expect(html).not.toContain("whileInView");
  });
});

describe("TopReasons", () => {
  it("lists at most three with severity text, and nothing when there are no red flags", () => {
    const html = renderToStaticMarkup(<TopReasons flags={[...MIXED, flag("x", { severity: "high" })]} />);
    expect(html.match(/<li /g)).toHaveLength(3);
    expect(html).toContain(">Critical<");
    expect(renderToStaticMarkup(<TopReasons flags={[MIXED[0]]} />)).toBe("");
  });
});

describe("footer per level", () => {
  const render = (report: typeof scamReport, extras?: ReactNode) =>
    renderToStaticMarkup(
      <ReportFooter report={report} careersUrl={null} officialLink={{ url: "https://example.com", label: "Official website" }} source="linkedin" onAgain={() => {}} extras={extras} />,
    );

  it("has exactly one primary button on every level", () => {
    for (const r of [realReport, mediumReport, scamReport]) {
      const html = render(r);
      expect(html.match(/Check another message/g)).toHaveLength(1);
      expect(html.match(/<button/g)!.length).toBeLessThanOrEqual(2); // primary (+ Copy report)
    }
  });
  it("low: no Copy report and no IC3", () => {
    const html = render(realReport);
    expect(html).not.toContain("Copy report");
    expect(html).not.toContain("IC3");
    expect(html).toContain("Report to the FTC");
  });
  it("medium and high: Copy report once, IC3 present", () => {
    for (const r of [mediumReport, scamReport]) {
      const html = render(r);
      expect(html.match(/Copy report/g)).toHaveLength(1);
      expect(html).toContain("IC3");
    }
  });
  it("puts the app's extras after the primary button", () => {
    const html = render(mediumReport, <button type="button">Tailor my resume for this</button>);
    expect(html.indexOf("Tailor my resume")).toBeGreaterThan(html.indexOf("Check another message"));
  });
});

describe("Report order", () => {
  it("ring, verdict, action line, top reasons, evidence, quick questions, footer", async () => {
    const fx = (await fixtureOutcome("medium"))!;
    const html = renderToStaticMarkup(<Report outcome={fx.outcome} input={fx.input} onRetry={() => {}} onAgain={() => {}} />);
    const order = [
      "Risk ",
      "<h2",
      actionLine(fx.outcome.report!.level).replaceAll("'", "&#x27;"),
      "Top reasons",
      ">Evidence<",
      "A few quick questions",
      "Check another message",
    ].map((s) => html.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("low risk: no Copy report; high risk: no posting section and no celebration wording", async () => {
    const low = renderToStaticMarkup(<Report {...(await props("real"))} />);
    expect(low).not.toContain("Copy report");
    expect(low).not.toMatch(/\bsafe\b|legit|guaranteed/i);
    const high = renderToStaticMarkup(<Report {...(await props("scam"))} />);
    expect(high.match(/Copy report/g)).toHaveLength(1);
    expect(high).not.toContain("The real posting");
    expect(high).not.toContain("opacity-0");
  });

  it("renders extras and the recovery slot", async () => {
    const p = await props("medium");
    const html = renderToStaticMarkup(<Report {...p} extras={<span>EXTRA</span>} recovery={<section>RECOVERY</section>} />);
    expect(html).toContain("EXTRA");
    expect(html.indexOf("RECOVERY")).toBeGreaterThan(html.indexOf("A few quick questions"));
  });
});

async function props(name: "real" | "medium" | "scam") {
  const fx = (await fixtureOutcome(name))!;
  return { outcome: fx.outcome, input: fx.input, onRetry: () => {}, onAgain: () => {} };
}
