import { describe, expect, it } from "vitest";
import { annotate, locate } from "@/lib/client/annotate";

const joined = (segs: { text: string }[]) => segs.map((s) => s.text).join("");

describe("annotate (annotated message view)", () => {
  it("marks quotes in order, numbered, and keeps the text intact", () => {
    const text = "Hi! We will send a check. Deposit it and buy gift cards today.";
    const { segments, marks } = annotate(text, [
      { id: "deposit_check", quote: "Deposit it" },
      { id: "no_quote", quote: null },
      { id: "gift", quote: "buy gift cards" },
    ]);
    expect(joined(segments)).toBe(text);
    expect(marks).toEqual([{ n: 1, flagId: "deposit_check" }, { n: 2, flagId: "gift" }]);
    expect(segments.find((s) => s.marks[0]?.flagId === "gift")?.text).toBe("buy gift cards");
  });

  it("matches across curly quotes, case, extra spaces and zero-width characters", () => {
    const text = "They said “DON’T  tell​ your bank” twice.";
    const r = locate(text, "\"don't tell your bank\"");
    expect(r).not.toBeNull();
    expect(text.slice(...r!)).toBe("“DON’T  tell​ your bank”");
  });

  it("handles overlapping quotes: shared part carries both marks, each badge sits at its own end", () => {
    const text = "Pay the training fee by Zelle now.";
    const { segments } = annotate(text, [
      { id: "a", quote: "Pay the training fee" },
      { id: "b", quote: "training fee by Zelle" },
    ]);
    expect(joined(segments)).toBe(text);
    const shared = segments.find((s) => s.text === "training fee");
    expect(shared?.marks.map((m) => m.n)).toEqual([1, 2]);
    expect(shared?.ends.map((m) => m.n)).toEqual([1]);
    expect(segments.find((s) => s.text === " by Zelle")?.ends.map((m) => m.n)).toEqual([2]);
  });

  it("marks only the first of repeated phrases and skips quotes not in the text", () => {
    const text = "Reply YES. Reply YES.";
    const { segments, marks } = annotate(text, [{ id: "y", quote: "Reply YES" }, { id: "z", quote: "not here" }]);
    expect(marks).toHaveLength(1);
    expect(segments.filter((s) => s.marks.length)).toHaveLength(1);
    expect(segments[0].start).toBe(0);
  });

  it("maps NFKC full-width letters back to the original characters", () => {
    const text = "Contact us on Ｔｅｌｅｇｒａｍ today";
    const r = locate(text, "on Telegram");
    expect(text.slice(...r!)).toBe("on Ｔｅｌｅｇｒａｍ");
  });
});
