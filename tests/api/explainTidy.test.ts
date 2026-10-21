import { describe, expect, it } from "vitest";
import { fallbackExplanation, tidyExplanation } from "@/lib/explainFallback";

describe("tidyExplanation", () => {
  it("leaves clean text alone", () => {
    expect(tidyExplanation('They said "send a check". That is a warning sign.')).toBe(
      'They said "send a check". That is a warning sign.',
    );
  });

  it("removes a repeated quoted string, straight or curly", () => {
    const out = tidyExplanation('The message says "buy a gift card" up front. Later it repeats “buy a gift card” again.');
    expect(out.match(/buy a gift card/g)).toHaveLength(1);
    expect(out).not.toMatch(/\s{2}|\s[.,]/);
  });

  it("drops the leftover lead-in sentence when its whole quote was a repeat", () => {
    const out = tidyExplanation('They wrote: "pay now". It is pressure. They wrote: "pay now".');
    expect(out.match(/pay now/g)).toHaveLength(1);
    expect(out).not.toMatch(/wrote:\s*\.?\s*$/);
  });

  it("drops whole repeat sentences without touching other lead-ins or prose", () => {
    expect(tidyExplanation('They wrote: "pay now". It is pressure. They wrote: "pay now".')).toBe(
      'They wrote: "pay now". It is pressure.',
    );
    expect(tidyExplanation('"Wire $500". Then: "Wire $500"')).toBe('"Wire $500".');
    expect(tidyExplanation('The recruiter says the pay is high. They wrote: "a" and "b". Again "a".')).toBe(
      'The recruiter says the pay is high. They wrote: "a" and "b".',
    );
    expect(tidyExplanation('They said "x". Then "x" and "y" came.')).toBe('They said "x". Then the same line and "y" came.');
  });

  it("keeps at most 2 paragraphs", () => {
    const out = tidyExplanation("One.\n\nTwo.\n\nThree.\n\nFour.");
    expect(out).toBe("One.\n\nTwo.");
  });

  it("caps near 700 characters, cut at a sentence end", () => {
    const text = Array.from({ length: 40 }, (_, i) => `This is sentence number ${i} of the long text.`).join(" ");
    const out = tidyExplanation(text);
    expect(out.length).toBeLessThanOrEqual(700);
    expect(out.length).toBeGreaterThan(500);
    expect(out.endsWith(".")).toBe(true);
    expect(text.startsWith(out)).toBe(true);
  });
});

describe("fallbackExplanation quote dedupe", () => {
  it("never repeats the same quote", () => {
    const q = "Once you deposit the check";
    const text = fallbackExplanation({
      level: "high",
      flags: [
        { title: "Asks you to deposit a check", quote: q, why: "w" },
        { title: "Fake check", quote: q, why: "w" },
      ],
    });
    expect(text.split(q).length - 1).toBe(1);
  });
});
