// v3 theme: every text/background pair in app/theme.css meets WCAG AA (text >= 4.5:1, UI marks >= 3:1),
// and components never hard-code hex colors (devpost/v3-brief-setup.md > Quality bar).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrast, rows, themes } from "../../qa/v3-contrast.mjs";

type Row = { theme: string; fg: string; bg: string; min: number; ratio: number };

describe("v3 theme contrast", () => {
  it("every text/background pair passes AA in light and dark", () => {
    const bad = (rows() as Row[]).filter((r) => !(r.ratio >= r.min)).map((r) => `${r.theme} ${r.fg} on ${r.bg}: ${r.ratio.toFixed(2)} < ${r.min}`);
    expect(bad).toEqual([]);
  });

  it("check coral stays visibly distinct from risk red", () => {
    for (const v of Object.values(themes) as Record<string, string>[]) expect(contrast(v.coral, v.bad)).toBeGreaterThan(1.25);
  });
});

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

describe("no hex colors in components", () => {
  it("components/** uses theme tokens only", () => {
    const hits = files("components").flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .flatMap((line, i) => (/#[0-9a-fA-F]{3,8}\b/.test(line) ? [`${f}:${i + 1}: ${line.trim()}`] : [])),
    );
    expect(hits).toEqual([]);
  });
});
