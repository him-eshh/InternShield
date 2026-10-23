// Bug B: Save-to-tracker form on its own left-aligned row below the footer buttons; focus in and back.
import { readFileSync } from "node:fs";
import "./v2-check-env.mjs";
const { open, mockApi, shot, overflowX, variants, tag, done, BASE } = await import("./lib.mjs");

const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));
const noCompany = () => done({ ...EX.real.savedSteps.extract.data, company: null });

for (const v of variants) {
  const { browser, page, log } = await open(v);
  await mockApi(page, { extract: noCompany });
  await page.goto(BASE);
  // A made-up message that names no company, so Save opens the form.
  await page.locator("textarea").first().fill("Hi! Thanks for applying to the summer software internship. Are you free for a 30 minute call on Tuesday to talk about the role?");
  await page.getByRole("button", { name: "Check it" }).click();
  await page.locator("article").waitFor({ timeout: 15000 });
  const trigger = page.getByRole("button", { name: "Save to tracker" });
  await trigger.click();
  const form = page.locator("#st-form");
  const opened = await form.isVisible().catch(() => false);
  const focusIn = await page.evaluate(() => document.activeElement?.id);
  let below = null;
  if (opened) {
    const f = await form.boundingBox();
    const t = await trigger.boundingBox();
    below = f.y > t.y + t.height;
    await form.scrollIntoViewIfNeeded();
    await shot(page, `01-tracker-form-${tag(v)}`, { fullPage: false });
    await page.keyboard.press("Escape");
  }
  const focusBack = await page.evaluate(() => document.activeElement?.textContent);
  console.log(`${tag(v)} opened=${opened} focusIn=${focusIn} below=${below} focusBack=${focusBack} overflow=${await overflowX(page)} console=${log.length ? log.join(" | ") : "none"}`);
  await browser.close();
}
