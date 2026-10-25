import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bankCompanies, bankTopics, filterBank, loadBank, normCompany } from "@/lib/tiers/bank";

const SOURCES = readFileSync("data/question-bank/SOURCES.md", "utf8");

describe("question bank data", () => {
  it("loads real, well-formed entries and stays small", async () => {
    const bank = await loadBank();
    expect(bank.length).toBeGreaterThan(1000);
    expect(statSync("data/question-bank/bank.json").size).toBeLessThan(2_000_000);
    for (const q of bank) {
      expect(Object.keys(q).sort()).toEqual(["companies", "difficulty", "id", "source", "tags", "title", "url"]);
      expect(["Easy", "Medium", "Hard"]).toContain(q.difficulty);
      expect(q.url).toMatch(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/);
      expect(q.title.length).toBeGreaterThan(1);
    }
    expect(new Set(bank.map((q) => q.id)).size).toBe(bank.length);
    expect(bank.some((q) => q.difficulty === "Hard")).toBe(true);
  });

  it("records source, license, commit SHA and retrieval date", () => {
    expect(SOURCES).toMatch(/MIT/);
    expect(SOURCES).toMatch(/33f44cb62594b13f7b3e0ec12e8f811b40fddd0d/);
    expect(SOURCES).toMatch(/182cd19fd53161efd70a1ef074fe1056b659bfa3/);
    expect(SOURCES).toMatch(/2026-10-25/);
  });
});

describe("filterBank", () => {
  it("filters by company, treating Meta as Facebook", async () => {
    const bank = await loadBank();
    const meta = filterBank(bank, { company: "Meta" });
    expect(meta.length).toBeGreaterThan(20);
    expect(meta.every((q) => q.companies.some((c) => normCompany(c) === "facebook"))).toBe(true);
    expect(filterBank(bank, { company: "no such co" })).toEqual([]);
  });

  it("filters by difficulty (mixed keeps all), topics and role", async () => {
    const bank = await loadBank();
    const hard = filterBank(bank, { difficulty: "hard" });
    expect(hard.length).toBeGreaterThan(0);
    expect(hard.every((q) => q.difficulty === "Hard")).toBe(true);
    expect(filterBank(bank, { difficulty: "mixed" })).toHaveLength(bank.length);
    const graphs = filterBank(bank, { topics: ["graph"] });
    expect(graphs.every((q) => q.tags.includes("graph"))).toBe(true);
    const fe = filterBank(bank, { role: "frontend" });
    expect(fe.length).toBeGreaterThan(0);
    expect(fe.length).toBeLessThan(bank.length);
    expect(filterBank(bank, { role: "swe" })).toHaveLength(bank.length);
  });

  it("combines filters and lists companies and topics", async () => {
    const bank = await loadBank();
    const both = filterBank(bank, { company: "Amazon", difficulty: "medium", topics: ["array"] });
    expect(both.every((q) => q.difficulty === "Medium" && q.tags.includes("array"))).toBe(true);
    expect(bankCompanies(bank)).toContain("Google");
    expect(bankTopics(bank)[0]).toBe("array");
  });
});
