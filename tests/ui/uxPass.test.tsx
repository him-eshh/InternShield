// UX pass: Copy report on every level, the sectioned fallback explanation, and resume tailoring options.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Explanation from "@/components/report/Explanation";
import Report from "@/components/report/Report";
import { fixtureOutcome } from "@/fixtures/outcome";
import { explanationPlain, explanationSections, fallbackExplanation, FALLBACK_TITLES, hasBannedWord } from "@/lib/explainFallback";

async function renderReport(name: "real" | "scam" | "medium") {
  const fx = (await fixtureOutcome(name))!;
  return renderToStaticMarkup(<Report outcome={fx.outcome} input={fx.input} onRetry={() => {}} onAgain={() => {}} />);
}

describe("Copy report", () => {
  it("is absent from a low report", async () => {
    expect(await renderReport("real")).not.toContain("Copy report");
  });
  it.each(["medium", "scam"] as const)("shows once on the %s report", async (name) => {
    const html = await renderReport(name);
    expect(html.match(/Copy report/g)).toHaveLength(1);
  });
});

const FLAGS = [
  { title: "Asks you to deposit a check", quote: "deposit the check we mail you", why: "w" },
  { title: "Moves the conversation to WhatsApp", quote: null, why: "w" },
];

describe("sectioned fallback explanation", () => {
  it("has a one-sentence verdict, the warning signs as bullets, and a next step", () => {
    const text = fallbackExplanation({ level: "high", flags: FLAGS });
    const secs = explanationSections(text)!;
    expect(secs.map((s) => s.title)).toEqual([FALLBACK_TITLES.verdict, FALLBACK_TITLES.flags, FALLBACK_TITLES.next]);
    expect(secs.map((s) => s.kind)).toEqual(["text", "list", "text"]);
    expect(secs[0].items).toEqual(["This message shows strong signs of a scam."]);
    expect(secs[1].items).toHaveLength(2);
    expect(secs[1].items[0]).toMatch(/deposit a check/);
    expect(secs[2].items[0]).toMatch(/don't send money/);
  });

  it("with no flags: verdict and next step only, and no banned words at any level", () => {
    const secs = explanationSections(fallbackExplanation({ level: "low", flags: [] }))!;
    expect(secs.map((s) => s.title)).toEqual([FALLBACK_TITLES.verdict, FALLBACK_TITLES.next]);
    for (const level of ["low", "medium", "high"] as const) expect(hasBannedWord(fallbackExplanation({ level, flags: FLAGS }))).toBe(false);
  });

  it("renders titles and a bullet list for fallback text, without repeating the cards' quotes", () => {
    const text = fallbackExplanation({ level: "medium", flags: FLAGS });
    const html = renderToStaticMarkup(<Explanation text={text} source="fallback" quotes={["deposit the check we mail you"]} />);
    expect(html).toContain(">Our take</h3>");
    expect(html).toContain(">What stood out</h3>");
    expect(html).toContain(">What to do next</h3>");
    expect(html.match(/<li /g)).toHaveLength(2);
    expect(html).not.toContain("<mark");
    expect(html).not.toContain("## ");
  });

  it("leaves AI text as paragraphs, even if it happens to contain ##", () => {
    const html = renderToStaticMarkup(<Explanation text={"## Not a title\n\nSecond."} source="ai" quotes={[]} />);
    expect(html).not.toContain("<h3");
  });

  it("plain text keeps titles and bullets readable", () => {
    expect(explanationPlain(fallbackExplanation({ level: "high", flags: FLAGS }))).toMatch(/^Our take:\nThis message[\s\S]*What stood out:\n- /);
  });
});
