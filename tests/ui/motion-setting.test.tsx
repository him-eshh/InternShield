// No DOM library is installed: stub the few globals the setting touches and test the pure pieces.
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MotionToggle from "@/components/MotionToggle";
import { applyMotion, configFor, currentMotion, prefersReduce } from "@/components/motion/motionPref";
import { KEYS, loadMotion, saveMotion } from "@/lib/client/storage";

describe("Motion setting", () => {
  const values = new Map<string, string>();
  const dataset: Record<string, string> = {};
  beforeEach(() => {
    values.clear();
    delete dataset.motion;
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    });
    vi.stubGlobal("document", { documentElement: { dataset } });
    vi.stubGlobal("window", { dispatchEvent: () => true, matchMedia: (q: string) => ({ matches: q.includes("reduce") }) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("defaults to system and maps to MotionConfig values", () => {
    expect(loadMotion()).toBe("system");
    expect(currentMotion()).toBe("system");
    expect([configFor("system"), configFor("on"), configFor("reduced")]).toEqual(["user", "never", "always"]);
  });

  it("persists the choice and sets html[data-motion]; On beats an OS reduce", () => {
    expect(prefersReduce()).toBe(true); // the stubbed OS asks for reduced
    saveMotion("on");
    applyMotion(loadMotion());
    expect(values.get(KEYS.motion)).toBe('"on"');
    expect(dataset.motion).toBe("on");
    expect(prefersReduce()).toBe(false);
    saveMotion("reduced");
    applyMotion(loadMotion());
    expect(dataset.motion).toBe("reduced");
    expect(prefersReduce()).toBe(true);
  });

  it("renders the three options", () => {
    const html = renderToStaticMarkup(<MotionToggle />);
    for (const label of ["System", "On", "Reduced"]) expect(html).toContain(label);
  });
});
