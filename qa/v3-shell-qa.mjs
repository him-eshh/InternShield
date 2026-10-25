// Shell QA: all APIs mocked; run only against an explicitly selected shell port.
import assert from "node:assert/strict";
import { BASE, openRoute, overflowX, RESUME, ROUTES, shot, variants, tag } from "./v3-lib.mjs";
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):33\d\d$/.test(BASE), "Set QA_BASE to a shell port (3300-3399)");
const labels = { "/": "Home", "/check": "Check", "/tailor": "Tailor", "/practice": "Practice", "/tracker": "Tracker" };
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; console.log(`ok ${message}`); }
async function ready(page) { await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }); await page.getByRole("heading", { level: 1 }).first().waitFor(); await page.waitForTimeout(600); }
for (const v of variants) {
  const { browser, page, log } = await openRoute("/", v);
  try {
    await ready(page);
    const toolRows = page.locator('section[aria-labelledby="tools-h"] > ol > li');
    check(await toolRows.count() === 3, `${tag(v)} three tool rows`);
    for (const [index, href] of ["/check", "/tailor", "/practice"].entries()) {
      check(await toolRows.nth(index).getByRole("link").getAttribute("href") === href, `${tag(v)} ${href} tool link`);
    }
    await shot(page, `shell-home-new-${tag(v)}`);
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: "load" });
      await ready(page);
      const nav = page.getByRole("navigation", { name: v.width >= 1024 ? "Main" : "Tools", exact: true });
      check(await nav.isVisible(), `${tag(v)} ${route} nav visible`);
      if (route === "/profile") check(await page.getByRole("link", { name: /Profile, .* steps done/ }).isVisible(), `${tag(v)} profile avatar reachable`);
      else check(await nav.locator('[aria-current="page"]').innerText() === labels[route], `${tag(v)} ${route} active`);
      check((await overflowX(page)) <= 0, `${tag(v)} ${route} overflow`);
      const home = page.getByRole("link", { name: "InternShield home", exact: true });
      check(await home.isVisible(), `${tag(v)} ${route} home reachable`);
      if (route !== "/") await shot(page, `shell-${route.slice(1)}-${tag(v)}`, { fullPage: route === "/profile" || route === "/tracker" });
    }
    check(log.filter(x => x.startsWith("pageerror") || /hydrat/i.test(x)).length === 0, `${tag(v)} no runtime errors`);
  } finally { await browser.close(); }
}
// Complete each optional profile step, prove confirmation and persistence.
{
  const { browser, page } = await openRoute("/profile", { width: 390 });
  try {
    await ready(page);
    check(await page.getByText("0 of 4 done", { exact: true }).isVisible(), "profile starts 0/4");
    await page.getByText("Paste text instead", { exact: false }).click();
    await page.getByLabel("Resume text", { exact: true }).fill(RESUME.text);
    await page.getByRole("button", { name: "Save text", exact: true }).click();
    check(await page.getByRole("status").filter({ hasText: "Saved" }).isVisible(), "resume Saved");
    await page.getByRole("button", { name: /Pick target roles/ }).click();
    await page.getByRole("button", { name: "+ Software engineering intern", exact: true }).click();
    check(await page.getByRole("status").filter({ hasText: "Saved" }).isVisible(), "roles Saved");
    await page.getByRole("button", { name: /Name target companies/ }).click();
    await page.getByLabel("Target companies", { exact: true }).fill("Example Labs");
    await page.getByRole("button", { name: "Add target companies", exact: true }).click();
    check(await page.getByRole("status").filter({ hasText: "Saved" }).isVisible(), "companies Saved");
    await page.getByRole("button", { name: /About you/ }).click();
    await page.getByRole("button", { name: "Tech", exact: true }).click();
    await page.getByRole("button", { name: "Junior", exact: true }).click();
    await page.getByLabel("Location", { exact: false }).fill("Boston");
    check(await page.getByText("4 of 4 done", { exact: true }).isVisible(), "profile 4/4");
    await shot(page, "shell-profile-complete-390-light");
    await page.reload(); await ready(page);
    check(await page.getByText("4 of 4 done", { exact: true }).isVisible(), "profile reload persists");
    await page.evaluate(() => {
      localStorage.setItem("is:practice-history", JSON.stringify([{ id: "qa", finishedAt: Date.now(), company: null, summary: { turns: [], rounds: [{ round: "coding", band: "Solid", note: "" }], next: [], answered: 1, skipped: 0 } }]));
    });
    await page.goto(BASE); await ready(page);
    check(await page.getByRole("link", { name: /Last practice/ }).isVisible(), "returning practice continuation");
    await shot(page, "shell-home-returning-390-light");
  } finally { await browser.close(); }
}
// Tracker status changes and undo retain the original card.
{
  const { browser, page } = await openRoute("/tracker", { width: 390 });
  try {
    await ready(page);
    await page.getByLabel("Company", { exact: true }).fill("Example Labs");
    await page.getByLabel("Role (optional)", { exact: true }).fill("Engineering intern");
    await page.getByRole("button", { name: "Add application", exact: true }).click();
    await page.getByRole("button", { name: "Move to Applied" }).click();
    check(await page.locator('[id^="card-"] p').filter({ hasText: /^Applied$/ }).isVisible(), "tracker moved");
    await page.getByLabel("More actions for Example Labs").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    check(await page.locator('[id^="card-"]').getByText("Example Labs", { exact: true }).isVisible(), "tracker undo");
    await shot(page, "shell-tracker-filled-390-light");
  } finally { await browser.close(); }
}
for (const width of [320, 768]) {
  const { browser, page } = await openRoute("/", { width, reducedMotion: "reduce" });
  try {
    for (const route of ["/", "/profile", "/tracker"]) {
      await page.goto(BASE + route); await ready(page);
      check(await overflowX(page) <= 0, `${width} ${route} overflow`);
    }
    await page.goto(BASE); await ready(page);
    check(await page.locator("main li").evaluateAll(els => els.every(el => getComputedStyle(el).opacity === "1")), "reduced motion cards final");
    await shot(page, `shell-home-reduced-${width}-light`);
  } finally { await browser.close(); }
}
console.log(`ALL OK: ${checks} checks`);
