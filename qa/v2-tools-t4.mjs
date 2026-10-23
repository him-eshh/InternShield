// T4: TypeScript run in the coding round (incl. endless loop -> timeout -> still usable), SQL round run + submit.
import { readFileSync } from "node:fs";
import { open, mockApi, shot, overflowX, BASE, done, variants, tag } from "./lib.mjs";

// Reference queries by title, read from the source so the SQL submit matches whichever problem the seed picks.
const REFS = Object.fromEntries(
  [...readFileSync("lib/tiers/sql.ts", "utf8").matchAll(/title: "([^"]+)"[\s\S]*?reference:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
);

async function start(page, label) {
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
  await page.waitForTimeout(800);
  await page.locator("header button").first().click();
  await page.getByRole("button", { name: "Practice an interview" }).click();
  await page.locator("label", { hasText: label }).first().click();
  await page.getByRole("button", { name: "Start" }).click();
  await page.locator(".cm-content").waitFor();
}
async function type(page, text) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(text);
}
const idle = (page, name) => page.getByRole("button", { name }).and(page.locator(":enabled")).waitFor({ timeout: 60000 });
const statusText = (page) => page.getByRole("status").last().innerText();

for (const v of variants) {
  const t = tag(v);
  const { browser, page, log } = await open({ ...v, profile: { field: "tech", level: "junior", skills: [] } });
  await mockApi(page, { interview: () => done({ text: "Try a LEFT JOIN.", feedback: null }) });

  // TypeScript
  await start(page, "Live coding");
  const fn = await page.locator("code.font-mono").first().innerText();
  await page.getByRole("button", { name: "TypeScript", exact: true }).click();
  await type(page, `function ${fn}(nums: number[]): number[] {\n  let m = -Infinity;\n  return nums.map((n: number) => (m = Math.max(m, n)));\n}`);
  await page.getByRole("button", { name: "Run examples" }).click();
  await idle(page, "Run examples");
  console.log(`== ts ${t} overflow ${await overflowX(page)} status "${await statusText(page)}" aria "${await page.locator(".cm-content").getAttribute("aria-label")}"`);
  await shot(page, `07-ts-run-${t}`);
  if (v.width === 1440 && v.theme === "light") {
    await type(page, `function ${fn}(nums: number[]): number[] {\n  while (true) {}\n}`);
    await page.getByRole("button", { name: "Run examples" }).click();
    await idle(page, "Run examples");
    console.log(`== ts-loop status "${await statusText(page)}"`);
    await shot(page, `07-ts-timeout-${t}`);
    await type(page, `function ${fn}(nums: number[]) { return nums; }`);
    await page.getByRole("button", { name: "Run examples" }).click();
    await idle(page, "Run examples");
    console.log(`== ts-after-loop status "${await statusText(page)}"`);
    await type(page, `function ${fn}(nums: number[] { return nums; }`);
    await page.getByRole("button", { name: "Run examples" }).click();
    await idle(page, "Run examples");
    console.log(`== ts-syntax "${(await page.getByText("Could not run.").locator("..").innerText()).slice(0, 120)}"`);
  }

  // SQL
  await page.getByRole("button", { name: "Leave practice" }).click();
  await start(page, "SQL");
  const title = await page.locator("h2").first().innerText();
  await type(page, "SELECT name FROM students;");
  await page.getByRole("button", { name: "Run query" }).click();
  await idle(page, "Run query");
  console.log(`== sql-wrong ${t} "${title}" status "${await statusText(page)}" diffs ${await page.locator('[aria-label="Differences"] li').count()}`);
  await shot(page, `08-sql-diff-${t}`);
  await type(page, REFS[title] ?? "SELECT 1;");
  await page.getByRole("button", { name: "Submit" }).click();
  await idle(page, "Submit");
  console.log(`== sql-right ${t} overflow ${await overflowX(page)} status "${await statusText(page)}"`);
  await shot(page, `08-sql-match-${t}`);
  if (v.width === 390) {
    await page.setViewportSize({ width: 320, height: 900 });
    console.log(`== sql 320 overflow ${await overflowX(page)}`);
  }
  console.log("LOG " + log.join(" | "));
  await browser.close();
}
