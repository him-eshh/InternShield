// npm run eval:live -- --limit 3
// On-demand live run: real Groq extraction for each labeled message, then the same score().
// Uses your keys and quota, so keep --limit small. Other steps reuse savedSteps (no search credits).
import { existsSync } from "node:fs";
import { score } from "../lib/scoring/score";
import { callGroq } from "../lib/server/groq";
import { EXTRACT_SYSTEM, formLine, prepareMessage, quoteCheck } from "../lib/server/extract";
import { EXTRACT_SCHEMA } from "../lib/server/extractSchema";
import type { Facts } from "../lib/types";
import { loadMessages, toInput } from "./load";

if (existsSync(".env.local")) process.loadEnvFile(".env.local"); // loads keys into env; never printed

const i = process.argv.indexOf("--limit");
const limit = i > -1 ? Number(process.argv[i + 1]) : 3;

const signature = (f: Facts | null) =>
  f ? [...f.asks.map((a) => a.kind), f.offPlatform ? "offPlatform" : "", f.interview.status].filter(Boolean).sort().join(",") : "-";

async function main() {
let misses = 0;
for (const m of loadMessages().slice(0, limit)) {
  const saved = m.savedSteps.extract.status === "done" ? m.savedSteps.extract.data : null;
  const text = prepareMessage(m.text);
  const r = await callGroq("extract", { system: EXTRACT_SYSTEM, user: formLine(m.form?.sender, m.form?.company) + text, schema: EXTRACT_SCHEMA, maxTokens: 1500 });
  const live = r.ok ? quoteCheck(JSON.parse(r.data), text) : null;
  const report = score({ ...toInput(m), facts: live, steps: { ...m.savedSteps, extract: live ? { status: "done", data: live } : { status: "failed", reason: r.ok ? "error" : r.reason } } });
  const ok = report.level === m.expectedLevel;
  if (!ok || signature(live) !== signature(saved)) misses++;
  console.log(`${ok ? "ok  " : "MISS"} ${m.name}: expected ${m.expectedLevel}, got ${report.level} (${report.score}) | saved [${signature(saved)}] live [${signature(live)}]`);
}
console.log(`\n${misses} message(s) differ from saved facts or expected level.`);
}
main();
