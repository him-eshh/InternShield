import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Summary } from "@/components/interview/Summary";
import { reportTarget, toPostingContext } from "@/lib/client/reportTarget";
import { clearMyData, KEYS, NO_PREFS, prefillTarget } from "@/lib/client/storage";
import { fixtureOutcome } from "@/fixtures/outcome";
import {
  advance, applyLocalReview, buildSummary, defaultConfig, endEarly, loadActive, loadHistory, newPractice, practiceContinue, saveActive,
  saveToHistory, submitAnswer, trackerCardFor, type PracticeState,
} from "@/lib/tiers/session";
import { addCard } from "@/lib/tiers/tracker";
import type { InterviewContext } from "@/lib/tiers/types";

const context: InterviewContext = { company: "Example Labs", role: "Backend Intern", description: null, resume: null, field: "tech" };
function finished(): PracticeState {
  let s = newPractice(defaultConfig({ rounds: ["behavioral"], limit: { kind: "questions", count: 2 } }), context, { id: "seam", now: 1, seed: 3 }, []);
  s = applyLocalReview(submitAnswer(s, "I led the club and raised four hundred dollars.", 5), 6);
  return endEarly(advance(s, [], 7), 8);
}
function active(): PracticeState {
  return newPractice(defaultConfig({ rounds: ["behavioral"], limit: { kind: "questions", count: 3 } }), context, { id: "live", now: 1, seed: 3 }, []);
}

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("seam 1: Clear my data reaches Practice", () => {
  it("removes the active session and the practice history", () => {
    saveActive(active());
    saveToHistory(finished());
    expect(store.has(KEYS.practiceActive) && store.has(KEYS.practiceHistory)).toBe(true);
    clearMyData();
    expect(loadActive()).toBeNull();
    expect(loadHistory()).toEqual([]);
    expect(store.has(KEYS.practiceActive)).toBe(false);
    expect(store.has(KEYS.practiceHistory)).toBe(false);
  });
});

describe("seam 2: Home Continue resumes Practice", () => {
  it("offers the unfinished session first, with the resume link flag", () => {
    saveActive(active());
    saveToHistory(finished());
    const row = practiceContinue(loadActive(), loadHistory());
    expect(row).toMatchObject({ title: "Practice for Example Labs", resume: true });
    expect(row?.detail).toContain("0 of 3");
  });
  it("falls back to the newest finished session, and to nothing", () => {
    expect(practiceContinue(null, [])).toBeNull();
    saveToHistory(finished());
    const row = practiceContinue(null, loadHistory());
    expect(row).toMatchObject({ title: "Last practice: Example Labs", resume: false });
    expect(row?.detail).toMatch(/finished/);
  });
});

describe("seam 3: Practice summary to the tracker", () => {
  it("builds a card with company, role and the score", () => {
    const card = trackerCardFor(buildSummary(finished()), "Example Labs", "Backend Intern");
    expect(card).toMatchObject({ company: "Example Labs", role: "Backend Intern", link: null, risk: null });
    expect(card.notes).toMatch(/^Practice: (Strong|Solid|Developing|Not yet), 1 of 1 answered\.$/);
    const cards = addCard([], card);
    expect(cards).toHaveLength(1);
    expect(cards[0].notes).toBe(card.notes);
    expect(cards[0].column).toBe("saved");
  });
  it("shows the Add to tracker action on the summary", () => {
    const out = renderToStaticMarkup(<Summary state={finished()} company="Example Labs" role="Backend Intern" onAgain={() => {}} onHome={() => {}} onOpenTracker={() => {}} />);
    expect(out).toContain("Add to tracker");
  });
  it("saves the role with the history entry", () => {
    saveToHistory(finished());
    expect(loadHistory()[0]).toMatchObject({ company: "Example Labs", role: "Backend Intern" });
  });
});

describe("seam 4: profile targets prefill without overriding", () => {
  const prefs = { ...NO_PREFS, companies: ["Example Labs", "Other Co"], roles: ["Data Intern"] };
  it("fills an empty start from the first company and role", () => {
    expect(prefillTarget(null, prefs)).toEqual({ company: "Example Labs", role: "Data Intern", description: null });
    expect(prefillTarget(null, { ...NO_PREFS, roles: ["Data Intern"] })).toEqual({ company: null, role: "Data Intern", description: null });
  });
  it("leaves a handed-over target and empty prefs alone", () => {
    const target = { company: "Report Co", role: "", description: "post" };
    expect(prefillTarget(target, prefs)).toBe(target);
    expect(prefillTarget(null, NO_PREFS)).toBeNull();
  });
});

describe("seam 5: Check report next steps carry company and role", () => {
  it("takes company and role from the finished report", async () => {
    const r = await fixtureOutcome("real");
    const t = reportTarget(r!.outcome, r!.input);
    expect(t.company).toBeTruthy();
    expect(toPostingContext(t)).toEqual({ company: t.company, role: t.role, description: null });
    expect(t.risk).toBe(r!.outcome.report!.level);
  });
  it("falls back to the form company and keeps an unknown role blank", async () => {
    const r = await fixtureOutcome("real");
    const outcome = { ...r!.outcome, facts: null };
    const t = reportTarget(outcome, { ...r!.input, form: { ...r!.input.form, company: "  Form Co " } });
    expect(t.company).toBe("Form Co");
  });
});
