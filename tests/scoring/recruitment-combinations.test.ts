import { describe, expect, it } from "vitest";
import { score } from "@/lib/scoring/score";
import { input } from "./helpers";

describe("combined remote recruitment signals", () => {
  it.each([null, undefined])("scores campus text applications high with facts=%s", (facts) => {
    const text = "The department seeks weekly paid study/research assistants. Work remotely. Text Professor Example at (202) 555-0146 with your full name, email, department and year of study.";
    expect(score(input({ text, facts, source: "email" })).level).toBe("high");
  });
  it("scores payment and gift duties with easy weekly pay high", () => {
    const text = "Personal assistant needed, home-based, making or receiving payment and sending gifts. $400 weekly, 11 hrs. Click here to apply.";
    expect(score(input({ text, facts: null, source: "email" })).level).toBe("high");
  });
  it("does not let an application-first channel erase the combined scam signals", () => {
    const messages = [
      "Weekly paid research assistants can work remotely. Text Example at (202) 555-0146 with your name and email.",
      "Personal assistant, home-based, making or receiving payment and sending gifts. $400 weekly, 11 hrs.",
    ];
    for (const text of messages) {
      expect(score(input({ text, source: "handshake", answers: { who_first: "yes" } })).level).toBe("high");
    }
  });
  it("scores an easy-pay remote offer without an interview high", () => {
    const text = "Remote assistant, $600 per week for 8 hours per week. No interview required.";
    expect(score(input({ text, facts: null, source: "email" })).level).toBe("high");
  });
  it.each([
    "Remote research assistants are paid weekly. Apply on the university careers portal with your name and email. Interviews next week.",
    "Remote personal assistant, $400 weekly for 11 hours. Apply on our careers site; interviews follow.",
    "Your interview reminder: text (202) 555-0146 to reschedule. Remote role, $400 weekly for 10 hours.",
    "Remote assistant, $400 weekly for 11 hours. Never text (202) 555-0146 with your name and email.",
    "Remote assistant, $400 weekly for 11 hours. We never ask you to make payments and send gifts.",
  ])("keeps normal hiring and warnings below high: %s", (text) => {
    expect(score(input({ text, source: "email" })).level).not.toBe("high");
  });
});
