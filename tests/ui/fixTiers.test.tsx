import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { checkTurnMock } = vi.hoisted(() => ({ checkTurnMock: vi.fn() }));
vi.mock("@/lib/tiers/scripted", () => ({ checkTurn: checkTurnMock, describeCheck: () => "" }));
import Feedback from "@/components/tiers/interview/Feedback";
import SaveToTracker, { addToTracker } from "@/components/tiers/SaveToTracker";
import Tracker from "@/components/tiers/Tracker";
import { runCode, stopRunners } from "@/lib/tiers/runner";
import type { InterviewSession, TrackerCard } from "@/lib/tiers/types";
import { LEVEL_LABELS } from "@/lib/types";

const noop = () => {};

describe("SaveToTracker", () => {
  it("renders a one-click Save button first", () => {
    const html = renderToStaticMarkup(<SaveToTracker card={{ company: "", role: "", link: null, risk: "low" }} onOpen={noop} />);
    expect(html).toContain("Save to tracker");
    expect(html).not.toContain("Unknown company");
  });
  it("never stores a placeholder when the role is blank", () => {
    const out = addToTracker([], "Acme", "", { company: "", role: "", link: null, risk: "low" });
    expect(out).toHaveLength(1);
    expect(out[0].company).toBe("Acme");
    expect(out[0].role).toBe("");
    expect(JSON.stringify(out)).not.toMatch(/Unknown company|Role not listed/);
  });
  it("does not add the same company with a blank role twice", () => {
    const base = { company: "", role: "", link: null, risk: null } as const;
    const once = addToTracker([], "Acme", "", base);
    expect(addToTracker(once, "acme", "", base)).toHaveLength(1);
  });
});

describe("Tracker", () => {
  const card = (over: Partial<TrackerCard>): TrackerCard => ({
    id: "1",
    company: "Acme",
    role: "Intern",
    link: null,
    risk: null,
    column: "saved",
    notes: "",
    createdAt: 1,
    ...over,
  });

  it("renders the add confirmation area after the add form's button, not at the top", () => {
    const html = renderToStaticMarkup(<Tracker onBack={noop} initialCards={[]} />);
    const button = html.indexOf("Add application</button>");
    const formEnd = html.indexOf("</form>");
    const status = html.indexOf('role="status"', button);
    expect(button).toBeGreaterThan(-1);
    expect(status).toBeGreaterThan(button);
    expect(status).toBeLessThan(formEnd);
    expect(html).not.toContain("Added ");
  });

  it("uses the report's level labels for the risk tag", () => {
    const html = renderToStaticMarkup(<Tracker onBack={noop} initialCards={[card({ risk: "low" })]} />);
    expect(html).toContain(LEVEL_LABELS.low);
    expect(html).not.toContain("Low risk");
  });

  it("shows a fallback name and no role line when stored values are empty", () => {
    const html = renderToStaticMarkup(<Tracker onBack={noop} initialCards={[card({ company: "", role: "" })]} />);
    expect(html).toContain("Untitled application");
    expect(html).not.toContain("Unknown company");
  });
});

describe("Feedback wording", () => {
  const session: InterviewSession = {
    id: "c",
    round: "case",
    context: { company: null, role: null, description: null, resume: null, field: null },
    turns: [{ question: "Q", answer: "A" }],
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
  it("says 'not mentioned' instead of 'missing'", () => {
    checkTurnMock.mockReturnValue({ kind: "rubric", covered: ["A"], missed: ["B"] });
    const html = renderToStaticMarkup(<Feedback session={session} onAgain={noop} onBack={noop} />);
    expect(html).toContain("spot this; it may be worded differently"); // v2 tools: rubric copy (standing #1)
    expect(html).not.toContain("missing");
  });
});

describe("runner", () => {
  afterEach(() => {
    stopRunners();
    vi.unstubAllGlobals();
  });
  it("creates the Python worker as a module worker", () => {
    const calls: unknown[][] = [];
    class FakeWorker {
      onmessage: unknown = null;
      onerror: unknown = null;
      constructor(...args: unknown[]) {
        calls.push(args);
      }
      postMessage() {}
      terminate() {}
    }
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    void runCode("python", "def f(x): return x", "f", [[1]]);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("/workers/py-runner.js");
    expect(calls[0][1]).toEqual({ type: "module" });
  });
});
