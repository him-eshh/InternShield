// C6: annotated message (desktop + mobile, light/dark, reduced motion), mark -> card focus.
import { readFileSync } from "node:fs";
import "./v2-check-env.mjs";
const { open, mockApi, shot, overflowX, variants, tag, done, BASE } = await import("../lib.mjs");

const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));
const runs = [...variants, { width: 390, theme: "light", reducedMotion: "reduce" }];

for (const v of runs) {
  const { browser, page, log } = await open(v);
  await mockApi(page, { extract: () => done(EX.scam.savedSteps.extract.data) });
  await page.goto(BASE);
  await page.locator("textarea").first().fill(EX.scam.text);
  await page.getByRole("button", { name: "Check it" }).click();
  const sec = page.locator("section[aria-labelledby='annotated-title']");
  await sec.waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  await sec.scrollIntoViewIfNeeded();
  const name = `20-annotated-${tag(v)}${v.reducedMotion ? "-reduced" : ""}`;
  await sec.screenshot({ path: `${process.env.QA_SHOTS}/${name}.png` });
  await page.locator(".am-badge").first().click();
  await page.waitForTimeout(900);
  const focused = await page.evaluate(() => document.activeElement?.id ?? "");
  await shot(page, `${name}-jump`, { fullPage: false });
  console.log(`${name} marks=${await page.locator(".am-badge").count()} focus=${focused} overflow=${await overflowX(page)} console=${log.length ? log.join(" | ").slice(0, 200) : "none"}`);
  await browser.close();
}
