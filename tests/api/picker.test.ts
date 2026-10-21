import { describe, expect, it } from "vitest";
import { nameSimilarity, pickPosting } from "@/lib/server/tavily";

describe("official site and posting pickers (live regressions)", () => {
  it("doesn't match a company to an unrelated site that shares one word", () => {
    expect(nameSimilarity("Brightline Data Solutions", "gobrightline.com")).toBe(0);
    expect(nameSimilarity("Stripe", "stripe.com")).toBe(1);
  });
  it("ignores pages on the official site that aren't this role", () => {
    const hits = [{ url: "https://www.acme.com/people-and-culture", title: "Great People Make Great Culture", content: "" }];
    expect(pickPosting("Acme", "Data Entry Assistant", "acme.com", hits as never).found).toBe(false);
  });
});
