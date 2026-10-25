// T5: interview setup (round cards, company-style presets), debugging round run, Amazon-style LP question.
import { open, mockApi, shot, overflowX, BASE, done, variants, tag } from "../lib.mjs";

async function setup(page) {
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
  await page.waitForTimeout(800);
  await page.locator("header button").first().click();
  await page.getByRole("button", { name: "Practice an interview" }).click();
  await page.getByRole("heading", { name: "Practice an interview" }).waitFor();
}
const idle = (page, name) => page.getByRole("button", { name }).and(page.locator(":enabled")).waitFor({ timeout: 60000 });

for (const v of variants) {
  const t = tag(v);
  const { browser, page, log } = await open({ ...v, profile: { field: "tech", level: "junior", skills: [] } });
  await mockApi(page, { interview: () => done({ text: "What exactly did you do yourself?", feedback: null }) });

  await setup(page);
  console.log(`== setup ${t} overflow ${await overflowX(page)} cards ${await page.locator('input[name="iv-round"]').count()}`);
  await shot(page, `09-setup-cards-${t}`);
  await page.locator("label", { hasText: "Amazon-style" }).click();
  console.log(`== amazon ${t} cards ${await page.locator('input[name="iv-round"]').count()} source "${await page.getByText("Based on").innerText()}"`);
  await shot(page, `09-setup-amazon-${t}`);
  await page.getByRole("button", { name: "Start" }).click();
  await page.waitForTimeout(500);
  console.log(`== amazon-q ${t} overflow ${await overflowX(page)}`);
  await shot(page, `09-amazon-question-${t}`);
  await page.getByRole("button", { name: /Leave practice|Past practice/ }).first().click();

  // Debugging round in JavaScript: the planted bug fails an example.
  await setup(page);
  await page.locator("label", { hasText: "Find and fix the bug" }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await page.locator(".cm-content").waitFor();
  await page.getByRole("button", { name: "JavaScript", exact: true }).click();
  await page.getByRole("button", { name: "Run examples" }).click();
  await idle(page, "Run examples");
  console.log(`== debug ${t} "${await page.locator("h2").first().innerText()}" overflow ${await overflowX(page)} status "${await page.getByRole("status").last().innerText()}"`);
  await shot(page, `10-debug-run-${t}`);
  if (v.width === 390) {
    await page.setViewportSize({ width: 320, height: 900 });
    console.log(`== debug 320 overflow ${await overflowX(page)}`);
  }
  console.log("LOG " + log.join(" | "));
  await browser.close();
}
