import { describe, expect, it } from "vitest";
import { codeFor, failed, MESSAGES } from "@/lib/server/http";
import { errorCopy, stepNote } from "@/lib/client/errorCopy";

describe("typed error codes", () => {
  it.each([
    ["timeout", {}, "TIMEOUT"],
    ["limit", {}, "RATE_LIMITED"],
    ["limit", { message: MESSAGES.daily }, "DAILY_CAP"],
    ["limit", { retryAfter: 7200 }, "DAILY_CAP"],
    ["error", { status: 400 }, "BAD_INPUT"],
    ["error", { status: 413 }, "TOO_LARGE"],
    ["error", {}, "UPSTREAM"],
    ["error", { code: "NOT_FOUND" as const }, "NOT_FOUND"],
  ] as const)("%s %o -> %s", (reason, opts, code) => {
    expect(codeFor(reason, opts)).toBe(code);
  });

  it("puts the code in the body", async () => {
    const body = await failed("limit", { message: MESSAGES.daily }).json();
    expect(body.code).toBe("DAILY_CAP");
  });

  it("maps codes to short copy, generic only when unmapped", () => {
    expect(errorCopy("DAILY_CAP")).toMatch(/resting/);
    expect(errorCopy(undefined, "timeout")).toMatch(/too long/);
    expect(errorCopy("UNKNOWN")).toBe("Something went wrong. Try again.");
    expect(stepNote("TIMEOUT")).toBe("took too long");
    expect(stepNote(undefined, "limit")).toBe("busy, try again soon");
    expect(stepNote(undefined, "error")).toBe("couldn't check");
  });
});
