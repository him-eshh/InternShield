// npm run eval: score every labeled message with the same score() the app uses.
// Prints a table, a 3x3 confusion matrix and the false-positive rate for the main set and the
// held-out set (eval/heldout, written blind to the rules; reported, never gating), rewrites the
// README block between the eval markers if present, and exits nonzero on any main-set mismatch
// that isn't a known miss.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { score } from "../lib/scoring/score";
import type { RiskLevel } from "../lib/types";
import { loadMessages, toInput } from "./load";

/** Mismatches we know about and accept for now, by file name. Keep this short and explained. */
const KNOWN_MISSES: Record<string, string> = {};

const START = "<!-- eval:start -->";
const END = "<!-- eval:end -->";
const LEVELS: RiskLevel[] = ["low", "medium", "high"];
const HELDOUT_DIR = join(process.cwd(), "eval", "heldout");

type Row = { name: string; expected: RiskLevel; got: RiskLevel; score: number; top: string; ok: boolean; known: boolean };

function run(dir?: string): Row[] {
  return loadMessages(dir).map((m) => {
    const report = score(toInput(m));
    const top = report.flags
      .filter((f) => f.kind === "red")
      .slice(0, 3)
      .map((f) => f.id + (f.critical ? "*" : ""));
    const ok = report.level === m.expectedLevel;
    return { name: m.name, expected: m.expectedLevel, got: report.level, score: report.score, top: top.join(", ") || "-", ok, known: !ok && m.name in KNOWN_MISSES };
  });
}

/** Rows = expected, columns = got. */
function matrix(rows: Row[]): number[][] {
  return LEVELS.map((e) => LEVELS.map((g) => rows.filter((r) => r.expected === e && r.got === g).length));
}

/** Share of expected-low messages scored medium or high. */
function fpRate(rows: Row[]): string {
  const low = rows.filter((r) => r.expected === "low");
  const fp = low.filter((r) => r.got !== "low").length;
  return low.length ? `${fp}/${low.length} (${Math.round((fp / low.length) * 100)}%)` : "n/a";
}

function matrixMd(rows: Row[]): string[] {
  return [
    "| expected \\ got | low | medium | high |",
    "|---|---|---|---|",
    ...matrix(rows).map((r, i) => `| ${LEVELS[i]} | ${r.join(" | ")} |`),
  ];
}

function report(label: string, rows: Row[]) {
  const agree = rows.filter((r) => r.ok).length;
  console.log(`\n== ${label}: ${agree}/${rows.length} in the expected level. False positives on low: ${fpRate(rows)}`);
  console.log(matrixMd(rows).join("\n"));
  return agree;
}

const rows = run();
console.table(rows.map((r) => ({ message: r.name, expected: r.expected, got: r.got, score: r.score, "top flags": r.top, result: r.ok ? "ok" : r.known ? "known miss" : "MISS" })));
const agree = report("Main set", rows);

const held = existsSync(HELDOUT_DIR) ? run(HELDOUT_DIR) : [];
if (held.length) {
  const misses = held.filter((r) => !r.ok);
  report("Held-out set (not gating)", held);
  if (misses.length) console.log(`Held-out misses: ${misses.map((r) => `${r.name} (${r.expected}->${r.got} ${r.score})`).join(", ")}`);
}
const failures = rows.filter((r) => !r.ok && !r.known);
console.log(`\n${agree}/${rows.length} messages landed in the expected level. (* = critical flag)`);

const md = [
  `${agree}/${rows.length} made-up messages land in their expected level; false positives on low: ${fpRate(rows)}. \`*\` marks a critical flag.`,
  "",
  ...matrixMd(rows),
  ...(held.length
    ? [
        "",
        `Held-out set (${held.length} cases written without seeing the rules, not gating): ${held.filter((r) => r.ok).length}/${held.length}; false positives on low: ${fpRate(held)}.`,
        "",
        ...matrixMd(held),
      ]
    : []),
  "",
  "| Message | Expected | Got | Score | Top flags |",
  "|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.name} | ${r.expected} | ${r.got}${r.ok ? "" : r.known ? " (known miss)" : " (miss)"} | ${r.score} | ${r.top} |`),
].join("\n");

const readme = join(process.cwd(), "README.md");
if (existsSync(readme)) {
  const body = readFileSync(readme, "utf8");
  const s = body.indexOf(START);
  const e = body.indexOf(END);
  if (s !== -1 && e > s) {
    writeFileSync(readme, `${body.slice(0, s + START.length)}\n${md}\n${body.slice(e)}`);
    console.log("README.md eval table updated.");
  }
}

if (failures.length) {
  console.error(`\nUnexpected misses: ${failures.map((f) => f.name).join(", ")}`);
  process.exit(1);
}
