// Final live reshoot: real server-side keys, no API mocks, synthetic inputs only (app examples + made-up sample resume).
// Usage: node qa/final3-shots.mjs <feature|all> [width] [theme]   (server: QA_BASE, default http://localhost:3503)
// Viewport shots only, so the phone tab bar sits where a phone shows it. Output: .git/internshield-relay/final-shots/final3/
process.env.QA_BASE ??= "http://localhost:3503";
process.env.QA_SHOTS = ".git/internshield-relay/final-shots/final3";
const only = process.argv[2] ?? "all";
process.env.QA_OUT = `qa/final3-out-${only}.txt`;
const w = process.argv[3], th = process.argv[4];
const { BASE, open, overflowX, shot, tag } = await import("./v3-lib.mjs");
const say = (...a) => console.log(...a);
const want = (f) => only === "all" || only === f;
const variants = [1440, 390].flatMap((width) => ["light", "dark"].map((theme) => ({ width, theme })));
const vs = variants.filter((v) => (!w || String(v.width) === w) && (!th || v.theme === th));
const ready = async (page) => { await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }).catch(() => {}); await page.waitForTimeout(900); };

/** On phones the tab bar must touch the bottom of the screen, even scrolled to the end. */
async function tabBar(page, v) {
  if (v.width >= 1024) return "";
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const gap = await page.evaluate(() => {
    const nav = [...document.querySelectorAll("nav")].find((n) => getComputedStyle(n).position === "fixed" && n.getBoundingClientRect().bottom > innerHeight - 4);
    return nav ? Math.round(innerHeight - nav.getBoundingClientRect().bottom) : "missing";
  });
  return ` tabbar-gap=${gap}`;
}

async function each(feature, fn, route, opts = {}) {
  for (const v of vs) {
    const { browser, page, log } = await open({ ...v, ...opts });
    const S = (state) => shot(page, `${feature}-${state}-${tag(v)}`, { fullPage: false });
    try {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 120000 });
      await ready(page);
      await fn({ page, v, S });
      say(`${feature} ${tag(v)} ox=${await overflowX(page)}${await tabBar(page, v)} log: ${log.join(" | ").slice(0, 300)}`);
      if (v.width < 1024) await S("bottom");
    } catch (e) { say(`${feature} ${tag(v)} FAILED ${e.message.slice(0, 300)}`); await S("ERROR").catch(() => {}); }
    finally { await browser.close(); }
  }
}

if (want("home")) await each("home", async ({ S }) => { await S("top"); }, "/", { profile: false });
if (want("profile")) await each("profile", async ({ S }) => { await S("top"); }, "/profile", { profile: { field: "tech", level: "student", skills: ["Python", "React"], name: "Alex" } });

if (want("check")) {
  await each("check", async ({ page, S }) => {
    await page.getByRole("button", { name: "A suspicious offer" }).click();
    await page.getByRole("button", { name: "Check this message", exact: true }).click();
    await page.locator("article").first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(2500);
    await S("report");
    say("check:", (await page.locator("main").innerText()).match(/\b\d{1,3}\b[^\n]*(?:scam|warning|sign)[^\n]*/i)?.[0] ?? "");
    const qq = page.locator("#qq-title").locator("..");
    if (await qq.count()) {
      await qq.scrollIntoViewIfNeeded();
      await qq.getByRole("button").first().click();
      const upd = qq.getByRole("button", { name: /Update/ });
      if (await upd.count()) await upd.first().click();
      await page.waitForTimeout(1800);
      await S("qq-added");
      say("QQ:", (await page.locator("main").innerText()).match(/Score \d+ → \d+[^\n]*/)?.[0] ?? "");
    }
  }, "/check", { profile: false });
}

if (want("tailor")) {
  await each("tailor", async ({ page, S }) => {
    await page.getByRole("button", { name: /made-up resume/ }).click();
    await S("input");
    await page.getByRole("button", { name: "Tailor my resume" }).click();
    await page.locator("[data-edit-id]").first().waitFor({ timeout: 120000 });
    await page.waitForTimeout(1500);
    await S("preview");
    const cards = page.locator("[data-edit-id]");
    say("edits:", await cards.count());
    await cards.nth(0).getByRole("button", { name: /^Accept/ }).click();
    await page.waitForTimeout(800);
    await S("accepted");
  }, "/tailor", { profile: true });
}

if (want("practice")) {
  await each("practice", async ({ page, S }) => {
    await page.getByLabel(/Company/).fill("Amazon");
    await page.getByRole("button", { name: "Research company" }).click();
    await page.waitForFunction(() => !document.body.innerText.includes("Researching"), null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.locator("section[aria-labelledby=setup-target]").scrollIntoViewIfNeeded();
    await S("research");
    await page.getByRole("button", { name: "Start session", exact: true }).click();
    await page.getByRole("heading", { name: /^Question 1 of/ }).waitFor({ timeout: 90000 });
    await page.waitForTimeout(1200);
    await S("question");
  }, "/practice", { profile: true });
}

if (want("tracker")) await each("tracker", async ({ S }) => { await S("top"); }, "/tracker", { profile: true, storage: { "is:tracker": JSON.stringify([
  { id: "c1", company: "Northwind Apps", role: "Software Engineering Intern", column: "applied", risk: null, description: null, createdAt: Date.now() - 86400000, notes: "Referral from career fair.", link: null },
  { id: "c2", company: "Brightfield Labs", role: "Data Intern", column: "interviewing", risk: "low", description: null, createdAt: Date.now() - 2 * 86400000, notes: "", link: null },
]) } });
