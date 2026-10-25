// Error states: ?fail=<step>, rate limit, daily cap, network failure, not-a-job, empty input, no company.
import { open, mockApi, shot, overflowX, BASE, fail, done } from "../lib.mjs";
import { readFileSync } from "node:fs";

const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));
const width = Number(process.argv[2] ?? 1440);
const theme = process.argv[3] ?? "light";
const phase = process.argv[4] ?? "before";
const t = `${width}-${theme}`;
const NOCO = "Hi, I saw your profile and have a part-time remote assistant job, $40/hour, flexible hours. Text me back at 555-0199 if interested. - Kim";

async function run(name, { query = "", over = {}, msg = EX.real.text, n }) {
  const { browser, page, log } = await open({ width, theme });
  await mockApi(page, over);
  await page.goto(BASE + query);
  await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
  await page.waitForTimeout(900);
  await page.locator("#message").fill(msg);
  await page.getByRole("button", { name: "Check it" }).click();
  await page.waitForFunction(() => !!document.querySelector("article") || /doesn't look like/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, `${n}-${name}-${t}-${phase}`);
  const body = await page.locator("main").innerText();
  console.log(`\n######## ${name} (overflow ${await overflowX(page)})\n` + body.slice(0, 900));
  if (name === "no-company") {
    await page.getByRole("button", { name: "Save to tracker" }).click().catch(() => console.log("no save button"));
    await page.waitForTimeout(400);
    console.log("-- after save: " + (await page.locator("footer").innerText()).replace(/\n+/g, " | "));
  }
  console.log("-- log: " + log.filter((l) => !l.includes("cache-bypass") && !l.includes("Failed to load resource")).join(" || "));
  await browser.close();
}

let n = 20;
for (const step of ["extract", "company", "sender", "posting", "explain"]) await run(`fail-${step}`, { query: `?fail=${step}`, n: n++ });
await run("rate-limit", { over: { extract: () => fail("limit", 429, { retryAfter: 12 }) }, n: n++ });
await run("daily-cap", { over: { extract: () => fail("limit", 429, { retryAfter: 40000 }), company: () => fail("limit", 429, { retryAfter: 40000 }), sender: () => fail("limit", 429, { retryAfter: 40000 }) }, n: n++ });
await run("network-down", { over: Object.fromEntries(["extract", "company", "sender", "posting", "explain"].map((k) => [k, () => ({ status: 500, body: "x" })])), n: n++ });
await run("not-a-job", { over: { extract: () => done({ ...EX.real.savedSteps.extract.data, isJobMessage: false }) }, msg: "Hey are we still on for lunch tomorrow?", n: n++ });
await run("no-company", {
  over: {
    extract: () => done({ ...EX.scam.savedSteps.extract.data, company: null, role: null, sender: { name: "Kim", email: null, phone: "555-0199" } }),
  },
  msg: NOCO,
  n: n++,
});
