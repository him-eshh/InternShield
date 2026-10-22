// Lists elements wider than the viewport on the scam report at a given width.
import { open, mockApi, BASE } from "./lib.mjs";
const width = Number(process.argv[2] ?? 320);
const { browser, page } = await open({ width });
await mockApi(page);
await page.goto(BASE);
await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
await page.waitForTimeout(900);
await page.getByRole("button", { name: process.argv[3] ?? "a scam" }).click();
await page.locator("article").waitFor();
await page.waitForTimeout(1500);
const wide = await page.evaluate((w) =>
  [...document.querySelectorAll("body *")]
    .filter((el) => el.getBoundingClientRect().right > w + 1)
    .slice(0, 12)
    .map((el) => `${el.tagName}.${String(el.className).slice(0, 80)} right=${Math.round(el.getBoundingClientRect().right)} text=${(el.innerText ?? "").slice(0, 60).replace(/\n/g, " ")}`),
  width);
console.log(wide.join("\n"));
console.log("scrollWidth", await page.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollWidth]));
const inner = await page.evaluate(() =>
  [...document.querySelectorAll("body *")]
    .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible" && el.clientWidth > 0)
    .slice(0, 12)
    .map((el) => `${el.tagName}.${String(el.className).slice(0, 80)} sw=${el.scrollWidth} cw=${el.clientWidth} text=${(el.innerText ?? "").slice(0, 60).replace(/\n/g, " ")}`));
console.log(inner.join("\n"));
await browser.close();
