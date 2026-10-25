import { describe, expect, it } from "vitest";
import { checkRewrite, wordDiff } from "@/lib/tiers/resumeGuard";
import type { GuardIssue, GuardResult } from "@/lib/tiers/types";

// Made-up resume.
const RESUME = `Jamie Rivera
Software Engineering Intern, Brightleaf Labs, Austin, TX (2025)
Built a dashboard in React and Python that cut report time by 40%.
Wrote SQL queries to clean survey data for 3 research projects.
Organized weekly study sessions for the robotics club.
Skills: Python, React, SQL, Git, Excel`;

const LINE = "Built a dashboard in React and Python that cut report time by 40%.";

const issues = (r: GuardResult): GuardIssue[] => (r.ok ? [] : r.issues);
const tokens = (r: GuardResult) => issues(r).map((i) => `${i.kind}:${i.token.toLowerCase()}`);

describe("checkRewrite: honest rewordings pass", () => {
  it.each([
    "Developed a React and Python dashboard that reduced report time by 40%.",
    "Created a dashboard with Python and React, cutting reporting time by 40%.",
    "Designed and built a dashboard in react and python, reducing report time 40%.",
    "Streamlined reporting by building a React dashboard backed by Python, cutting time by 40 percent.",
    "At Brightleaf Labs, built a dashboard in React and Python that cut report time by 40%.",
    "As a Software Engineering Intern, I built a React dashboard that cut report time by 40%.",
    "Spearheaded a dashboard in React that cut report time by 40%. Python handled the data.",
  ])("%s", (rewrite) => {
    expect(checkRewrite(RESUME, LINE, rewrite)).toEqual({ ok: true });
  });

  it("does not move numbers from another experience into this bullet", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "Used SQL and Git across 3 projects in Austin in 2025."))).toEqual(expect.arrayContaining(["number:3", "number:2025"]));
  });
});

