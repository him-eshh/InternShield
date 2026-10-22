// UX pass: Copy report on every level, the sectioned fallback explanation, and resume tailoring options.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Explanation from "@/components/report/Explanation";
import Report from "@/components/report/Report";
import ResumeTailor, { optionsSummary } from "@/components/tiers/ResumeTailor";
import { fixtureOutcome } from "@/fixtures/outcome";
import { explanationPlain, explanationSections, fallbackExplanation, FALLBACK_TITLES, hasBannedWord } from "@/lib/explainFallback";
import { lineKinds, resumeLines, resumeSections, splitBullet } from "@/lib/tiers/tailored";
import { DEFAULT_TAILOR } from "@/lib/tiers/types";

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

  it("renders titles, a bullet list and highlighted quotes for fallback text", () => {
    const text = fallbackExplanation({ level: "medium", flags: FLAGS });
    const html = renderToStaticMarkup(<Explanation text={text} source="fallback" quotes={["deposit the check we mail you"]} />);
    expect(html).toContain(">Our take</h3>");
    expect(html).toContain(">What stood out</h3>");
    expect(html).toContain(">What to do next</h3>");
    expect(html.match(/<li /g)).toHaveLength(2);
    expect(html).toContain("<mark");
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

const RESUME = [
  "Jordan Lee",
  "jordan.lee@example.edu | (555) 010-2030 | linkedin.com/in/jordanlee",
  "EDUCATION",
  "State University, B.S. Computer Science, May 2027",
  "Experience",
  "Campus IT Help Desk, Student Technician, Sep 2025 - Present",
  "• Resolved 40+ tickets a week for students and staff using ServiceNow",
  "• Trained 3 new technicians on the ticket process",
  "Projects",
  "- Built a React app that tracks club attendance for 120 members",
  "Skills",
  "Python, JavaScript, React, SQL, Git",
].join("\n");

describe("which resume lines can be reworded", () => {
  const lines = resumeLines(RESUME);
  const kinds = lineKinds(lines);
  const kindOf = (start: string) => kinds[lines.findIndex((l) => l.startsWith(start))];

  it("never offers the name, contact details or section headers", () => {
    expect(kindOf("Jordan Lee")).toBe("contact");
    expect(kindOf("jordan.lee@")).toBe("contact");
    expect(kindOf("EDUCATION")).toBe("header");
    expect(kindOf("Experience")).toBe("header");
    expect(kindOf("Projects")).toBe("header");
    expect(kindOf("Skills")).toBe("header");
  });

  it("offers bullets, and keeps role/school/date lines as they are", () => {
    expect(kindOf("• Resolved")).toBe("content");
    expect(kindOf("• Trained")).toBe("content");
    expect(kindOf("- Built")).toBe("content");
    expect(kindOf("Campus IT")).toBe("detail");
    expect(kindOf("State University")).toBe("detail");
  });

  it("groups lines under their sections", () => {
    expect(resumeSections(lines).map((s) => s.title)).toEqual(["Top", "Education", "Experience", "Projects", "Skills"]);
  });

  it("splitBullet keeps the bullet out of what the AI sees", () => {
    expect(splitBullet("• Trained 3 new technicians")).toEqual({ prefix: "• ", body: "Trained 3 new technicians" });
    expect(splitBullet("Plain line")).toEqual({ prefix: "", body: "Plain line" });
  });

  it("a resume with no bullets still offers its sentences", () => {
    const plain = lineKinds(resumeLines("Sam Rivera\nExperience\nI tutored algebra students twice a week at the library and planned lessons."));
    expect(plain).toEqual(["contact", "header", "content"]);
  });
});

describe("ResumeTailor options panel", () => {
  const html = renderToStaticMarkup(
    <ResumeTailor resume={{ text: RESUME, fileName: "r.pdf" }} target={null} onOpenProfile={() => {}} onBack={() => {}} />,
  );

  it("shows the options with sensible defaults", () => {
    expect(html).toContain("How to tailor");
    for (const label of ["Emphasize", "Skills", "Impact and results", "Leadership", "Technical depth", "Tone", "How much to change", "Keep about the same length"]) {
      expect(html).toContain(label);
    }
    expect(html).toMatch(/aria-pressed="true"[^>]*>Confident</);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Light touch</);
    expect(html).toMatch(/type="checkbox"[^>]*checked/);
  });

  it("only bullets are buttons; name, email and headers are plain text", () => {
    const buttons = [...html.matchAll(/<button[^>]*aria-pressed="false"[^>]*>([^<]*)<\/button>/g)].map((m) => m[1]);
    expect(buttons.some((b) => b.startsWith("• Resolved"))).toBe(true);
    expect(buttons.some((b) => b.includes("Jordan Lee") || b.includes("@example.edu") || b === "EDUCATION")).toBe(false);
    expect(html).toContain("Pick a bullet to reword.");
  });

  it("offers a section filter", () => {
    expect(html).toContain("All sections");
    expect(html).toMatch(/>Experience<\/button>/);
  });

  it("summarizes the options in one line", () => {
    expect(optionsSummary(DEFAULT_TAILOR)).toBe("Confident · light touch · same length");
    expect(optionsSummary({ ...DEFAULT_TAILOR, emphasis: ["impact", "technical"] })).toBe(
      "Emphasizing impact and results, technical depth · Confident · light touch · same length",
    );
  });
});
