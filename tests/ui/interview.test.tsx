import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { checkTurnMock } = vi.hoisted(() => ({ checkTurnMock: vi.fn() }));
vi.mock("@/lib/tiers/scripted", () => ({ checkTurn: checkTurnMock, describeCheck: () => "" }));
import Feedback from "@/components/tiers/interview/Feedback";
import Interview from "@/components/tiers/interview/Interview";
import Tracker from "@/components/tiers/Tracker";
import type { InterviewRound, InterviewSession, TrackerCard } from "@/lib/tiers/types";
import type { Profile } from "@/lib/types";

const noop = () => {};
const business: Profile = { field: "business", level: "junior", skills: [] };
const tech: Profile = { field: "tech", level: "junior", skills: [] };

describe("Interview setup", () => {
  it("lists Recruiter screen and Behavioral for a business profile, not Live coding", () => {
    const html = renderToStaticMarkup(
      <Interview profile={business} resume={null} target={null} onBack={noop} roundsEnabled={{ coding: true }} />,
    );
    expect(html).toContain("Practice an interview");
    expect(html).toContain("Recruiter screen");
    expect(html).toContain("Behavioral");
    expect(html).not.toContain("Live coding");
  });

  it("lists Live coding only for tech with the round enabled", () => {
    const on = renderToStaticMarkup(
      <Interview profile={tech} resume={null} target={null} onBack={noop} roundsEnabled={{ coding: true }} />,
    );
    expect(on).toContain("Live coding");
    expect(on).not.toContain("System design");
    const off = renderToStaticMarkup(<Interview profile={tech} resume={null} target={null} onBack={noop} />);
    expect(off).not.toContain("Live coding");
  });
});

const biz: Profile = { field: "business", level: "junior", skills: [] };
const fin: Profile = { field: "finance", level: "junior", skills: [] };
const des: Profile = { field: "design", level: "junior", skills: [] };
const setup = (profile: Profile, roundsEnabled?: Partial<Record<InterviewRound, boolean>>) =>
  renderToStaticMarkup(<Interview profile={profile} resume={null} target={null} onBack={noop} roundsEnabled={roundsEnabled} />);

describe("Interview setup: Tier 4 rounds", () => {
  it("business lists Case interview only", () => {
    const html = setup(biz, { case: true });
    expect(html).toContain("Case interview");
    expect(html).not.toContain("Technical questions");
    expect(html).not.toContain("Portfolio walkthrough");
  });
  it("finance lists Technical questions", () => {
    expect(setup(fin, { finance: true })).toContain("Technical questions");
  });
  it("design lists both design rounds", () => {
    const html = setup(des, { portfolio: true, challenge: true });
    expect(html).toContain("Portfolio walkthrough");
    expect(html).toContain("Design challenge");
  });
  it("lists none of them without roundsEnabled", () => {
    for (const p of [biz, fin, des]) {
      const html = setup(p);
      for (const label of ["Case interview", "Technical questions", "Portfolio walkthrough", "Design challenge"]) {
        expect(html).not.toContain(label);
      }
    }
  });
});

describe("Feedback code check", () => {
  const base: InterviewSession = {
    id: "c",
    round: "case",
    context: { company: null, role: null, description: null, resume: null, field: null },
    turns: [{ question: "Q", answer: "About $1,500" }],
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
  };
  const render = () => renderToStaticMarkup(<Feedback session={base} onAgain={noop} onBack={noop} />);
  it("shows a number check", () => {
    checkTurnMock.mockReturnValue({ kind: "number", found: 1400, expected: 1500, correct: false, unit: "$" });
    const html = render();
    expect(html).toContain("Checked by code");
    expect(html).toContain("$1,400");
    expect(html).toContain("Expected: $1,500");
    expect(html).toContain("not quite");
  });
  it("shows a rubric check", () => {
    checkTurnMock.mockReturnValue({ kind: "rubric", covered: ["Segments"], missed: ["Risks"] });
    const html = render();
    expect(html).toContain("✓ covered");
    expect(html).toContain("– missing");
  });
  it("shows nothing when there is no check", () => {
    checkTurnMock.mockReturnValue(null);
    expect(render()).not.toContain("Checked by code");
  });
});

describe("Feedback", () => {
  it("shows the quote and STAR marks", () => {
    const session: InterviewSession = {
      id: "a",
      round: "behavioral",
      context: { company: null, role: null, description: null, resume: null, field: null },
      turns: [{ question: "Tell me about a time you led.", answer: "I organized our club trip and booked everything." }],
      pending: null,
      used: 1,
      seed: 1,
      problemId: null,
      code: null,
      hints: [],
      board: null,
      feedback: {
        summary: "A clear start.",
        items: [
          {
            index: 0,
            strength: "Concrete example.",
            improve: "Say the result.",
            quote: "organized our club trip",
            star: { situation: true, task: false, action: true, result: false },
          },
        ],
      },
      status: "done",
      createdAt: 1,
      updatedAt: 1,
    };
    const html = renderToStaticMarkup(<Feedback session={session} onAgain={noop} onBack={noop} />);
    expect(html).toContain("organized our club trip");
    expect(html).toContain("✓ covered");
    expect(html).toContain("– missing");
    expect(html).toContain("What worked");
    expect(html).toContain("Try next time");
  });
});

describe("Tracker practice button", () => {
  const mk = (id: string, column: TrackerCard["column"]): TrackerCard => ({
    id,
    company: `Co${id}`,
    role: "Intern",
    link: null,
    risk: null,
    column,
    notes: "",
    createdAt: 1,
  });
  const cards = [mk("1", "saved"), mk("2", "interviewing")];

  it("shows it once, in Interviewing, when onPractice is given", () => {
    const html = renderToStaticMarkup(<Tracker onBack={noop} onPractice={noop} initialCards={cards} />);
    expect(html.match(/Practice interview/g)?.length).toBe(1);
  });
  it("hides it without onPractice", () => {
    const html = renderToStaticMarkup(<Tracker onBack={noop} initialCards={cards} />);
    expect(html).not.toContain("Practice interview");
  });
});
