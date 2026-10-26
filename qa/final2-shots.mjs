// Final UI round 2 screenshots (synthetic data only). Usage: node qa/final2-shots.mjs <feature|all> [width] [theme]
// Output: .git/internshield-relay/final-shots/final2/<feature>-<state>-<width>-<theme>.png, log in qa/final2-out.txt
import { readFileSync } from "node:fs";
const only = process.argv[2] ?? "all";
const w = process.argv[3], th = process.argv[4];
process.env.QA_BASE = "http://localhost:3502";
process.env.QA_SHOTS = ".git/internshield-relay/final-shots/final2";
process.env.QA_OUT = `qa/final2-out-${only}.txt`;
const { BASE, openRoute, overflowX, RESUME, shot, variants, tag, seedCheck } = await import("./v3-lib.mjs");
const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));
const say = (...a) => console.log(...a);
const want = (f) => only === "all" || only === f;
const vs = variants.filter((v) => (!w || String(v.width) === w) && (!th || v.theme === th));
async function ready(page) { await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }).catch(() => {}); await page.waitForTimeout(900); }
const json = (data) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "done", data }) });

const SAMPLE_EDITS = [
  { lineId: "l6", proposed: "Built a React dashboard used by 40 users" },
  { lineId: "l7", proposed: "Cut API response time 30% with Redis caching" },
  { lineId: "l8", proposed: "Wrote unit tests for the billing service; fixed 12 bugs" },
  { lineId: "l11", proposed: "Built a trail search page with filters and routes" },
];

async function each(feature, fn, route = "/", opts = {}) {
  for (const v of vs) {
    const { browser, page, log, calls } = await openRoute(route, { ...v, ...(typeof opts === "function" ? opts(v) : opts) });
    try {
      await ready(page);
      await fn({ page, v, log, calls, S: (state, o) => shot(page, `${feature}-${state}-${tag(v)}`, o) });
      say(`${feature} ${tag(v)} ox=${await overflowX(page)} h=${await page.evaluate(() => document.documentElement.scrollHeight)} log: ${log.join(" | ").slice(0, 400)}`);
    } catch (e) { say(`${feature} ${tag(v)} FAILED ${e.message.slice(0, 400)}`); await shot(page, `${feature}-ERROR-${tag(v)}`, { fullPage: false }).catch(() => {}); }
    finally { await browser.close(); }
  }
}

if (want("home")) {
  await each("home", async ({ S }) => { await S("new"); }, "/", { profile: false });
  await each("home", async ({ page, S }) => {
    await seedCheck(page, "scam");
    await page.goto(BASE + "/", { waitUntil: "load" }); await ready(page);
    await S("returning");
  }, "/", { profile: true });
}

if (want("profile")) {
  await each("profile", async ({ S }) => { await S("empty"); }, "/profile", { profile: false });
  await each("profile", async ({ S }) => { await S("set"); }, "/profile", { profile: { field: "tech", level: "student", skills: ["Python", "React"], name: "Alex" } });
}

if (want("check")) {
  await each("check", async ({ page, S }) => {
    await S("form");
    await page.getByRole("button", { name: "A suspicious offer" }).click();
    await page.waitForTimeout(300);
    await S("form-example", { fullPage: false });
    await page.getByRole("button", { name: "Check this message", exact: true }).click();
    await page.waitForTimeout(350);
    await S("checking", { fullPage: false });
    await page.locator("article").first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(1800);
    await S("report-high");
    const qq = page.locator("#qq-title").locator("..");
    if (await qq.count()) {
      await qq.scrollIntoViewIfNeeded();
      const btns = qq.getByRole("button");
      await btns.first().click();
      const upd = qq.getByRole("button", { name: /Update/ });
      if (await upd.count()) await upd.first().click();
      await page.waitForTimeout(250);
      await S("qq-added-mid", { fullPage: false });
      await page.waitForTimeout(1600);
      await S("qq-added", { fullPage: false });
      say("QQ:", (await page.locator("main").innerText()).match(/Added[^\n]*/g)?.join(" | "));
    }
  }, "/check", { profile: false });
}

if (want("qq")) {
  await each("check", async ({ page, S }) => {
    await page.getByRole("button", { name: "An ordinary update" }).click();
    await page.getByRole("button", { name: "Check this message", exact: true }).click();
    await page.locator("article").first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(1800);
    const qq = page.locator("#qq-title").locator("..");
    say("qq present:", await qq.count());
    if (!(await qq.count())) { await S("report-ordinary"); return; }
    await qq.scrollIntoViewIfNeeded();
    await S("qq-before", { fullPage: false });
    await qq.locator("fieldset").first().getByRole("button").first().click();
    const upd = qq.getByRole("button", { name: /Update/ });
    if (await upd.count()) await upd.first().click();
    await page.waitForTimeout(300);
    await S("qq-added-mid", { fullPage: false });
    await page.waitForTimeout(1600);
    await S("qq-added", { fullPage: false });
    say("QQ:", (await page.locator("main").innerText()).match(/Added[^\n]*/g)?.join(" | "));
  }, "/check", { profile: false });
}

if (want("tailor")) {
  await each("tailor", async ({ page, S }) => {
    await page.route("**/api/rewrite", async (route) => { await new Promise((r) => setTimeout(r, 2500)); await route.fulfill(json({ edits: SAMPLE_EDITS })); });
    await page.getByRole("button", { name: /made-up resume/ }).click();
    await S("input");
    await page.getByRole("button", { name: "Tailor my resume" }).click();
    await page.waitForTimeout(1200);
    await S("loading", { fullPage: false });
    await page.locator("[data-edit-id]").first().waitFor({ timeout: 40000 });
    await page.waitForTimeout(1500);
    await S("preview");
    const cards = page.locator("[data-edit-id]");
    say("edits:", await cards.count());
    await cards.nth(0).getByRole("button", { name: /^Accept/ }).click();
    await page.waitForTimeout(500);
    if ((await cards.count()) > 1) {
      await cards.nth(1).getByRole("button", { name: /^Edit/ }).click();
      await cards.nth(1).locator("textarea").fill("Cut API response time 30% via Redis caching");
      await cards.nth(1).locator("textarea").blur();
      await page.waitForTimeout(1500);
    }
    await S("live-edit");
  }, "/tailor", { profile: true });
}

if (want("practice")) {
  await each("practice", async ({ page, S }) => { await S("setup"); }, "/practice", { profile: true });
  await each("practice", async ({ page, S }) => {
    await page.getByLabel("Difficulty", { exact: true }).selectOption("hard");
    await page.getByRole("button", { name: "Start session", exact: true }).click();
    await page.locator(".cm-content").first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(800);
    await S("question-hard", { fullPage: false });
  }, "/practice", { profile: true });
}

if (want("tracker")) {
  const card = (i, company, role, status) => ({ id: `c${i}`, company, role, column: status, risk: i === 3 ? "medium" : i === 2 ? "low" : null, description: null, createdAt: Date.now() - i * 86400000, notes: i === 1 ? "Referral from career fair." : "", link: null });
  await each("tracker", async ({ S }) => { await S("empty"); }, "/tracker", { profile: true });
  await each("tracker", async ({ S }) => { await S("cards"); }, "/tracker", { profile: true, tracker: [card(1, "Northwind Apps", "Software Engineering Intern", "applied"), card(2, "Brightfield Labs", "Data Intern", "interviewing"), card(3, "Harbor Systems", "Backend Intern", "saved"), card(4, "Quillworks", "Product Intern", "interviewed")] });
}
