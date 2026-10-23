// Checks eval/heldout/*.json: valid JSON and every extract quote is a verbatim substring of text.
import { readdirSync, readFileSync } from "node:fs";

const dir = "eval/heldout";
let bad = 0;
const walk = (v, out) => {
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) k === "quote" && typeof x === "string" ? out.push(x) : walk(x, out);
  return out;
};
for (const f of readdirSync(dir)) {
  let j;
  try {
    j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  } catch {
    console.log("BAD JSON", f);
    bad++;
    continue;
  }
  for (const q of walk(j.savedSteps?.extract?.data, [])) if (!j.text.includes(q)) (bad++, console.log("QUOTE NOT IN TEXT", f, q.slice(0, 60)));
}
console.log(bad ? `${bad} problems` : "heldout ok");
