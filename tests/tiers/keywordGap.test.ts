import { describe, expect, it } from "vitest";
import { keywordGap } from "@/lib/tiers/keywordGap";

// Made-up posting and resume.
const POSTING = `Data Analyst Intern, Northwind Analytics
Requirements:
- Python and SQL
- Experience with dashboards
- You must know Excel
Nice to have:
- Tableau
- Machine learning coursework
Docker is a plus.`;

const RESUME = `Jordan Lee
Skills: Python, MS Excel, Data viz, ML
- Built a Flask app for the campus food pantry`;

describe("keywordGap", () => {
  const gap = keywordGap(POSTING, RESUME);
  const find = (t: string) => [...gap.required, ...gap.preferred].find((x) => x.term === t);

  it("splits required and preferred from cue phrases and headers", () => {
    expect(gap.required.map((t) => t.term).sort()).toEqual(["Dashboards", "Excel", "Python", "SQL"]);
    expect(gap.preferred.map((t) => t.term).sort()).toEqual(["Docker", "Machine learning", "Tableau"]);
  });

  it("buckets found, same idea in different words, and not found", () => {
    expect(find("Python")).toEqual({ term: "Python", bucket: "found" });
    expect(find("Excel")).toEqual({ term: "Excel", bucket: "found" }); // "MS Excel" contains it
    expect(find("Dashboards")).toEqual({ term: "Dashboards", bucket: "alias", alias: "Data viz" });
    expect(find("Machine learning")).toMatchObject({ bucket: "alias", alias: "ML" });
    expect(find("SQL")?.bucket).toBe("missing");
    expect(find("Tableau")?.bucket).toBe("missing");
  });

  it("a confirmed fact moves a term to found", () => {
    const g = keywordGap(POSTING, RESUME, ["SQL"]);
    expect(g.required.find((t) => t.term === "SQL")?.bucket).toBe("found");
  });

  it("a term named as required anywhere stays required", () => {
    const g = keywordGap("Nice to have: Python.\nPython is required.", "");
    expect(g.required.map((t) => t.term)).toEqual(["Python"]);
    expect(g.preferred).toEqual([]);
  });

  it("no cue at all counts as required; empty posting gives nothing", () => {
    expect(keywordGap("We use React and Git daily.", "").required.map((t) => t.term).sort()).toEqual(["Git", "React"]);
    expect(keywordGap("", RESUME)).toEqual({ required: [], preferred: [] });
  });
});
