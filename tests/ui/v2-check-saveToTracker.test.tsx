import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SaveToTracker from "@/components/tiers/SaveToTracker";

describe("SaveToTracker (Bug B)", () => {
  it("is a disclosure trigger inside a display:contents wrapper", () => {
    const html = renderToStaticMarkup(<SaveToTracker card={{ company: "", role: "", link: null, risk: "low" }} onOpen={() => {}} />);
    expect(html).toMatch(/^<div class="contents">/);
    expect(html).toContain('aria-expanded="false"');
  });
});
