import { describe, expect, it } from "vitest";
import { quoteIsReal } from "@/lib/quotes";
import { EXAMPLES } from "@/lib/examples";

describe("quoteIsReal", () => {
  it("matches across whitespace, curly quotes and case", () => {
    expect(quoteIsReal("we’ll  SEND\nyou", "Hi, we'll send you a check")).toBe(true);
  });
  it("rejects invented and over-long quotes", () => {
    expect(quoteIsReal("wire the money", "Hi, we'll send you a check")).toBe(false);
    expect(quoteIsReal("a".repeat(201), "a".repeat(300))).toBe(false);
    expect(quoteIsReal("", "anything")).toBe(false);
  });
  it("every saved example quote is really in its message", () => {
    for (const ex of Object.values(EXAMPLES)) {
      if (ex.savedSteps.extract.status !== "done") continue;
      const f = ex.savedSteps.extract.data;
      const quotes = [f.company?.quote, f.role?.quote, f.pay?.quote, f.offPlatform?.quote, f.interview.quote,
        f.dutiesVague?.quote, f.noExperienceNeeded?.quote, ...f.asks.map((a) => a.quote), ...f.pressure.map((p) => p.quote)];
      for (const q of quotes.filter(Boolean)) expect(quoteIsReal(q, ex.text), `${ex.id}: ${q}`).toBe(true);
    }
  });
});
