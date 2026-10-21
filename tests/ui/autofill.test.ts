import { describe, expect, it } from "vitest";
import { autofill } from "@/lib/autofill";
import { EXAMPLES } from "@/lib/examples";

describe("autofill", () => {
  it("guesses everything for the scam example", () => {
    const g = autofill(EXAMPLES.scam.text);
    expect(g.sender).toBe("brightline.datasolutions.hr@gmail.com");
    expect(g.company).toBe("Brightline Data Solutions");
    expect(g.source).toBeNull(); // mentions Handshake and WhatsApp in the body: not a cue
    expect(g.stage).toBe("offer");
  });

  it("guesses everything for the real example", () => {
    const g = autofill(EXAMPLES.real.text);
    expect(g.sender).toBe("jordan.lee@stripe.com");
    expect(g.company).toBe("Stripe");
    expect(g.source).toBe("company_site");
    expect(g.stage).toBeNull();
  });

  it("falls back to a phone number when there is no email", () => {
    const g = autofill("Hi! Text me at +1 (213) 555-0147 about the job on WhatsApp.");
    expect(g.sender).toBe("+1 (213) 555-0147");
    expect(g.source).toBeNull();
  });

  it("guesses the company from a work email website", () => {
    expect(autofill("Please reply to hiring@acme.com").company).toBe("Acme");
  });

  it("finds 'Acme team' and the interviewing stage", () => {
    const g = autofill("Following our interview, the Acme team would like to move forward.");
    expect(g.company).toBe("Acme");
    expect(g.stage).toBe("interviewing");
  });

  it("returns nothing for empty text", () => {
    expect(autofill("  ")).toEqual({ sender: null, company: null, source: null, stage: null });
  });
});
