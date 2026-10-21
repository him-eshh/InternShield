import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DesignRound from "@/components/tiers/interview/DesignRound";
import { addNode, connect, emptyBoard, toJson } from "@/lib/tiers/board";
import type { InterviewSession } from "@/lib/tiers/types";

const noop = () => {};
const ask = async () => null;

function session(over: Partial<InterviewSession> = {}): InterviewSession {
  return {
    id: "d1",
    round: "design",
    context: { company: null, role: null, description: null, resume: null, field: null },
    turns: [],
    pending: "Design a URL shortener.",
    used: 0,
    seed: 1,
    problemId: null,
    code: null,
    hints: [],
    board: null,
    feedback: null,
    status: "active",
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

const render = (s: InterviewSession) =>
  renderToStaticMarkup(<DesignRound session={s} onUpdate={noop} ask={ask} busy={false} />);

describe("DesignRound", () => {
  it("shows the prompt, tools, answer box and both actions", () => {
    const html = render(session());
    expect(html).toContain("Design a URL shortener.");
    expect(html).toContain("Add box");
    expect(html).toContain("Export PNG");
    expect(html).toContain("Explain your design");
    expect(html).toContain("Ask me a follow-up");
    expect(html).toContain("Finish and get feedback");
  });

  it("restores boxes (focusable, labelled) and the arrows list from session.board", () => {
    let b = addNode(emptyBoard(), "client", "Browser");
    const first = b.id;
    b = addNode(b.board, "server", "API");
    const linked = connect(b.board, first, b.id);
    const html = render(session({ board: toJson(linked) }));
    expect(html).toContain('aria-label="Client: Browser"');
    expect(html).toContain('aria-label="Server: API"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("Browser → API");
  });

  it("shows a timer only for the design challenge", () => {
    const html = render(session({ round: "challenge", createdAt: Date.now() }));
    expect(html).toContain('role="timer"');
    expect(html).toContain("left");
    expect(render(session())).not.toContain('role="timer"');
  });

  it("hides the follow-up button after the last question", () => {
    const turns = [1, 2].map((i) => ({ question: `Q${i}`, answer: `A${i}` }));
    const html = render(session({ turns, pending: "Q3" }));
    expect(html).not.toContain("Ask me a follow-up");
    expect(html).toContain("Finish and get feedback");
  });
});
