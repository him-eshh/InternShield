// Full pass: every explore script at every width/theme; collects overflow, console errors and failures into qa/out-pass.txt.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const phase = process.argv[2] ?? "after";
const scripts = process.argv.slice(3).length ? process.argv.slice(3) : ["explore-report", "explore-tiers", "explore-intro", "explore-interview", "explore-panels", "explore-errors", "explore-coding"];
const variants = [["1440", "light"], ["1440", "dark"], ["390", "light"], ["390", "dark"], ["320", "light"]];
writeFileSync("qa/out-pass.txt", "");
for (const s of scripts) {
  for (const [w, t] of variants) {
    if (["explore-errors", "explore-coding", "explore-interview"].includes(s) && !(w === "1440" && t === "light") && !(w === "390" && t === "dark")) continue;
    let status = "ok";
    try {
      execFileSync("node", [`qa/${s}.mjs`, w, t, phase], { stdio: "ignore", timeout: 600000 });
    } catch (e) {
      status = `FAILED ${String(e.message).split("\n")[0].slice(0, 200)}`;
    }
    const out = readFileSync("qa/out.txt", "utf8");
    const issues = out
      .split("\n")
      .filter((l) => /overflow [1-9]|pageerror|^error:(?!.*Failed to load resource)|warning:(?!.*cache)|still running|NO FOCUS RING/.test(l));
    appendFileSync("qa/out-pass.txt", `## ${s} ${w} ${t}: ${status}\n${issues.join("\n")}\n`);
  }
}
