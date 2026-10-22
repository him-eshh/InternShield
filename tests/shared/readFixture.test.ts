import { describe, expect, it } from "vitest";
import { dedupeTranscript } from "@/lib/server/transcribe";
import { normalizeEol, readFixture } from "./readFixture";

describe("readFixture", () => {
  it("turns a deliberate CRLF/CR string into LF", () => {
    expect(normalizeEol("a\r\nb\rc\n")).toBe("a\nb\nc\n");
  });

  it("gives the same transcript result for a CRLF copy of a fixture", () => {
    const lf = readFixture("transcripts/multi.txt");
    expect(lf).not.toContain("\r");
    expect(dedupeTranscript(normalizeEol(lf.replace(/\n/g, "\r\n")))).toBe(dedupeTranscript(lf));
  });
});
