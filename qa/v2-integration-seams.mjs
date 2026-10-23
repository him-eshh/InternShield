// I2 seams on the merged app: intro -> Check, both examples, quick answers re-score, footer Tailor/Practice by live level.
import "./v2-integration-env.mjs";
const { open, mockApi, shot, overflowX, BASE } = await import("./lib.mjs");

const ring = async (page) => (await page.locator('main svg[role="img"][aria-label^="Risk "]').first().getAttribute("aria-label")) ?? "none";
const has = async (page, name) => (await page.getByRole("button", { name }).count()) > 0;

// 1. No profile: intro -> Get started lands on Check.
{
  const { browser, page, log } = await open({ profile: false });
  await mockApi(page);
  await page.goto(BASE);
  await page.locator("main button").first().click();
  await page.locator("textarea").first().waitFor({ timeout: 10000 });
  console.log(`intro->check ok, addProfile=${await has(page, "Add profile")} console=${log.join(" | ") || "none"}`);
  await shot(page, "00-seam-intro-to-check-1440-light", { fullPage: false });
  await browser.close();
}

// 2. Examples land in their levels; footer extras follow the level.
for (const ex of ["a scam", "a real one"]) {
  const { browser, page, log } = await open();
  const calls = await mockApi(page);
  await page.goto(BASE);
  await page.getByRole("button", { name: ex, exact: true }).click();
  await page.locator("article").waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
  const h2 = await page.locator("main h2").first().innerText();
  console.log(`${ex}: ${await ring(page)} | ${h2} | tailor=${await has(page, "Tailor my resume for this")} practice=${await has(page, "Practice an interview for this")} save=${await has(page, "Save to tracker")} apiCalls=${calls.map((c) => c.name).join(",") || "none"} overflow=${await overflowX(page)} console=${log.join(" | ") || "none"}`);
  if (ex === "a real one") {
    // Quick answers: click the first option of the first question and watch the ring.
    const before = await ring(page);
    const qq = page.locator('section[aria-labelledby="qq-title"]');
    if (await qq.count()) {
      await qq.getByRole("button", { name: "Deposit a check" }).click();
      await qq.getByRole("button", { name: "Update the check" }).click();
      await page.waitForTimeout(1500);
      console.log(`  deposit_check: ${await ring(page)} (was ${before}) h2=${await page.locator("main h2").first().innerText()} tailor=${await has(page, "Tailor my resume for this")} practice=${await has(page, "Practice an interview for this")}`);
      await shot(page, "00-seam-answer-raises-high-1440-light", { fullPage: true });
    } else console.log("  no quick questions on real example");
    // Tailor and Practice open with the report's company/role.
    const fresh = await open();
    await mockApi(fresh.page);
    await fresh.page.goto(BASE);
    await fresh.page.getByRole("button", { name: ex, exact: true }).click();
    await fresh.page.locator("article").waitFor({ timeout: 15000 });
    await fresh.page.getByRole("button", { name: "Tailor my resume for this" }).click();
    await fresh.page.waitForTimeout(800);
    console.log(`  tailor screen: ${(await fresh.page.locator("main").innerText()).slice(0, 200).replace(/\s+/g, " ")}`);
    await shot(fresh.page, "00-seam-tailor-from-report-1440-light", { fullPage: false });
    await fresh.page.getByRole("button", { name: /Back/ }).first().click();
    await fresh.page.getByRole("button", { name: "Practice an interview for this" }).click();
    await fresh.page.waitForTimeout(800);
    console.log(`  practice prefill: company=${await fresh.page.getByLabel("Company", { exact: true }).inputValue()} role=${await fresh.page.getByLabel("Role", { exact: true }).inputValue()}`);
    await shot(fresh.page, "00-seam-practice-from-report-1440-light", { fullPage: false });
    await fresh.browser.close();
  }
  await browser.close();
}
