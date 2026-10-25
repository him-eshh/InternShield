import { describe, expect, it } from "vitest";
import { guardRewrite } from "@/lib/tiers/resumeGuard";
import type { GuardTier, TargetLevel } from "@/lib/tiers/types";

// 40 made-up pairs (findings 03 section 4 "Test it"): original -> rewrite -> expected tier.
const RESUME = `Riley Park
Skills: Python, ML, Excel, Postgres, Figma
- Helped build a Flask dashboard for the campus food pantry used by 40 volunteers
- Co-founded the robotics club and ran weekly meetings
- Worked on a team of 4 to test a mobile app
- Double-checked weekly inventory counts at Maple Grocery
- Built a Python script that cleaned survey data for the psych lab`;
const POSTING = "Data Analyst Intern. Required: SQL, Tableau, Python. Nice to have: Docker.";

type Case = [string, string, GuardTier, { level?: TargetLevel; facts?: string[]; noBuzzwords?: boolean }?];
const L1 = "Helped build a Flask dashboard for the campus food pantry used by 40 volunteers";
const L2 = "Co-founded the robotics club and ran weekly meetings";
const L3 = "Worked on a team of 4 to test a mobile app";
const L4 = "Double-checked weekly inventory counts at Maple Grocery";
const L5 = "Built a Python script that cleaned survey data for the psych lab";

const CASES: Case[] = [
  // OK: honest rewordings
  [L1, "Helped build a Flask dashboard used by 40 volunteers at the campus food pantry", "ok"],
  [L1, "Helped create a Flask dashboard for 40 food pantry volunteers", "ok"],
  [L2, "Co-founded the robotics club; ran its weekly meetings", "ok"],
  [L3, "Worked on a team of 4 to test a mobile app before release", "ok"],
  [L4, "Double-checked weekly inventory counts at Maple Grocery", "ok"],
  [L5, "Built a Python script to clean survey data for the psychology lab", "ok"],
  [L5, "Wrote a Python script that cleaned the psych lab's survey data", "ok"],
  [L5, "Built a Python script that cleaned survey data with machine learning", "block"], // ML elsewhere is not evidence for this project
  [L5, "Built a PostgreSQL-backed Python script that cleaned survey data", "block"], // Postgres elsewhere is not evidence for this project
  [L5, "Built a Python script in Microsoft Excel workflows to clean survey data", "block"], // Excel elsewhere is not evidence for this project
  [L4, "Double-checked inventory counts each week at Maple Grocery, one-on-one with new staff", "ok"],
  [L3, "Worked on a team of 4 to test a mobile app, 24/7 support rotation", "ok"],
  [L5, "Built a Python script that cleaned SQL survey data", "ok", { facts: ["SQL"] }], // confirmed fact
  [L1, "Helped build a Flask dashboard for the campus food pantry, used by 40 volunteers in Q3", "block"], // "Q3": new name
  // Block: invented facts
  [L1, "Helped build a Flask dashboard used by 120 volunteers", "block"],
  [L1, "Helped build a Flask dashboard that cut wait times by 30%", "block"],
  [L5, "Built a Python and SQL script that cleaned survey data", "block"],
  [L5, "Built a Python script that fed Tableau dashboards", "block"],
  [L5, "Built a Docker-packaged Python script that cleaned survey data", "block"],
  [L4, "Double-checked weekly inventory counts at Maple Grocery and Costco", "block"],
  [L2, "Co-founded the robotics club in 2021 and ran weekly meetings", "block"],
  [L3, "Worked on a team of 12 to test a mobile app", "block"],
  [L3, "Worked as Senior QA on a team of 4 to test a mobile app", "block"],
  [L5, "Built a Python script that cleaned survey data for three labs", "block"],
  [L5, "Built a Python script that saved $5,000 in survey costs", "block"],
  [L1, "Helped build a React dashboard for the campus food pantry", "block"],
  [L5, "Built a Python script that won 1st place at a hackathon", "block"],
  // Check: soft warnings
  [L1, "Led a Flask dashboard build for the campus food pantry used by 40 volunteers", "check"], // inflated
  [L3, "Owned testing for a mobile app on a team of 4", "check"], // inflated (worked on -> owned)
  [L2, "Founded the robotics club and ran weekly meetings", "check"], // co- dropped + founded
  [L1, "Built a Flask dashboard for the campus food pantry used by 40 volunteers", "check"], // "helped" dropped
  [L5, "Built an end-to-end Python script that cleaned survey data for the psych lab", "check"], // scope
  [L5, "Built a production Python script that cleaned survey data for the psych lab", "check"], // scope
  [L5, "Built a Python script that cleaned all survey data for the psych lab", "check"], // scope
  [L5, "Architected a Python script that cleaned survey data for the psych lab", "check", { level: "internship" }],
  [L2, "Co-founded the robotics club and managed weekly meetings", "check", { level: "newgrad" }],
  [L5, "Built a Python script that cleaned survey data for the psych lab, leveraged daily", "check", { noBuzzwords: true }],
  [L5, "Spearheaded a Python script that cleaned survey data for the psych lab", "check"], // inflated
  [L4, "Double-checked inventory counts company-wide at Maple Grocery", "check"], // scope
  [L5, "Built a Python script that cleaned survey data for the psych lab", "ok"], // unchanged
];

