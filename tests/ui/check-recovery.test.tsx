import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RecoveryCard from "@/components/report/RecoveryCard";
import { RECOVERY_STEPS } from "@/lib/recovery";

describe("RecoveryCard", () => {
  it("shows only on medium and high, collapsed, with every step in FTC order", () => {
    expect(renderToStaticMarkup(<RecoveryCard level="low" />)).toBe("");
    const html = renderToStaticMarkup(<RecoveryCard level="high" />);
    expect(html).toContain("Already sent money or shared info?");
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    const at = RECOVERY_STEPS.map((s) => html.indexOf(s.title.replace(/"/g, "&quot;").replace(/'/g, "&#x27;")));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(RECOVERY_STEPS[0].id).toBe("stop");
    expect(RECOVERY_STEPS.at(-1)?.id).toBe("recovery-scams");
    expect(renderToStaticMarkup(<RecoveryCard level="medium" />)).not.toBe("");
  });
});
