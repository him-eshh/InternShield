// WCAG contrast of every text/background pair in app/theme.css. `node qa/v3-contrast.mjs` prints the table
// (for devpost/v3-setup-log.md); tests/shared/v3-theme.test.ts asserts it.
import { readFileSync } from "node:fs";

const css = readFileSync("app/theme.css", "utf8");

/** Hex custom properties of the first `<selector> {` block. */
function block(selector) {
  const start = css.indexOf(`\n${selector} {`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const out = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\b/gi)) out[m[1]] = m[2];
  return out;
}

function lum(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const light = block(":root");
export const themes = { light, dark: { ...light, ...block(".dark") } };

const canvases = ["bg", "bg-subtle", "surface", "surface-2", "surface-3"];
const tools = ["ink", "coral", "teal", "violet"];
const risks = ["good", "warn", "bad"];

/** [fg, bg, min]: min 4.5 = text, 3 = UI marks (icons, borders, rings). */
export function pairs() {
  const p = [];
  for (const bg of canvases) {
    for (const fg of ["fg", "fg-2", "fg-3"]) p.push([fg, bg, 4.5]);
    p.push(["border-strong", bg, 3]);
    for (const t of tools) p.push([`${t}-strong`, bg, 4.5], [t, bg, 3]);
    for (const r of risks) p.push([r, bg, 4.5]);
  }
  for (const t of tools) p.push([`on-${t}`, t, 4.5], [`${t}-strong`, `${t}-tint`, 4.5], ["fg", `${t}-tint`, 4.5], ["fg-2", `${t}-tint`, 4.5]);
  for (const r of risks) p.push([r, `${r}-tint`, 4.5], ["fg", `${r}-tint`, 4.5]);
  return p;
}

/** { theme, fg, bg, min, ratio } for every pair; missing tokens give ratio NaN. */
export function rows() {
  return Object.entries(themes).flatMap(([theme, v]) =>
    pairs().map(([fg, bg, min]) => ({ theme, fg, bg, min, ratio: v[fg] && v[bg] ? contrast(v[fg], v[bg]) : NaN })),
  );
}

if (process.argv[1]?.endsWith("v3-contrast.mjs")) {
  const all = rows();
  const lines = all.map((r) => `${r.ratio >= r.min ? "ok  " : "FAIL"} ${r.theme.padEnd(5)} ${`--${r.fg}`.padEnd(16)} on --${r.bg.padEnd(12)} ${r.ratio.toFixed(2)} (min ${r.min})`);
  lines.push(`coral vs bad: light ${contrast(light.coral, light.bad).toFixed(2)}, dark ${contrast(themes.dark.coral, themes.dark.bad).toFixed(2)}`);
  const { writeFileSync } = await import("node:fs");
  writeFileSync("qa/contrast-out.txt", lines.join("\n") + "\n");
}
