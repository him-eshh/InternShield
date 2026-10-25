// C9: intro hero (live mini report) and the logo / OG / icon routes.
import "./v2-check-env.mjs";
const { open, shot, overflowX, variants, tag, BASE } = await import("../lib.mjs");

for (const v of variants) {
  const { browser, page, log } = await open({ ...v, profile: false });
  await page.goto(BASE);
  await page.getByText("Is this offer real?").waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  await shot(page, `50-intro-${tag(v)}`, { fullPage: true });
  console.log(`intro ${tag(v)} overflow=${await overflowX(page)} console=${log.length ? log.join(" | ").slice(0, 300) : "none"}`);
  if (tag(v) === "1440-light") {
    for (const [name, path] of [["og", "/opengraph-image"], ["apple", "/apple-icon"], ["icon", "/icon.svg"]]) {
      await page.goto(BASE + path);
      await shot(page, `51-${name}`, { fullPage: false });
    }
  }
  await browser.close();
}
