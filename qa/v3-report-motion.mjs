import assert from "node:assert/strict";
import { open, mockApi, BASE } from "./v3-lib.mjs";
assert.match(BASE, /^http:\/\/localhost:36\d\d$/);
for (const reducedMotion of ["no-preference", "reduce"]) {
  const { browser, ctx, page } = await open({ reducedMotion });
  try {
    await ctx.addInitScript(() => {
      window.ringSamples = [];
      new MutationObserver(() => {
        const score = document.querySelector("[data-score]")?.textContent;
        if (score !== undefined && score !== null && window.ringSamples.at(-1) !== Number(score)) window.ringSamples.push(Number(score));
      }).observe(document, { childList: true, subtree: true, characterData: true });
    });
    await mockApi(page);
    await page.goto(`${BASE}/check?fixture=scam`);
    await page.locator("article header").filter({ hasText: "Brightline" }).waitFor();
    if (reducedMotion === "reduce") assert.equal(await page.locator("[data-score]").innerText(), "100");
    await page.waitForFunction(() => document.querySelector("[data-score]")?.textContent === "100");
    const samples = await page.evaluate(() => window.ringSamples);
    if (reducedMotion === "reduce") assert.deepEqual(samples, [100]);
    else assert.ok(samples.some((v) => v > 0 && v < 100), JSON.stringify(samples));
    console.log(`${reducedMotion}: PASS reveal samples ${samples.join(",")}`);
    await page.getByRole("button", { name: "Check another message", exact: true }).click();
    await page.getByRole("button", { name: "a real one", exact: true }).click();
    const qq = page.locator("#qq-title").locator("..");
    await qq.getByRole("button", { name: "Deposit a check", exact: true }).waitFor();
    await page.waitForTimeout(850);
    await page.evaluate(() => { window.ringSamples = []; });
    await qq.getByRole("button", { name: "Deposit a check", exact: true }).click();
    await qq.getByRole("button", { name: "Update the check", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("[data-score]")?.textContent === "85");
    const updates = await page.evaluate(() => window.ringSamples);
    if (reducedMotion === "reduce") { assert.ok(updates.every((v) => v === 0 || v === 85)); assert.equal(updates.at(-1), 85); }
    else assert.ok(updates.some((v) => v > 0 && v < 85), JSON.stringify(updates));
    console.log(`${reducedMotion}: PASS score-change samples ${updates.join(",")}`);
  } finally { await browser.close(); }
}
