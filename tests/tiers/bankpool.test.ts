import { describe, expect, it } from "vitest";
import { filterBank, loadBank } from "@/lib/tiers/bank";
import { askedScore, companyFamily, companyScope, groupTopics, pickFromBank, selectPool } from "@/lib/tiers/bankPool";
import { bankTopics } from "@/lib/tiers/bank";

const none = new Set<string>();
const rand = () => 0;

// The questions of one company, most asked first (what pickFromBank draws its top from).
const rankMostAsked = (bank: Awaited<ReturnType<typeof loadBank>>, company: string) =>
  [...filterBank(bank, { company })].sort((x, y) => askedScore(y, [company.toLowerCase()]) - askedScore(x, [company.toLowerCase()]) || x.id.localeCompare(y.id, "en", { numeric: true }));

describe("company scope and similar-question fallback", () => {
  it("keeps an exact match exact, with no substitution message", async () => {
    const bank = await loadBank();
    const scope = companyScope(bank, "Amazon");
    expect(scope.kind).toBe("exact");
    expect(scope.message).toBeNull();
    const picked = selectPool(bank, { company: "Amazon", difficulty: "hard", topics: ["array"] }, none)!;
    expect(picked.note).toBeUndefined();
    expect(picked.pool.every((q) => q.companies.includes("Amazon") && q.difficulty === "Hard" && q.tags.includes("array"))).toBe(true);
  });

  it("maps Stripe to similar fintech questions and says so", async () => {
    const bank = await loadBank();
    const scope = companyScope(bank, "Stripe");
    expect(scope.kind).toBe("similar");
    expect(scope.message).toBe("No Stripe-tagged questions; showing similar fintech questions.");
    const picked = pickFromBank(bank, { company: "Stripe", difficulty: "medium" }, none, rand)!;
    expect(picked.note).toContain("No Stripe-tagged questions; showing similar fintech questions.");
    const fintech = new Set(companyFamily("Stripe")!.members);
    expect(picked.q.difficulty).toBe("Medium");
    expect(picked.q.companies.some((c) => fintech.has(c.toLowerCase()))).toBe(true);
  });

  it("maps Jane Street to quant-trading neighbours", async () => {
    const bank = await loadBank();
    const scope = companyScope(bank, "Jane Street");
    expect(scope.kind).toBe("similar");
    expect(scope.label).toBe("quant trading");
    expect(scope.message).toMatch(/^No Jane Street-tagged questions; showing similar quant trading questions\.$/);
    expect(selectPool(bank, { company: "Jane Street" }, none)!.pool.length).toBeGreaterThan(8);
  });

  it("falls back to the most commonly asked questions for a company with no neighbours, never an unrelated random one", async () => {
    const bank = await loadBank();
    const scope = companyScope(bank, "Zzyzx Gardening Co");
    expect(scope.kind).toBe("top");
    const picked = selectPool(bank, { company: "Zzyzx Gardening Co", topics: ["graph"], difficulty: "hard" }, none)!;
    expect(picked.note).toMatch(/^No Zzyzx Gardening Co-tagged questions; showing the most commonly asked/);
    expect(picked.pool.every((q) => q.tags.includes("graph") && q.difficulty === "Hard")).toBe(true);
  });

  it("relaxes difficulty before topic, then topic, and names what changed", async () => {
    const bank = await loadBank();
    const narrow = bank.filter((q) => q.companies.includes("Cisco"));
    const cisco = narrow.filter((q) => q.difficulty === "Easy" && !q.tags.includes("graph"));
    expect(cisco.length).toBeGreaterThan(0);
    const level = selectPool(bank, { company: "Cisco", difficulty: "hard", topics: ["array"] }, new Set(narrow.filter((q) => q.difficulty === "Hard" && q.tags.includes("array")).map((q) => q.id)))!;
    expect(level.note).toMatch(/different difficulty/);
    expect(level.pool.every((q) => q.tags.includes("array") && q.companies.includes("Cisco"))).toBe(true);
  });

  it("widens from an exhausted company to similar companies, and returns null only when everything is used", async () => {
    const bank = await loadBank();
    const used = new Set(filterBank(bank, { company: "Affirm" }).map((q) => q.id));
    const widened = selectPool(bank, { company: "Affirm" }, used)!;
    expect(widened.note).toMatch(/You've seen every matching Affirm question; showing similar fintech questions/);
    expect(selectPool(bank, {}, new Set(bank.map((q) => q.id)))).toBeNull();
  });
});

describe("most asked ranking", () => {
  it("ranks by lists carrying the question, then by the company's place in its own list", async () => {
    const bank = await loadBank();
    const a = { id: "a", title: "A", difficulty: "Easy", url: "", tags: [], companies: ["Google", "Amazon"], source: "" } as (typeof bank)[number];
    const b = { ...a, id: "b", companies: ["Amazon", "Google", "Apple", "Meta"] };
    expect(askedScore(b)).toBeGreaterThan(askedScore(a));
    expect(askedScore(b, ["amazon"])).toBeGreaterThan(askedScore(a, ["amazon"]));
    expect(askedScore(a, ["stripe"])).toBe(-1);
    const ranked = rankMostAsked(bank, "Amazon");
    expect(ranked.length).toBe(filterBank(bank, { company: "Amazon" }).length);
    for (let i = 1; i < ranked.length; i++) expect(askedScore(ranked[i - 1], ["amazon"])).toBeGreaterThanOrEqual(askedScore(ranked[i], ["amazon"]));
  });

  it("picks among the top of the ranking when mostAsked is on", async () => {
    const bank = await loadBank();
    const top = new Set(rankMostAsked(bank, "Amazon").slice(0, 8).map((q) => q.id));
    for (const r of [0, 0.5, 0.999]) expect(top.has(pickFromBank(bank, { company: "Amazon" }, none, () => r, true)!.q.id)).toBe(true);
    expect(pickFromBank(bank, { company: "Amazon" }, none, rand, true)!.note).toBe("One of the most asked at Amazon.");
  });
});

describe("topic groups", () => {
  it("covers every tag exactly once, with no empty group", async () => {
    const bank = await loadBank();
    const tags = bankTopics(bank);
    const groups = groupTopics(tags);
    expect(groups.every((g) => g.topics.length > 0)).toBe(true);
    expect(groups.flatMap((g) => g.topics).sort()).toEqual([...tags].sort());
    expect(groups.length).toBeLessThan(10);
  });
});
