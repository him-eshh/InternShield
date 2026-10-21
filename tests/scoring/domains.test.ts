import { describe, expect, it } from "vitest";
import { editDistance, emailDomain, lookalike, registrableDomain } from "@/lib/scoring/domains";

describe("domains", () => {
  it("finds registrable domains", () => {
    expect(registrableDomain("https://jobs.acme.co.uk/path")).toBe("acme.co.uk");
    expect(emailDomain("jane@mail.acme.com")).toBe("acme.com");
    expect(emailDomain("no-reply@hire.lever.co")).toBe("lever.co");
    expect(emailDomain("not an email")).toBeNull();
  });

  it("detects the three lookalike kinds", () => {
    expect(lookalike("stripe-careers.com", "stripe.com")).toBe("extra_words");
    expect(lookalike("stripe.co", "stripe.com")).toBe("different_ending");
    expect(lookalike("strlpe.com", "stripe.com")).toBe("close_spelling");
  });

  it("leaves unrelated domains and exact matches alone", () => {
    expect(lookalike("stripe.com", "stripe.com")).toBeNull();
    expect(lookalike("apextalentpartners.com", "riversidehealth.org")).toBeNull();
    expect(lookalike("ibm.co", "ibx.com")).toBeNull();
  });

  it("edit distance", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("acme", "acme")).toBe(0);
  });
});
