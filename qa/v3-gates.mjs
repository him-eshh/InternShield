// Runs all v3 gates with short output into qa/gates-out.txt.
// Usage: node qa/v3-gates.mjs [lint,tsc,vitest,build,eval]
import { spawnSync } from "node:child_process";
import { writeFileSync, appendFileSync } from "node:fs";

const out = "qa/gates-out.txt";
const all = {
  lint: "npm run lint",
  tsc: "npx tsc --noEmit",
  vitest: "npx vitest run --reporter=dot",
  build: "npm run build",
  eval: "npm run eval",
};
const pick = process.argv[2] ? process.argv[2].split(",") : Object.keys(all);
writeFileSync(out, "");
for (const name of pick) {
  const r = spawnSync(all[name], { shell: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const text = (r.stdout ?? "") + (r.stderr ?? "");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const tail =
    name === "vitest"
      ? lines.filter((l) => /FAIL|Test Files|Tests |Error/.test(l)).slice(-30)
      : lines.slice(name === "eval" ? -14 : -10);
  appendFileSync(out, `== ${name} exit=${r.status}\n${tail.join("\n")}\n`);
}
appendFileSync(out, "GATES_DONE\n");
