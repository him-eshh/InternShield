// Intro hero: the mini report is the real engine on the saved scam example, plus the privacy facts.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import Intro from "@/components/Intro";

it("renders a high-risk example report with its top reasons and the three facts", () => {
  const html = renderToStaticMarkup(<Intro onStart={() => {}} />);
  expect(html).toContain("Strong signs of a scam");
  expect(html).toMatch(/check/i);
  expect((html.match(/rounded-full bg-bad/g) ?? []).length).toBe(3);
  expect(html).toContain("No account, nothing stored");
  expect(html).not.toMatch(/\bsafe\b/i);
});
