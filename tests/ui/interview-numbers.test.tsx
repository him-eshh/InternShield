import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Feedback from "@/components/tiers/interview/Feedback";
import { FINANCE_BANK } from "@/lib/tiers/scripted";
import type { InterviewSession } from "@/lib/tiers/types";

const wacc = FINANCE_BANK.find((q) => q.id === "fin-wacc-math")!;

const session = (answer: string): InterviewSession => ({
  id: "n",
  round: "finance",
  context: { company: null, role: null, description: null, resume: null, field: null },
  turns: [{ question: wacc.prompt, answer }],
  pending: null,
  used: 1,
  seed: 1,
  problemId: null,
  code: null,
  board: null,
  hints: [],
  feedback: { summary: "ok", items: [{ index: 0, strength: "s", improve: "i", quote: null, star: null }] },
  status: "done",
  createdAt: 1,
  updatedAt: 1,
});
const render = (answer: string) => renderToStaticMarkup(<Feedback session={session(answer)} onAgain={() => {}} onBack={() => {}} />);

describe("Feedback: the user's number stays in the user's unit (Bug C)", () => {
  it("'$1.2 million' to the WACC question shows $1,200,000 and the mismatch, never 1,200,000%", () => {
    const html = render("$1.2 million");
    expect(html).toContain("Your final number: $1,200,000 (expected a percent)");
    expect(html).toContain("This question expects a percent, but your answer looks like a dollar amount.");
    expect(html).toContain("We read your final number as $1,200,000.");
    expect(html).toContain("Not right?");
    expect(html).toContain(">Edit<");
    expect(html).not.toContain("1,200,000%");
    expect(html).toContain("not quite");
  });

  it("a fraction is read as a percent, with the note", () => {
    const html = render("0.075");
    expect(html).toContain("Your final number: 7.5%");
    expect(html).toContain("We read 0.075 as 7.5%");
    expect(html).toContain("✓ correct");
  });

  it("a plain percent answer is unchanged", () => {
    const html = render("7.5 percent");
    expect(html).toContain("Your final number: 7.5%");
    expect(html).toContain("Expected: 7.5%");
    expect(html).not.toContain("expected a percent)");
  });
});
