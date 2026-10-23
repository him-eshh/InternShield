// C10: report at each level from eval cases: low, medium, link-scam (high), score-0 (polite rejection).
import { readFileSync } from "node:fs";
import "./v2-check-env.mjs";
const { open, mockApi, shot, overflowX, variants, tag, done, BASE } = await import("./lib.mjs");

const CASES = [
  ["low", "c7-low-lever-scheduling"],
  ["medium", "c7-mid-telegram-interview-corporate"],
  ["linkscam", "c7-shortener-google-form-ssn"],
  ["zero", "c7-low-rejection-polite"],
];

// eval cases keep only the fields a case sets; the client wants the full extract shape
const FULL = {
  isJobMessage: true, company: null, role: null, pay: null, sender: { name: null, email: null, phone: null },
  asks: [], offPlatform: null, pressure: [], interview: { status: "unclear", quote: null },
  dutiesVague: null, noExperienceNeeded: null, employerCountryHint: null, otherConcerns: [],
};

for (const v of variants) {
  for (const [name, file] of CASES) {
    const c = JSON.parse(readFileSync(`eval/messages/${file}.json`, "utf8"));
    const { browser, page, log } = await open(v);
    await mockApi(page, { extract: () => done({ ...FULL, ...c.savedSteps.extract.data }) });
    await page.goto(BASE);
    await page.locator("textarea").first().fill(c.text);
    await page.getByRole("button", { name: "Check it" }).click();
    try {
      await page.locator("article").waitFor({ timeout: 15000 });
    } catch {
      await shot(page, `99-debug-${name}-${tag(v)}`, { fullPage: true });
      console.log(`${name} ${tag(v)} NO REPORT console=${log.join(" | ").slice(0, 300)}`);
      await browser.close();
      continue;
    }
    await page.waitForTimeout(1500);
    await shot(page, `60-level-${name}-${tag(v)}`, { fullPage: true });
    console.log(`${name} ${tag(v)} overflow=${await overflowX(page)} console=${log.length ? log.join(" | ").slice(0, 200) : "none"}`);
    await browser.close();
  }
}
