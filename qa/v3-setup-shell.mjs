// v3 setup step 3: every route at 1440/390 light/dark with Nav + active tab, plus back/refresh/report-footer flows.
// Run: QA_BASE=http://localhost:3400 QA_SHOTS=... node qa/v3-setup-shell.mjs  -> qa/out.txt
import { activeTabs, BASE, openRoute, overflowX, PROFILE, RESUME, ROUTES, seedCheck, shot, tag, variants } from "./v3-lib.mjs";

const LABEL = { "/": "Home", "/check": "Check", "/tailor": "Tailor", "/practice": "Practice", "/tracker": "Tracker", "/profile": "Profile" };
let bad = 0;
const check = (ok, msg) => {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
};
const name = (r) => (r === "/" ? "home" : r.slice(1));

for (const v of variants) {
  const { browser, page, log } = await openRoute("/", { ...v, profile: PROFILE, resume: RESUME });
  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: "load", timeout: 90000 }); // networkidle flakes under dev-server load
    await page.waitForSelector('[aria-current="page"]', { state: "attached" }); // mobile Home tab is the (hidden) desktop one
    await page.waitForTimeout(800);
    const active = await activeTabs(page);
    check(active.some((t) => t.trim() === LABEL[r]), `${tag(v)} ${r} active=${JSON.stringify(active)}`);
    check((await overflowX(page)) <= 0, `${tag(v)} ${r} no sideways scroll`);
    await shot(page, `setup-${name(r)}-${tag(v)}`, { fullPage: false });
  }
  const errs = log.filter((l) => l.startsWith("pageerror"));
  check(errs.length === 0, `${tag(v)} no page errors ${errs.slice(0, 3).join(" | ")}`);
  await browser.close();
}

// First visit (no profile) lands on Home, never forced into questions.
{
  const { browser, page } = await openRoute("/");
  check(new URL(page.url()).pathname === "/", "first visit stays on Home");
  await page.goto(BASE + "/check", { waitUntil: "load", timeout: 90000 });
  const formUp = await page.getByRole("button", { name: "a real one" }).waitFor({ timeout: 30000 }).then(() => true, () => false);
  check(formUp, "no profile: /check shows the form directly");
  await page.getByRole("button", { name: "a real one" }).click();
  await page.waitForSelector("text=/Tailor my resume for this|Save to tracker/", { timeout: 30000 }).catch(() => {});
  await shot(page, "setup-example-report-1440-light");
  const tailor = page.getByRole("button", { name: "Tailor my resume for this" });
  if (await tailor.count()) {
    await tailor.click();
    await page.waitForURL("**/tailor");
    check(true, "report footer Tailor opens /tailor");
    const t = await page.evaluate(() => localStorage.getItem("is:targets"));
    check(!!t && JSON.parse(t).tailor?.company, `tailor target carried ${t}`);
    await page.goBack({ waitUntil: "load", timeout: 90000 });
    check(new URL(page.url()).pathname === "/check", "back from /tailor returns to /check");
    const again = await page.getByRole("button", { name: "Tailor my resume for this" }).waitFor({ timeout: 30000 }).then(() => true, () => false);
    check(again, "back shows the report again");
  } else check(false, "example report has no Tailor button");
  await browser.close();
}

// Refresh on /check after a finished check shows the report, not the form or questions.
{
  const { browser, page } = await openRoute("/", { profile: PROFILE });
  await seedCheck(page, "medium");
  await page.reload({ waitUntil: "load", timeout: 90000 });
  await page.goto(BASE + "/check", { waitUntil: "load", timeout: 90000 });
  await page.reload({ waitUntil: "load", timeout: 90000 });
  const report = await page.locator("text=/Medium risk|medium risk|Risk/").first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  check(report && !(await page.getByRole("button", { name: "a real one" }).isVisible()), "refresh on /check keeps the report");
  await shot(page, "setup-check-refresh-1440-light", { fullPage: false });
  await browser.close();
}

console.log(bad ? `${bad} FAILED` : "ALL OK");
process.exit(bad ? 1 : 0);
