import { describe, expect, it } from "vitest";
import { loadMessages, toInput } from "@/eval/load";
import { quoteIsReal } from "@/lib/quotes";
import { BANNED_WORDS } from "@/lib/scoring/rules";
import { score } from "@/lib/scoring/score";

const messages = loadMessages();

describe("eval messages", () => {
  it("has about 25 labeled messages", () => {
    expect(messages.length).toBeGreaterThanOrEqual(24);
  });

  it.each(messages.map((m) => [m.name, m] as const))("%s: saved fact quotes are real", (_, m) => {
    if (m.savedSteps.extract.status !== "done") return;
    const f = m.savedSteps.extract.data;
    const quotes = [f.company?.quote, f.role?.quote, f.pay?.quote, f.offPlatform?.quote, f.dutiesVague?.quote, f.noExperienceNeeded?.quote, f.interview.quote, ...f.asks.map((a) => a.quote), ...f.pressure.map((p) => p.quote)];
    for (const q of quotes.filter(Boolean)) expect(quoteIsReal(q, m.text), q!).toBe(true);
  });

  it.each(messages.map((m) => [m.name, m] as const))("%s: lands in its expected level", (_, m) => {
    expect(score(toInput(m)).level).toBe(m.expectedLevel);
  });

  it("no flag title or why ever says safe, legit, or guaranteed", () => {
    for (const m of messages) {
      const r = score(toInput(m));
      for (const f of r.flags) {
        expect(BANNED_WORDS.test(f.title), `${m.name}: ${f.title}`).toBe(false);
        expect(BANNED_WORDS.test(f.why), `${m.name}: ${f.why}`).toBe(false);
      }
      for (const c of r.couldntCheck) expect(BANNED_WORDS.test(c.reason), c.reason).toBe(false);
    }
  });

  it("every flag quote is real message text", () => {
    for (const m of messages) {
      for (const f of score(toInput(m)).flags) if (f.quote) expect(quoteIsReal(f.quote, m.text), `${m.name}: ${f.id}`).toBe(true);
    }
  });
});