describe("checkRewrite: invented facts fail", () => {
  it("does not swap two existing metrics between achievements", () => {
    const line = "Built 2 apps and taught 100 students.";
    expect(tokens(checkRewrite(line, line, "Built 100 apps and taught 2 students."))).toEqual(expect.arrayContaining(["number:100", "number:2"]));
  });
  it("invented employer", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "Built a dashboard for Northwind Capital in React and Python."))).toContain(
      "proper_noun:northwind capital",
    );
  });

  it("invented number and percent", () => {
    const t = tokens(checkRewrite(RESUME, LINE, "Built a dashboard in React that cut report time by 65% for 12 teams."));
    expect(t).toEqual(expect.arrayContaining(["number:65%", "number:12"]));
  });

  it("invented year", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "In 2023 built a dashboard in React and Python."))).toContain("number:2023");
  });

  it("invented money and multiplier", () => {
    const t = tokens(checkRewrite(RESUME, LINE, "Built a dashboard that saved $15,000 and ran 3x faster."));
    expect(t).toEqual(expect.arrayContaining(["number:$15,000", "number:3x"]));
  });

  it("invented title", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "As Lead Engineer, built a dashboard in React and Python."))).toContain(
      "proper_noun:lead engineer",
    );
  });

  it("invented tool, capitalized", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "Built a dashboard in React and Python, deployed on Kubernetes."))).toContain(
      "skill:kubernetes",
    );
  });

  it("invented tools, lowercase", () => {
    const t = tokens(checkRewrite(RESUME, LINE, "built a dashboard in node.js and c++ on kubernetes with tableau."));
    expect(t).toEqual(expect.arrayContaining(["skill:node.js", "skill:c++", "skill:kubernetes", "skill:tableau"]));
  });

  it("invented field skill from the profile suggestions", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "Built a dashboard in React using financial modeling."))).toContain(
      "skill:financial modeling",
    );
  });

  it("invented place", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "Built a dashboard in React for the Chicago office."))).toContain("proper_noun:chicago");
  });

  it("a sentence-initial proper noun is still caught", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "Microsoft teams used a dashboard I built in React."))).toContain(
      "proper_noun:microsoft",
    );
  });

  it("dedupes issues and reports a tool once, as a skill", () => {
    const r = checkRewrite(RESUME, LINE, "Built a Docker dashboard in React. Docker ran it in 2023, and 2023 was busy.");
    expect(tokens(r)).toEqual(["number:2023", "skill:docker"]);
  });

  it("spelled-out numbers and multipliers fail unless the resume backs them", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "Built a React dashboard used by twelve teams."))).toContain("number:twelve");
    expect(tokens(checkRewrite(RESUME, LINE, "Built a React dashboard that doubled report speed."))).toContain("number:doubled");
    expect(tokens(checkRewrite(RESUME, LINE, "Built a React dashboard used by hundreds of students."))).toContain("number:hundreds");
    // "three" = the resume's 3; "one of" isn't a count.
    expect(checkRewrite(RESUME, LINE, "Wrote SQL queries that cleaned survey data for three research projects.")).toEqual({ ok: true });
    expect(checkRewrite(RESUME, LINE, "Built one of the dashboards in React and Python, cutting report time by 40%.")).toEqual({ ok: true });
  });

  it("a sentence-initial -ing/-ed name is caught unless the word is ordinary", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "Boeing teams used a dashboard I built in React."))).toContain("proper_noun:boeing");
    // Not on the common list, but used in lowercase elsewhere in the rewrite.
    expect(
      checkRewrite(RESUME, LINE, "Reworked the dashboard in React and Python; reworked reports cut time by 40%."),
    ).toEqual({ ok: true });
  });

  it("lowercase invented employers fail", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "built a dashboard at acme in react and python."))).toContain("proper_noun:acme");
    expect(tokens(checkRewrite(RESUME, LINE, "worked for globex building a react dashboard."))).toContain("proper_noun:globex");
    expect(tokens(checkRewrite(RESUME, LINE, "built a react dashboard for initech labs."))).toContain("proper_noun:initech");
  });

  it("lowercase invented titles fail", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "as a senior engineer, built a react dashboard."))).toContain("proper_noun:senior");
    expect(tokens(checkRewrite(RESUME, LINE, "built a react dashboard as the lead developer."))).toContain("proper_noun:lead");
    expect(tokens(checkRewrite(RESUME, LINE, "built a react dashboard as head of analytics."))).toContain("proper_noun:head of");
  });

  it("ordinary prepositions and the verb 'lead' pass", () => {
    for (const rewrite of [
      "Worked with the team to build a dashboard in React and Python.",
      "Worked with stakeholders to build a React dashboard that cut report time by 40%.",
      "Built a React dashboard at scale for the robotics club.",
      "Lead weekly study sessions for the robotics club.",
      "Organized weekly study sessions with other members of the robotics club.",
    ]) {
      expect(checkRewrite(RESUME, LINE, rewrite), rewrite).toEqual({ ok: true });
    }
  });

  it("a title already flagged as a name isn't repeated in lowercase", () => {
    expect(tokens(checkRewrite(RESUME, LINE, "As Lead Engineer, built a dashboard in React and Python."))).toEqual([
      "proper_noun:lead engineer",
    ]);
  });

  it("rejects an empty or too long rewrite", () => {
    expect(checkRewrite(RESUME, LINE, "   ").ok).toBe(false);
    expect(checkRewrite(RESUME, LINE, "word ".repeat(130)).ok).toBe(false);
  });
});

describe("wordDiff", () => {
  const join = (parts: { text: string }[]) => parts.map((p) => p.text).join("");

  it("identical text is one same part", () => {
    expect(wordDiff("cut report time", "cut report time")).toEqual([{ kind: "same", text: "cut report time" }]);
  });

  it("marks a replaced word as removed then added", () => {
    expect(wordDiff("Built a dashboard", "Created a dashboard")).toEqual([
      { kind: "removed", text: "Built" },
      { kind: "added", text: " Created" }, // never glued onto the removed word
      { kind: "same", text: " a dashboard" },
    ]);
  });

  it("merges adjacent parts of the same kind", () => {
    const parts = wordDiff("cut time", "cut report time by a lot");
    expect(parts).toEqual([
      { kind: "same", text: "cut" },
      { kind: "added", text: " report" },
      { kind: "same", text: " time" },
      { kind: "added", text: " by a lot" },
    ]);
  });

  it("the same+added parts rebuild the new text and same+removed the old", () => {
    const before = "Wrote SQL queries to clean survey data";
    const after = "Wrote clear SQL queries that cleaned survey data";
    const parts = wordDiff(before, after);
    expect(join(parts.filter((p) => p.kind !== "removed"))).toBe(after);
    expect(join(parts.filter((p) => p.kind !== "added"))).toBe(before);
    for (let i = 1; i < parts.length; i++) expect(parts[i].kind).not.toBe(parts[i - 1].kind);
  });

  it("handles empty sides", () => {
    expect(wordDiff("", "new text")).toEqual([{ kind: "added", text: "new text" }]);
    expect(wordDiff("old text", "")).toEqual([{ kind: "removed", text: "old text" }]);
    expect(wordDiff("", "")).toEqual([]);
  });
});
