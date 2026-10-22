// Intro -> profile steps -> check, then Clear my data, theme toggle, tab order on the check screen.
import { open, mockApi, shot, overflowX, BASE } from "./lib.mjs";

const width = Number(process.argv[2] ?? 1440);
const theme = process.argv[3] ?? "light";
const phase = process.argv[4] ?? "before";
const t = `${width}-${theme}`;
const { browser, page, log } = await open({ width, theme, profile: false });
await mockApi(page);
await page.goto(BASE);
await page.waitForTimeout(1500);
await shot(page, `17-intro-${t}-${phase}`);
console.log(`== intro (overflow ${await overflowX(page)})\n` + (await page.locator("main").innerText()));
await page.getByRole("button").filter({ hasText: /start|get started|begin|check/i }).first().click();
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(600);
  await shot(page, `18-profile-step${i + 1}-${t}-${phase}`);
  const txt = await page.locator("main").innerText();
  console.log(`== profile step ${i + 1} (overflow ${await overflowX(page)})\n` + txt);
  if (/Is this offer real\?/.test(txt)) break;
  const pills = page.locator("main button[aria-pressed=false]");
  if (await pills.count()) await pills.first().click();
  const next = page.getByRole("button", { name: /^(Next|Continue|Done|Finish|Save|Skip.*)$/ });
  if (await next.count()) await next.last().click();
  else break;
}
// Tab order on the check screen
const order = [];
await page.locator("body").click({ position: { x: 1, y: 1 } });
for (let i = 0; i < 14; i++) {
  await page.keyboard.press("Tab");
  order.push(await page.evaluate(() => {
    const a = document.activeElement;
    const cs = a ? getComputedStyle(a) : null;
    return `${a?.tagName}:${(a?.getAttribute("aria-label") || a?.textContent || a?.id || "").trim().slice(0, 30)}${cs && cs.outlineStyle === "none" && cs.boxShadow === "none" ? " [NO FOCUS RING]" : ""}`;
  }));
}
console.log("== tab order\n" + order.join("\n"));
// Clear my data
await page.locator("header button").first().click();
await page.getByRole("button", { name: "Clear my data" }).click();
await page.waitForTimeout(300);
console.log("== clear confirm\n" + (await page.locator("header").innerText()));
await shot(page, `19-clear-confirm-${t}-${phase}`);
console.log("-- log: " + log.filter((l) => !l.includes("cache-bypass")).join(" || "));
await browser.close();
