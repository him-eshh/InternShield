import { describe, expect, it } from "vitest";
import { BEHAVIORAL_PROMPTS, DESIGN_PROMPTS, PORTFOLIO_FIRST, validateFeedback } from "@/lib/tiers/interview";
import type { InterviewTurn } from "@/lib/tiers/types";

describe("practice prompts", () => {
  it("are made-up, distinct and need no board (the Practice flow has none)", () => {
    for (const list of [BEHAVIORAL_PROMPTS, DESIGN_PROMPTS]) expect(new Set(list).size).toBe(list.length);
    expect(PORTFOLIO_FIRST.length).toBeGreaterThan(40);
    for (const p of DESIGN_PROMPTS) expect(p).not.toMatch(/board/i);
  });
});

describe("validateFeedback", () => {
  const turns: InterviewTurn[] = [
    { question: "Tell me about a time you led.", answer: "I led the chess club fundraiser and we raised three hundred dollars." },
    { question: "What went wrong?", answer: "We picked a date during exams, so fewer people came." },
  ];
  const item = (over: Record<string, unknown> = {}) => ({
    index: 0,
    strength: "Clear example.",
    improve: "Say what you learned.",
    quote: "raised three hundred dollars",
    star: { situation: true, task: false, action: true, result: true },
    ...over,
  });

  it("keeps a real quote and STAR for behavioral", () => {
    const fb = validateFeedback({ summary: "  Good start. ", items: [item()] }, turns, "behavioral");
    expect(fb).toEqual({
      summary: "Good start.",
      items: [{ index: 0, strength: "Clear example.", improve: "Say what you learned.", quote: "raised three hundred dollars", star: { situation: true, task: false, action: true, result: true } }],
    });
  });

  it("drops a fake quote or a quote from another answer", () => {
    const fb = validateFeedback({ summary: "x", items: [item({ quote: "raised a million dollars" }), item({ index: 1, quote: "chess club" })] }, turns, "behavioral");
    expect(fb?.items.map((i) => i.quote)).toEqual([null, null]);
    expect(validateFeedback({ summary: "x", items: [item({ quote: "" })] }, turns, "screen")?.items[0].quote).toBeNull();
  });

  it("drops out-of-range, non-integer and duplicate indexes", () => {
    const fb = validateFeedback(
      { summary: "x", items: [item({ index: 5 }), item({ index: -1 }), item({ index: 0.5 }), item({ index: "0" }), item({ index: 1, quote: "fewer people came" }), item({ index: 1, strength: "dup" })] },
      turns,
      "screen",
    );
    expect(fb?.items).toHaveLength(1);
    expect(fb?.items[0]).toMatchObject({ index: 1, strength: "Clear example.", quote: "fewer people came" });
  });

  it("sets star to null outside behavioral and when malformed", () => {
    expect(validateFeedback({ summary: "x", items: [item()] }, turns, "screen")?.items[0].star).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item()] }, turns, "coding")?.items[0].star).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item({ star: "yes" })] }, turns, "behavioral")?.items[0].star).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item({ star: { situation: true } })] }, turns, "behavioral")?.items[0].star).toEqual({
      situation: true,
      task: false,
      action: false,
      result: false,
    });
  });

  it("trims and caps strings", () => {
    const fb = validateFeedback({ summary: "s".repeat(900), items: [item({ strength: ` ${"a".repeat(500)} `, improve: "b".repeat(500) })] }, turns, "screen");
    expect(fb?.summary).toHaveLength(400);
    expect(fb?.items[0].strength).toHaveLength(300);
    expect(fb?.items[0].improve).toHaveLength(300);
  });

  it("sorts items by index", () => {
    const fb = validateFeedback({ summary: "x", items: [item({ index: 1, quote: "" }), item()] }, turns, "screen");
    expect(fb?.items.map((i) => i.index)).toEqual([0, 1]);
  });

  it("returns null when nothing usable remains", () => {
    expect(validateFeedback(null, turns, "screen")).toBeNull();
    expect(validateFeedback("feedback", turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: [] }, turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: "nope" }, turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item({ index: 9 })] }, turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item({ strength: 4 })] }, turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item({ strength: " ", improve: "" })] }, turns, "screen")).toBeNull();
    expect(validateFeedback({ summary: "x", items: [item()] }, [], "screen")).toBeNull();
  });

  it("allows a missing summary as empty text", () => {
    expect(validateFeedback({ items: [item()] }, turns, "screen")?.summary).toBe("");
  });
});
