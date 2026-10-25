import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CodingRound from "@/components/tiers/interview/CodingRound";
import type { InterviewSession } from "@/lib/tiers/types";

vi.mock("@/lib/tiers/runner", () => ({ runCode: vi.fn(), stopRunners: vi.fn() }));

const session: InterviewSession = {
  id: "s",
  round: "coding",
  context: { company: null, role: null, description: null, resume: null, field: "tech" },
  turns: [],
  pending: "q",
  used: 0,
  seed: 1,
  problemId: "count-vowels",
  code: { problemId: "count-vowels", language: "python", code: "x", passed: 6, total: 6 },
  board: null,
  hints: [],
  feedback: null,
  status: "active",
  createdAt: 0,
  updatedAt: 0,
};

describe("CodingRound (v2 T3)", () => {
  it("shows the hidden-test result once, in the live status line", () => {
    const html = renderToStaticMarkup(<CodingRound session={session} onUpdate={() => {}} ask={async () => null} busy={false} />);
    expect(html.match(/6 of 6 hidden tests passed/g)).toHaveLength(1);
    expect(html).toMatch(/role="status"[^>]*>6 of 6 hidden tests passed/);
  });
  it("uses the split pane at lg", () => {
    const html = renderToStaticMarkup(<CodingRound session={session} onUpdate={() => {}} ask={async () => null} busy={false} />);
    expect(html).toContain("lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)]");
  });
});
