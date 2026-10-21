import { afterEach, describe, expect, it } from "vitest";
import { clearMyData, KEYS } from "@/lib/client/storage";

describe("clearMyData", () => {
  const g = globalThis as { localStorage?: unknown };
  afterEach(() => {
    delete g.localStorage;
  });

  it("wipes profile, resume, tracker and tailored resume but keeps the theme", () => {
    const m = new Map<string, string>(Object.values(KEYS).map((k) => [k, "1"]));
    g.localStorage = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    };
    clearMyData();
    expect([...m.keys()]).toEqual([KEYS.theme]);
  });
});
