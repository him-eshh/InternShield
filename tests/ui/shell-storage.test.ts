import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMyData, KEYS, loadPrefs, NO_PREFS, savePrefs } from "@/lib/client/storage";

describe("guided profile preferences", () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("round-trips optional preferences without changing the scoring profile", () => {
    values.set(KEYS.profile, '{"field":"tech","level":"junior","skills":[]}');
    const original = values.get(KEYS.profile);
    const prefs = { roles: ["Backend intern"], companies: ["Example Labs"], location: "Boston", remote: true, gradDate: "2027-05" };
    savePrefs(prefs);
    expect(loadPrefs()).toEqual(prefs);
    expect(values.get(KEYS.profile)).toBe(original);
  });

  it("recovers from corrupt JSON and malformed preference fields", () => {
    values.set(KEYS.prefs, "{");
    expect(loadPrefs()).toEqual(NO_PREFS);
    values.set(KEYS.prefs, JSON.stringify({ roles: [1, "Intern"], companies: null, location: {}, remote: "true", gradDate: 4 }));
    expect(loadPrefs()).toEqual({ ...NO_PREFS, roles: ["Intern"] });
  });

  it("clears preferences and tool state while retaining the theme choice", () => {
    for (const key of Object.values(KEYS)) values.set(key, '"saved"');
    clearMyData();
    expect(values.get(KEYS.theme)).toBe('"saved"');
    expect([...values.keys()]).toEqual([KEYS.theme, KEYS.motion]);
    expect(loadPrefs()).toEqual(NO_PREFS);
  });

  it("keeps working when browser storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    });
    expect(loadPrefs()).toEqual(NO_PREFS);
    expect(() => savePrefs(NO_PREFS)).not.toThrow();
    expect(() => clearMyData()).not.toThrow();
  });
});
