import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openRoute, mockApi, done } from "./v3-lib.mjs";
assert.match(process.env.QA_BASE ?? "", /^http:\/\/localhost:36\d\d$/);
const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));
for (const width of [1440, 390]) for (const theme of ["light", "dark"]) {
  const { browser, page } = await openRoute("/check", { width, theme });
  try {
    await mockApi(page, { extract: async () => { await new Promise((r) => setTimeout(r, 5000)); return done(EX.real.savedSteps.extract.data); } });
    await page.locator("#message").fill(EX.real.text);
    await page.getByRole("button", { name: "Check this message", exact: true }).click();
    await page.getByRole("heading", { name: "Following the evidence", exact: true }).waitFor();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${process.env.QA_SHOTS}/v3-report-checking-${width}-${theme}.png`, fullPage: true });
    assert.equal(await page.locator("li[data-state=running]").count(), 1);
    await page.locator("article").waitFor();
    console.log(`${width}-${theme}: checking capture PASS`);
  } finally { await browser.close(); }
}
