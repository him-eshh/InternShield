// Ring v2: score, coverage ticks, the score-0 state, and the delta chip / live announcement.
// No DOM library is installed, so these render to static markup and test the pure pieces.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RiskRing, { RingView } from "@/components/report/RiskRing";
import { coverageTicks, deltaAnnouncement, deltaLabel } from "@/lib/reportView";

const ticks = (ran: number, total = 14) => coverageTicks({ ran, total, missingImportant: [] });
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe("RingView", () => {
  it("shows the score, an accessible name, and 14 ticks with the ran ones marked", () => {
    const html = renderToStaticMarkup(<RingView value={72} score={72} level="high" ticks={ticks(10)} />);
    expect(html).toMatch(/data-score[^>]*>72</);
    expect(html).toContain('aria-label="Risk 72 out of 100"');
    expect(count(html, /data-tick="/g)).toBe(14);
    expect(count(html, /data-tick="ran"/g)).toBe(10);
    expect(count(html, /data-tick="skipped"/g)).toBe(4);
    expect(html).toContain("tabular-nums");
  });

  it("score 0 is a visible state: a start marker and a track, not an empty ring", () => {
    const html = renderToStaticMarkup(<RingView value={0} score={0} level="low" ticks={ticks(14)} />);
    expect(html).toMatch(/data-score[^>]*>0</);
    expect(html).toContain("data-start-dot");
    expect(html).toContain('aria-label="Risk 0 out of 100"');
    expect(count(html, /data-tick="ran"/g)).toBe(14);
  });

  it("does not show a delta chip on the first render, only an empty live region", () => {
    const html = renderToStaticMarkup(<RingView value={40} score={40} level="medium" ticks={ticks(8)} />);
    expect(html).not.toContain("data-delta");
    expect(html).toMatch(/<p[^>]*aria-live="polite"[^>]*><\/p>/);
  });

  it("shows the delta chip and announces the change politely", () => {
    const delta = { label: deltaLabel(60, 35), announcement: deltaAnnouncement(60, 35) };
    const html = renderToStaticMarkup(<RingView value={35} score={35} level="medium" ticks={ticks(8)} delta={delta} chipKey={35} />);
    expect(html).toContain("data-delta");
    expect(html).toContain("−25");
    expect(html).toMatch(/aria-live="polite"[^>]*>Risk down 25, now 35</);
  });

  it("has no spring or bounce: the ring is driven by a fixed ease-out, never a spring", async () => {
    const src = (await import("node:fs")).readFileSync("components/report/RiskRing.tsx", "utf8");
    expect(src).not.toMatch(/type:\s*"spring"|stiffness|bounce/);
  });
});

describe("RiskRing", () => {
  it("renders the verdict and 14 ticks from coverage on the server", () => {
    const html = renderToStaticMarkup(
      <RiskRing score={85} level="high" coverage={{ ran: 9, total: 14, missingImportant: [] }} />,
    );
    expect(html).toContain("<h2");
    expect(html).toContain('aria-label="Risk 85 out of 100"');
    expect(count(html, /data-tick="/g)).toBe(14);
    expect(count(html, /data-tick="ran"/g)).toBe(9);
    expect(html).not.toContain("data-delta");
  });

  it("clamps out-of-range scores in the accessible name", () => {
    expect(renderToStaticMarkup(<RiskRing score={140} level="high" />)).toContain("Risk 100 out of 100");
    expect(renderToStaticMarkup(<RiskRing score={-5} level="low" />)).toContain("Risk 0 out of 100");
  });
});

describe("delta helpers", () => {
  it("label and announcement", () => {
    expect(deltaLabel(20, 32)).toBe("+12");
    expect(deltaLabel(60, 35)).toBe("−25");
    expect(deltaLabel(10, 10)).toBe("0");
    expect(deltaAnnouncement(20, 32)).toBe("Risk up 12, now 32");
    expect(deltaAnnouncement(10, 10)).toBe("Risk stays at 10");
  });
});
