import { open, mockApi, shot, text, overflowX, BASE } from "../lib.mjs";
import { readFileSync } from "node:fs";

const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));
const width = Number(process.argv[2] ?? 1440);
const theme = process.argv[3] ?? "light";
const phase = process.argv[4] ?? "before";
const t = `${width}-${theme}`;
const { browser, page, log } = await open({ width, theme });
await mockApi(page);
await page.goto(BASE);
await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
await shot(page, `01-check-${t}-${phase}`);
console.log("== CHECK\n" + (await text(page, "body")));

for (const [n, id, label] of [["02", "scam", "a scam"], ["03", "real", "a real one"]]) {
  await page.getByRole("button", { name: label }).click();
  await page.locator("article").waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  await shot(page, `${n}-report-${id}-${t}-${phase}`);
  console.log(`== REPORT ${id} (overflow ${await overflowX(page)})\n` + (await text(page, "article")));
  await page.getByRole("button", { name: "Check another message" }).click();
}

// Quick questions: the real message pasted by hand, no source/stage.
await page.locator("#message").fill(EX.real.text.replace("through our careers site", ""));
for (const b of await page.locator('[aria-pressed="true"]').all()) await b.click();
await page.getByRole("button", { name: "Check it" }).click();
await page.locator("article").waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);
await shot(page, `04-report-questions-${t}-${phase}`);
const qq = page.locator("section[aria-labelledby=qq-title]");
console.log("== QQ present:", await qq.count());
if (await qq.count()) {
  console.log("== QQ before\n" + (await qq.innerText()));
  await qq.getByRole("button").first().click();
  await page.waitForTimeout(800);
  console.log("== QQ after 1\n" + (await qq.innerText()));
  await qq.screenshot({ path: `.git/internshield-relay/fix-shots/05-questions-answered-${t}-${phase}.png` });
  await shot(page, `05-report-questions-answered-${t}-${phase}`);
  console.log("== ARTICLE after\n" + (await text(page, "article")).slice(0, 1500));
}
console.log("== LOG\n" + log.join("\n"));
await browser.close();
