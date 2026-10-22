// C4: quick questions before and after answering (real example: tick "Deposit a check" -> high), plus a reduced-motion report.
import { readFileSync } from "node:fs";
import "./v2-check-env.mjs";
const { open, mockApi, shot, overflowX, variants, tag, done, BASE } = await import("./lib.mjs");

const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));

async function report(v) {
  const r = await open(v);
  await mockApi(r.page, { extract: () => done(EX.real.savedSteps.extract.data) });
  await r.page.goto(BASE);
  await r.page.locator("textarea").first().fill(EX.real.text);
  await r.page.getByRole("button", { name: "Check it" }).click();
  await r.page.locator("article").waitFor({ timeout: 15000 });
  await r.page.waitForTimeout(1500);
  return r;
}

for (const v of variants) {
  const { browser, page, log } = await report(v);
  const qq = page.locator("section[aria-labelledby=qq-title]");
  await qq.scrollIntoViewIfNeeded();
  await shot(page, `30-questions-before-${tag(v)}`, { fullPage: false });
  await page.getByRole("button", { name: "Deposit a check" }).click();
  await page.getByRole("button", { name: "Update the check" }).click();
  await page.getByText(/^Thanks\./).waitFor({ timeout: 5000 });
  await qq.scrollIntoViewIfNeeded();
  await shot(page, `31-questions-after-${tag(v)}`, { fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1300);
  const ring = await page.locator("article header").innerText();
  await shot(page, `32-ring-after-answer-${tag(v)}`, { fullPage: false });
  console.log(`${tag(v)} ring="${ring.replace(/\s+/g, " ").slice(0, 120)}" overflow=${await overflowX(page)} console=${log.filter((l) => !l.includes("503")).join(" | ").slice(0, 300) || "none"}`);
  await browser.close();
}

const rm = await report({ width: 1440, theme: "light", reducedMotion: "reduce" });
await shot(rm.page, "33-report-real-reduced-motion-1440-light", { fullPage: true });
console.log(`reduced-motion overflow=${await overflowX(rm.page)}`);
await rm.browser.close();
