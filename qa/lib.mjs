// QA harness (not part of the app): headless Chromium against the local dev server, every /api call mocked.
import { chromium } from "playwright";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

// Tee console.log to qa/out.txt (the shell here can't pipe or redirect).
writeFileSync("qa/out.txt", "");
const rawLog = console.log;
console.log = (...a) => {
  appendFileSync("qa/out.txt", a.join(" ") + "\n");
  if (process.argv.includes("--loud")) rawLog(...a);
};

export const BASE = process.env.QA_BASE ?? "http://localhost:3000";
export const SHOTS = ".git/internshield-relay/fix-shots";
mkdirSync(SHOTS, { recursive: true });
const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));

const done = (data) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "done", data }) });
const fail = (reason, status = 503, extra = {}) => ({ status, contentType: "application/json", body: JSON.stringify({ status: "failed", reason, ...extra }) });

function pick(text = "") {
  return /Brightline/.test(text) ? EX.scam : EX.real;
}

/** Default mocks: extract/company/sender/posting answer from the saved example matching the message. */
export async function mockApi(page, over = {}) {
  const calls = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const name = url.pathname.split("/").pop();
    let body = {};
    try { body = JSON.parse(route.request().postData() ?? "{}"); } catch { /* none */ }
    calls.push({ name, body });
    if (over[name] === "live") return route.continue();
    if (over[name]) return route.fulfill(await over[name](body, url));
    if (url.searchParams.get("fail") === "1") return route.fulfill(fail("timeout", 504));
    const ex = pick(body.message ?? body.company ?? body.email ?? "");
    if (name === "extract") return route.fulfill(done(ex.savedSteps.extract.data));
    if (name === "company") {
      const e = /Brightline/.test(body.company) ? EX.scam : EX.real;
      return route.fulfill(e.savedSteps.company.status === "done" ? done(e.savedSteps.company.data) : fail("error"));
    }
    if (name === "sender") {
      const e = /brightline/i.test(body.email) ? EX.scam : EX.real;
      return route.fulfill(e.savedSteps.sender.status === "done" ? done(e.savedSteps.sender.data) : fail("error"));
    }
    if (name === "posting") return route.fulfill(EX.real.savedSteps.posting.status === "done" ? done(EX.real.savedSteps.posting.data) : fail("error"));
    return route.fulfill(fail("error"));
  });
  return calls;
}

export async function open({ width = 1440, theme = "light", profile = true, resume = null, storage = {} } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, permissions: ["clipboard-read", "clipboard-write"] });
  const init = { ...storage };
  if (profile) init["is:profile"] = JSON.stringify(profile === true ? { field: "tech", level: "student", skills: ["Python", "React"] } : profile);
  if (resume) init["is:resume"] = JSON.stringify(resume);
  await ctx.addInitScript((kv) => {
    if (sessionStorage.getItem("qa-init")) return;
    sessionStorage.setItem("qa-init", "1");
    for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v);
  }, init);
  const page = await ctx.newPage();
  const log = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) log.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  page.on("pageerror", (e) => log.push(`pageerror: ${e.message.slice(0, 300)}`));
  return { browser, ctx, page, log };
}

export async function shot(page, name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

/** Sideways overflow in px (0 = fine). */
export const overflowX = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

export const text = (page, sel = "main") => page.locator(sel).innerText();

export const variants = [
  { width: 1440, theme: "light" },
  { width: 1440, theme: "dark" },
  { width: 390, theme: "light" },
  { width: 390, theme: "dark" },
];
export const tag = (v) => `${v.width}-${v.theme}`;
export { done, fail };
