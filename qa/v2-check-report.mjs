// C3/C8: check form (empty hint), report for the scam and real examples. Full-page shots.
import { readFileSync } from "node:fs";
import "./v2-check-env.mjs";
const { open, mockApi, shot, overflowX, variants, tag, done, BASE } = await import("./lib.mjs");

const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));
const only = process.argv[2]; // optional: "scam" | "real"

for (const v of variants) {
  for (const key of only ? [only] : ["scam", "real"]) {
    const { browser, page, log } = await open(v);
    await mockApi(page, { extract: () => done(EX[key].savedSteps.extract.data) });
    await page.goto(BASE);
    if (key === "scam") {
      await page.getByRole("button", { name: "Check it" }).click();
      await shot(page, `10-form-empty-hint-${tag(v)}`, { fullPage: false });
    }
    await page.locator("textarea").first().fill(EX[key].text);
    await page.getByRole("button", { name: "Check it" }).click();
    try {
      await page.locator("article").waitFor({ timeout: 15000 });
    } catch {
      await shot(page, `99-debug-${key}-${tag(v)}`, { fullPage: true });
      console.log(`${key} ${tag(v)} NO REPORT console=${log.join(" | ").slice(0, 600)}`);
      await browser.close();
      process.exit(1);
    }
    await page.waitForTimeout(1500);
    await shot(page, `11-report-${key}-${tag(v)}`, { fullPage: true });
    console.log(`${key} ${tag(v)} overflow=${await overflowX(page)} console=${log.length ? log.join(" | ").slice(0, 300) : "none"}`);
    await browser.close();
  }
}
