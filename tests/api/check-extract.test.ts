// Bug D server side: a department in the AI's company field is demoted (made-up message).
import { describe, expect, it } from "vitest";
import { quoteCheck } from "@/lib/server/extract";
import { EXTRACT_SCHEMA } from "@/lib/server/extractSchema";

const MSG = "I'm Jordan from the University Recruiting team at Initech Recruiting. Let's talk.";
const base = { isJobMessage: true, sender: {}, interview: { status: "unclear", quote: null } };

describe("extract department vs company", () => {
  it("schema has a department field", () => {
    expect(EXTRACT_SCHEMA.required).toContain("department");
  });

  it("moves a department-only company into department", () => {
    const f = quoteCheck({ ...base, company: { value: "University Recruiting", quote: "the University Recruiting team" }, department: null }, MSG)!;
    expect(f.company).toBeNull();
    expect(f.department).toBe("University Recruiting");
  });

  it("strips department words off a real company", () => {
    const f = quoteCheck({ ...base, company: { value: "Initech Recruiting", quote: "at Initech Recruiting" }, department: "University Recruiting" }, MSG)!;
    expect(f.company?.value).toBe("Initech");
    expect(f.department).toBe("University Recruiting");
  });

  it("drops a company name that its real quote does not say", () => {
    const f = quoteCheck({ ...base, company: { value: "MegaBank", quote: "Let's talk" } }, MSG)!;
    expect(f.company).toBeNull();
  });

  it("drops a critical label when the quoted words do not describe that action", () => {
    const f = quoteCheck({ ...base, asks: [{ kind: "pay_fee", quote: "Let's talk" }] }, MSG)!;
    expect(f.asks).toEqual([]);
  });
});
