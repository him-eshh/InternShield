// C8: filled form with "Add context" open, checking screen (slow extract), extract failure keeps the pasted text.
import { readFileSync } from "node:fs";
import "./v2-check-env.mjs";
const { open, mockApi, shot, overflowX, variants, tag, done, fail, BASE } = await import("./lib.mjs");

const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const v of variants) {
  const { browser, page, log } = await open(v);
  let mode = "slow";
  await mockApi(page, {
    extract: async () => {
      if (mode === "fail") return fail("limit", 429, { code: "RATE_LIMITED", retryAfter: 30 });
      await wait(9000);
      return done(EX.scam.savedSteps.extract.data);
    },
  });
  await page.goto(BASE);
  await page.locator("textarea").first().fill(EX.scam.text);
  await page.getByText("Add context").first().click();
  await shot(page, `40-form-filled-context-${tag(v)}`, { fullPage: true });

  await page.getByRole("button", { name: "Check it" }).click();
  await page.getByText("Still checking…").waitFor({ timeout: 8000 });
  await shot(page, `41-checking-slow-${tag(v)}`, { fullPage: false });
  await page.locator("article").waitFor({ timeout: 15000 });

  mode = "fail";
  await page.getByRole("button", { name: "Check another message" }).click();
  await page.locator("textarea").first().fill(EX.scam.text);
  await page.getByRole("button", { name: "Check it" }).click();
  await page.waitForTimeout(2500);
  await shot(page, `42-extract-error-${tag(v)}`, { fullPage: true });
  // Extract failure falls back to the backstop report: the pasted text stays visible under "Your message", with a retry card.
  const kept = await page.locator("section[aria-labelledby='annotated-title']").innerText().catch(() => "");
  console.log(`${tag(v)} keptText=${kept.includes("Sarah Mitchell")} retry=${await page.getByText(/Retry/).count()} overflow=${await overflowX(page)} console=${log.filter((l) => !/503|429|cache/i.test(l)).join(" | ").slice(0, 300) || "none"}`);
  await browser.close();
}
