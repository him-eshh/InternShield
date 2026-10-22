// Coding round: correct solution, infinite loop -> timeout/kill, editor usable after. JS and Python.
import { open, mockApi, shot, BASE, done } from "./lib.mjs";

const width = Number(process.argv[2] ?? 1440);
const theme = process.argv[3] ?? "light";
const phase = process.argv[4] ?? "before";
const t = `${width}-${theme}`;
const { browser, page, log } = await open({ width, theme, profile: { field: "tech", level: "junior", skills: [] } });
await mockApi(page, { interview: () => done({ text: "Try tracking the max so far.", feedback: null }) });
page.on("requestfailed", (r) => log.push(`requestfailed ${r.url().slice(0, 90)} ${r.failure()?.errorText}`));
await page.goto(BASE);
await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
await page.waitForTimeout(1000);
await page.locator("header button").first().click();
await page.getByRole("button", { name: "Practice an interview" }).click();
await page.getByRole("radio", { name: "Live coding" }).check({ force: true });
await page.getByRole("button", { name: "Start" }).click();
await page.waitForTimeout(800);
const fn = await page.locator("code.font-mono").first().innerText();
const ed = page.locator(".cm-content");
const idle = () => page.getByRole("button", { name: "Run examples" }).and(page.locator(":enabled")).waitFor({ timeout: 120000 });
const status = async () => (await page.locator("p[role=status]").allInnerTexts()).join(" | ").replace(/\n/g, " ");
async function setCode(src) {
  await ed.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(src);
}
const SRC = {
  JavaScript: {
    loop: `function ${fn}(nums) { while (true) {} }`,
    good: `function ${fn}(nums) { const out = []; let m = -Infinity; for (const n of nums) { m = Math.max(m, n); out.push(m); } return out; }`,
  },
  Python: {
    loop: `def ${fn}(nums):\n    while True:\n        pass`,
    good: `def ${fn}(nums):\n    out = []\n    m = None\n    for n in nums:\n        m = n if m is None else max(m, n)\n        out.append(m)\n    return out`,
  },
};
for (const lang of ["JavaScript", "Python"]) {
  await page.getByRole("button", { name: lang, exact: true }).click();
  for (const kind of ["loop", "good"]) {
    await setCode(SRC[lang][kind]);
    const t0 = Date.now();
    await page.getByRole("button", { name: "Run examples" }).click();
    await page.waitForTimeout(300);
    await idle();
    console.log(`-- ${lang} ${kind}: ${Date.now() - t0}ms; status: ${await status()}; err: ${await page.locator("text=Could not run").allInnerTexts()}; passed rows: ${await page.locator("text=Passed").count()}`);
  }
  await shot(page, `13-coding-${lang}-${t}-${phase}`);
}
await page.getByRole("button", { name: "Submit" }).click();
await page.waitForTimeout(300);
await idle();
console.log("-- submit: " + (await page.locator("text=hidden tests passed").allInnerTexts()));
console.log("-- log: " + log.filter((l) => !l.includes("cache-bypass")).join(" || "));
await browser.close();
