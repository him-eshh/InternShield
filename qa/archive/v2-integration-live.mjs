// I4 LIVE smoke: the only live API calls in v2. Made-up content only. Usage: node qa/v2-integration-live.mjs checks|shots|tools
// Budget (brief I4): 3 checks, 2 transcriptions, 1 rewrite (3 options), 2 interview turns, 1 spare.
import "./v2-integration-env.mjs";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { open, mockApi, shot, overflowX, BASE } = await import("../lib.mjs");
const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));
const LIVE = { extract: "live", company: "live", sender: "live", posting: "live", explain: "live", transcribe: "live", rewrite: "live", interview: "live" };

const LINK_SCAM = `Hi Jamie, I'm Erin from Stripe campus recruiting. You were shortlisted for our Summer 2027 Software Engineering Intern role.
Please finish onboarding today on our careers portal: https://stripe-careers-onboarding.com/apply?ref=intern
You'll need to enter your SSN and bank details there so payroll can be set up before your interview.
Erin Walsh, Stripe Talent Team (erin.walsh.stripe@gmail.com)`;

/** Logs each /api response: route, status, ms, short body. */
function watch(page) {
  const t0 = new Map();
  page.on("request", (r) => { if (r.url().includes("/api/")) t0.set(r, Date.now()); });
  page.on("response", async (r) => {
    if (!r.url().includes("/api/")) return;
    const ms = Date.now() - (t0.get(r.request()) ?? Date.now());
    let b = "";
    try { b = (await r.text()).slice(0, 220).replace(/\s+/g, " "); } catch { /* none */ }
    console.log(`  ${new URL(r.url()).pathname} ${r.status()} ${ms}ms ${b}`);
  });
}

const mode = process.argv[2];

if (mode === "checks") {
  for (const [name, text] of [["scam-example", EX.scam.text], ["real-example", EX.real.text], ["link-scam", LINK_SCAM]]) {
    const { browser, page, log } = await open();
    await mockApi(page, LIVE);
    watch(page);
    await page.goto(BASE);
    await page.locator("#message").fill(text);
    const t = Date.now();
    console.log(`== check ${name}`);
    await page.getByRole("button", { name: "Check it" }).click();
    await page.locator("article").waitFor({ timeout: 90000 });
    await page.waitForTimeout(4000);
    const ring = await page.locator('main svg[role="img"][aria-label^="Risk "]').first().getAttribute("aria-label");
    console.log(`  report in ${Date.now() - t}ms: ${ring} | ${(await page.locator("main h2").first().innerText()).trim()} overflow=${await overflowX(page)} console=${log.join(" | ") || "none"}`);
    console.log(`  text: ${(await page.locator("article").innerText()).slice(0, 700).replace(/\s+/g, " ")}`);
    await shot(page, `80-live-check-${name}-1440-light`);
    await browser.close();
  }
}

if (mode === "shots") {
  const { makeShots } = await import("../make-shots.mjs");
  const files = await makeShots(mkdtempSync(join(tmpdir(), "is-live-")));
  const { browser, page, log } = await open();
  await mockApi(page, LIVE);
  watch(page);
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
  // ponytail: transcribe is rate limited per IP (2 back-to-back = 429, retryAfter 8 s), so pick files via argv.
  for (const k of process.argv[3]?.split(",") ?? ["multi", "long"]) {
    await page.locator("#message").fill("");
    const t = Date.now();
    await page.locator("#screenshot-file").setInputFiles(files[k]);
    await page.waitForTimeout(500);
    await page.waitForFunction(() => !/Reading (your )?screenshot/.test(document.body.innerText), null, { timeout: 90000 });
    const v = await page.locator("#message").inputValue();
    const lines = v.split("\n").map((l) => l.trim()).filter(Boolean);
    console.log(`== transcribe ${k} ${Date.now() - t}ms: ${v.length} chars, ${lines.length} lines, ${lines.filter((l, i) => lines.indexOf(l) !== i).length} dupes | status ${(await page.locator("[role=status]").allInnerTexts()).join(" / ")}\n${v.slice(0, 400)}`);
    await shot(page, `81-live-transcribe-${k}-1440-light`, { fullPage: false });
  }
  console.log(`console=${log.join(" | ") || "none"}`);
  await browser.close();
}

if (mode === "tools") {
  const { browser, page } = await open();
  await page.goto(BASE);
  const post = (url, body) => page.evaluate(async ([u, b]) => { const t = Date.now(); const r = await fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); return { status: r.status, ms: Date.now() - t, body: await r.text() }; }, [url, body]);
  const posting = { company: "Northwind Analytics", role: "Data Analyst Intern", description: "Clean and analyze sales data with SQL and Python. Build dashboards in Tableau. Present findings to the team." };
  const rw = await post("/api/rewrite", { text: "Wrote Python scripts to clean lab data", instruction: "Tailor this line to the job.", posting, count: 3 });
  console.log(`== rewrite ${rw.status} ${rw.ms}ms ${rw.body.slice(0, 700)}`);
  const context = { company: "Northwind Analytics", role: "Data Analyst Intern", description: posting.description, resume: "Wrote Python scripts to clean lab data.", field: "tech" };
  const base = { round: "behavioral", context, code: null, board: null, problem: null };
  const q1 = await post("/api/interview", { ...base, ask: "question", turns: [], used: 0 });
  console.log(`== interview q1 ${q1.status} ${q1.ms}ms ${q1.body.slice(0, 400)}`);
  let question = "Tell me about a time you worked with messy data.";
  try { question = JSON.parse(q1.body).data?.text ?? JSON.parse(q1.body).data?.question ?? question; } catch { /* keep */ }
  const answer = "In my lab job I got 3 years of sensor CSVs with mixed date formats. I wrote a Python script with pandas to normalize dates and flag gaps, which cut cleanup from 2 days to 1 hour. The lab still uses it.";
  const fb = await post("/api/interview", { ...base, ask: "feedback", turns: [{ question, answer }], used: 1 });
  console.log(`== interview feedback ${fb.status} ${fb.ms}ms ${fb.body.slice(0, 900)}`);
  await browser.close();
}
