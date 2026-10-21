// npm run eval: score every labeled message with the same score() the app uses.
// Prints a table, rewrites the README block between the eval markers if present,
// and exits nonzero on any mismatch that isn't a known miss.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { score } from "../lib/scoring/score";
import { loadMessages, toInput } from "./load";

/** Mismatches we know about and accept for now, by file name. Keep this short and explained. */
const KNOWN_MISSES: Record<string, string> = {};

const START = "<!-- eval:start -->";
const END = "<!-- eval:end -->";

const rows = loadMessages().map((m) => {
  const report = score(toInput(m));
  const top = report.flags
    .filter((f) => f.kind === "red")
    .slice(0, 3)
    .map((f) => f.id + (f.critical ? "*" : ""));
  const ok = report.level === m.expectedLevel;
  return { name: m.name, expected: m.expectedLevel, got: report.level, score: report.score, top: top.join(", ") || "-", ok, known: !ok && m.name in KNOWN_MISSES };
});

const agree = rows.filter((r) => r.ok).length;
const failures = rows.filter((r) => !r.ok && !r.known);

console.table(rows.map((r) => ({ message: r.name, expected: r.expected, got: r.got, score: r.score, "top flags": r.top, result: r.ok ? "ok" : r.known ? "known miss" : "MISS" })));
console.log(`\n${agree}/${rows.length} messages landed in the expected level. (* = critical flag)`);

const md = [
  `${agree}/${rows.length} made-up messages land in their expected level. \`*\` marks a critical flag.`,
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