describe("guard v2 eval (40 made-up pairs)", () => {
  it("has 40 cases", () => expect(CASES.length).toBe(40));
  it.each(CASES.map((c, i) => [i + 1, ...c] as const))("#%i %s -> %s", (_n, original, rewrite, tier, opts) => {
    const r = guardRewrite({ resume: RESUME, original, rewrite, posting: POSTING, ...opts });
    expect({ tier: r.tier, issues: r.issues, warnings: r.warnings }).toMatchObject({ tier });
  });
});

describe("guard v2 details", () => {
  it("blocks another bullet's employer, metric and skill from moving into this experience", () => {
    const r = guardRewrite({
      resume: RESUME,
      original: L5,
      rewrite: "Built a Python and Figma script for Maple Grocery that cleaned survey data for 40 volunteers",
      posting: null,
    });
    expect(r.tier).toBe("block");
    expect(r.issues).toEqual(expect.arrayContaining([
      { kind: "skill", token: "Figma" },
      { kind: "proper_noun", token: "Maple Grocery" },
      { kind: "number", token: "40" },
    ]));
  });
  it("accepts an alias backed by the same bullet and a user-confirmed posting skill", () => {
    const original = "Built a Postgres report with Python";
    const r = guardRewrite({ resume: RESUME, original, rewrite: "Built a PostgreSQL report with Python and SQL", facts: ["SQL"] });
    expect(r.tier).toBe("ok");
  });
  it("labels posting terms that aren't in the resume", () => {
    const r = guardRewrite({ resume: RESUME, original: L5, rewrite: "Built a Python and SQL script that fed Tableau", posting: POSTING });
    expect(r.fromPosting.sort()).toEqual(["SQL", "Tableau"]);
  });
  it("names the weaker verb the original used", () => {
    const r = guardRewrite({ resume: RESUME, original: L1, rewrite: "Led a Flask dashboard for 40 volunteers", posting: null });
    expect(r.warnings).toContainEqual({ kind: "inflated", token: "led", was: "helped" });
    expect(r.warnings).toContainEqual({ kind: "qualifier", token: "helped" });
  });
  it("digit tokens only: Q3 and COVID-19 aren't counts, 'double-checked' isn't 'double'", () => {
    const r = guardRewrite({ resume: "Tracked COVID-19 case counts", original: "Tracked COVID-19 case counts", rewrite: "Double-checked COVID-19 case counts", posting: null });
    expect(r.issues.filter((x) => x.kind === "number")).toEqual([]);
  });
});
