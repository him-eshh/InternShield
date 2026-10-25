import assert from "node:assert/strict";
import { BASE, openRoute, RESUME } from "./v3-lib.mjs";
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):33\d\d$/.test(BASE));
let checks = 0;
for (const route of ["/", "/profile", "/tracker"]) {
  const { browser, page, log } = await openRoute(route, { width: 390, reducedMotion: "reduce" });
  try {
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await page.waitForTimeout(300);
    const bad = await page.locator("button, a, summary, input:not([type=file]):not([type=checkbox]), select, textarea").evaluateAll(els => els.flatMap(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") return [];
      return r.width < 43.9 || r.height < 43.9 ? [`${el.textContent?.trim() || el.getAttribute("aria-label") || el.id}: ${r.width}x${r.height}`] : [];
    }));
    assert.deepEqual(bad, [], `${route} touch targets`); checks++;
    if (route === "/profile") {
      await page.getByRole("button", { name: /About you/ }).click();
      const label = page.getByText("Open to remote roles", { exact: true });
      assert.ok(await label.evaluate(el => el.getBoundingClientRect().height >= 44)); checks++;
    }
    await page.getByRole("link", { name: "InternShield home", exact: true }).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const focus = await page.getByRole("link", { name: "InternShield home", exact: true }).evaluate(el => {
      const style = getComputedStyle(el); return el === document.activeElement && style.outlineStyle !== "none";
    });
    assert.ok(focus, `${route} visible keyboard focus`); checks++;
    await page.keyboard.press("Enter");
    await page.waitForURL(BASE + "/"); checks++;
    assert.ok(log.filter(x => /pageerror|hydrat/i.test(x)).length === 0); checks++;
  } finally { await browser.close(); }
}
// Name/sections preview from the parsed resume and an editable saved profile.
{
  const { browser, page } = await openRoute("/profile", { width: 390, resume: RESUME });
  try {
    await page.getByRole("button", { name: /Add your resume/ }).click();
    assert.ok(await page.getByText(/Alex Rivera.*words/).isVisible()); checks++;
    assert.ok(await page.getByText(/Sections:.*EDUCATION/).isVisible()); checks++;
    await page.getByRole("button", { name: /About you/ }).click();
    await page.getByRole("button", { name: "Tech", exact: true }).click();
    await page.getByRole("button", { name: "Junior", exact: true }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: /About you/ }).click();
    assert.equal(await page.getByRole("button", { name: "Junior", exact: true }).getAttribute("aria-pressed"), "true"); checks++;
  } finally { await browser.close(); }
}
console.log(`ALL OK: ${checks} accessibility and profile checks`);
