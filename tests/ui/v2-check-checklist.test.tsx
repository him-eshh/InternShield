import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Checklist, { initialLines, lineNote } from "@/components/Checklist";

describe("Checklist (C8)", () => {
  it("shows a failed step's short reason and a skipped step", () => {
    const lines = initialLines();
    lines.extract = { state: "done" };
    lines.company = { state: "failed", reason: "timeout" };
    lines.sender = { state: "failed", code: "RATE_LIMITED" };
    lines.posting = { state: "skipped" };
    const html = renderToStaticMarkup(<Checklist lines={lines} />);
    expect(html).toContain("took too long");
    expect(html).toContain("busy, try again soon");
    expect(html).toContain("skipped");
    expect(html).toContain(", failed");
  });

  it("has no progress bar or percentages", () => {
    const lines = initialLines();
    lines.extract = { state: "running" };
    const html = renderToStaticMarkup(<Checklist lines={lines} />);
    expect(html).not.toContain("progressbar");
    expect(html).not.toMatch(/\d+\s?%/);
  });

  it("delays the spinner and keeps the slow note out of the first render", () => {
    const lines = initialLines();
    lines.extract = { state: "running" };
    const html = renderToStaticMarkup(<Checklist lines={lines} />);
    expect(html).toContain("animation-delay:200ms");
    expect(html).not.toContain("Still checking");
  });

  it("returns no note for pending, running or done", () => {
    expect(lineNote({ state: "pending" })).toBeNull();
    expect(lineNote({ state: "running" })).toBeNull();
    expect(lineNote({ state: "done" })).toBeNull();
  });
});
