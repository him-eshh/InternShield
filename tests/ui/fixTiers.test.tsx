import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import SaveToTracker, { addToTracker } from "@/components/tiers/SaveToTracker";
import Tracker from "@/components/tiers/Tracker";
import { runCode, stopRunners } from "@/lib/tiers/runner";
import type { TrackerCard } from "@/lib/tiers/types";
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
    description: null,
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
