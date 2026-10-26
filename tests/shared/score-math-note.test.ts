import { describe, expect, it } from "vitest";
import { scoreMathNote } from "@/lib/reportView";
import type { Flag } from "@/lib/types";

const flag = (points: number, critical = false): Flag => ({ id: "x", group: "offer", kind: points < 0 ? "good" : "red", title: "t", quote: null, why: "w", points, critical }) as Flag;

describe("scoreMathNote", () => {
  it("stays quiet when the weights add up", () => expect(scoreMathNote({ score: 30, flags: [flag(40), flag(-10)] })).toBeNull());
  it("explains the critical floor", () => expect(scoreMathNote({ score: 85, flags: [flag(40, true), flag(40)] })).toBe("The rule weights add up to 80. A critical sign sets the score to at least 85."));
  it("explains the 100 cap", () => expect(scoreMathNote({ score: 100, flags: [flag(80), flag(40)] })).toContain("stops at 100"));
  it("explains the good-sign cap", () => expect(scoreMathNote({ score: 10, flags: [flag(30), flag(-15), flag(-15)] })).toContain("at most 20"));
});
