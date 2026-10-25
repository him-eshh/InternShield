// Review fixes (session 5): legit near misses that used to trip a C2 rule.
import { describe, expect, it } from "vitest";
import { score } from "@/lib/scoring/score";
import { input } from "./helpers";

const ids = (text: string) => score(input({ text, source: "email" })).flags.map((f) => f.id);

describe("near misses from the C2 review", () => {
  it("a driver's license for the I-9 is not 'install a driver'", () => {
    expect(ids("On your first day, please bring a driver's license or passport so HR can run the I-9. We'll download the forms together.")).not.toContain("run_code_or_install");
  });

  it("'download setup.exe' and 'run the .exe' still count", () => {
    expect(ids("Please download setup.exe and run it before the call.")).toContain("run_code_or_install");
    expect(ids("Please download the attached .exe and run it before the call.")).toContain("run_code_or_install");
  });

  it("a bare 'mobile deposit' or 'e-check' is normal banking", () => {
    expect(ids("Payroll pays by direct deposit; if you prefer an e-check you can request one in Workday. Mobile deposit works too.")).not.toContain("money_wrong_way");
    // One critical per money family: deposit_check may claim it first.
    const scam = ids("We'll send you an e-check; after the mobile deposit, send the remaining balance to our vendor by Zelle.");
    expect(scam.some((id) => id === "money_wrong_way" || id === "deposit_check")).toBe(true);
  });

  it("'your mentor' and 'complete 3 tasks' alone aren't task-scam vocabulary", () => {
    const r = score(input({ text: "Welcome! Your mentor will meet you Monday. Please complete 3 tasks in the onboarding portal.", source: "email" }));
    expect(r.flags.some((f) => f.title === "This looks like a task scam")).toBe(false);
  });

  it("soft hyphens and LRM marks don't trigger the hidden-characters flag", () => {
    const text = "Our news­letter: new intern­ships at Acme ‎Tel Aviv‎ office, apply on our careers page.";
    expect(ids(text)).not.toContain("hidden_characters");
  });
});
