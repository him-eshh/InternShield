// C4: editable company chip (re-runs company + posting only) and the recovery card opened.
import { readFileSync } from "node:fs";
import "./v2-check-env.mjs";
const { open, mockApi, shot, overflowX, variants, tag, done, BASE } = await import("./lib.mjs");

const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));

for (const v of variants) {
  const { browser, page, log } = await open(v);
  const hits = [];
  page.on("request", (r) => r.url().includes("/api/") && hits.push(new URL(r.url()).pathname));
  await mockApi(page, { extract: () => done(EX.scam.savedSteps.extract.data) });
  await page.goto(BASE);
  await page.locator("textarea").first().fill(EX.scam.text);
  await page.getByRole("button", { name: "Check it" }).click();
  await page.locator("article").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: /^(Edit|Add) company name$/ }).click();
  await page.getByLabel("Company").fill("Northwind Labs");
  await shot(page, `20-chip-editing-${tag(v)}`, { fullPage: false });
  hits.length = 0;
  await page.getByRole("button", { name: "Recheck" }).click();
  await page.getByText("Rechecked with Northwind Labs").waitFor({ timeout: 10000 });
  const focus = await page.evaluate(() => document.activeElement?.textContent);
  await shot(page, `21-chip-rechecked-${tag(v)}`, { fullPage: false });
  await page.getByText("Already sent money or shared info?").click();
  await page.locator("#recovery").scrollIntoViewIfNeeded();
  await shot(page, `22-recovery-open-${tag(v)}`, { fullPage: false, clip: undefined });
  console.log(`${tag(v)} rerun calls=${[...new Set(hits)].join(",")} focus=${focus} overflow=${await overflowX(page)} console=${log.filter((l) => !l.includes("503")).join(" | ").slice(0, 300) || "none"}`);
  await browser.close();
}
