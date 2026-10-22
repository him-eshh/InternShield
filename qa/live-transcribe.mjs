// LIVE: uploads made-up screenshots through the real UI and real /api/transcribe. Each file = 1 live call.
import { open, mockApi, BASE } from "./lib.mjs";
import { makeShots } from "./make-shots.mjs";

const which = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const files = await makeShots();
const { browser, page } = await open({ width: 1440 });
await mockApi(page, { transcribe: "live" });
await page.goto(BASE);
await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
await page.waitForTimeout(1000);
for (const k of which) {
  await page.locator("#screenshot-file").setInputFiles(files[k]);
  await page.waitForFunction(() => !document.body.innerText.includes("Reading your screenshot"), null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const v = await page.locator("#message").inputValue();
  const status = await page.locator("[role=status]").allInnerTexts();
  const lines = v.split("\n").map((l) => l.trim()).filter(Boolean);
  const dupes = lines.filter((l, i) => lines.indexOf(l) !== i);
  console.log(`== ${k}: ${v.length} chars, ${lines.length} lines, ${dupes.length} duplicate lines\nstatus: ${status.join(" | ")}\n${v}\n`);
}
await browser.close();
