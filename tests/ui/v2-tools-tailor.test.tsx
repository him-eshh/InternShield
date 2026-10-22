import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResumeTailor, { optionsSummary, warningText } from "@/components/tiers/ResumeTailor";
import { DEFAULT_TAILOR_V2 } from "@/lib/tiers/types";

const RESUME = ["Sam Rivera", "EXPERIENCE", "• Built a club website with JavaScript and HTML", "• Wrote Python scripts to clean survey data"].join("\n");
const target = {
  company: "Northwind",
  role: "Web Intern",
  description: "Requirements:\nJavaScript\nPython\nReact\nNice to have:\nTypeScript",
};
const html = renderToStaticMarkup(<ResumeTailor resume={{ text: RESUME, fileName: "r.pdf" }} target={target} onOpenProfile={() => {}} onBack={() => {}} />);

describe("Tailor v2: keyword gap panel", () => {
  it("shows counts, never an ATS score", () => {
    expect(html).toContain("Posting keywords");
    expect(html).toContain("2 of 3 required terms in your resume");
    expect(html).toContain("0 of 1 preferred");
    expect(html).not.toMatch(/ATS|score/i);
  });

  it("puts missing terms under 'add only if true' with I have this / Leave out", () => {
    expect(html).toContain("Not found: add only if true");
    expect(html).toMatch(/React[\s\S]*I have this/);
    expect(html).toContain("Leave out");
    expect(html).toContain("In your resume");
  });
});

describe("Tailor v2: options", () => {
  it("collapses How to tailor to a one-line summary with the new options inside", () => {
    expect(html).toMatch(/<details[^>]*>[\s\S]*<summary/);
    expect(html).toContain(optionsSummary(DEFAULT_TAILOR_V2));
    for (const label of ["Target level", "Internship", "Region", "UK CV", "Use the posting&#x27;s words", "Avoid buzzwords", "Save these options as"]) {
      expect(html).toContain(label);
    }
  });

  it("summary names level and region", () => {
    expect(optionsSummary(DEFAULT_TAILOR_V2)).toBe("Confident · light touch · same length · internship · US résumé");
  });

  it("warning copy is short and specific", () => {
    expect(warningText({ kind: "inflated", token: "led", was: "helped" })).toBe('"led" claims more than "helped"');
    expect(warningText({ kind: "qualifier", token: "co-" })).toBe('Drops "co-"');
    expect(warningText({ kind: "seniority", token: "architected" })).toContain("senior");
    expect(warningText({ kind: "buzzword", token: "synergy" })).toBe('Buzzword: "synergy"');
  });
});
