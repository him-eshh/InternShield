// All network requests are mocked. Require the report stream's explicit port and artifact directory.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
assert.match(process.env.QA_BASE ?? "", /^http:\/\/localhost:36\d\d$/);
assert.ok(process.env.QA_SHOTS);
const { openRoute, seedCheck, mockApi, shot, overflowX, done } = await import("./v3-lib.mjs");
const EX = JSON.parse(readFileSync("qa/examples.json", "utf8"));
const linkCase = JSON.parse(readFileSync("eval/messages/c7-shortener-google-form-ssn.json", "utf8"));
const shots = [];
const results = [];
const fullFacts = { isJobMessage: true, company: null, role: null, pay: null, sender: { name: null, email: null, phone: null }, asks: [], offPlatform: null, pressure: [], interview: { status: "unclear", quote: null }, dutiesVague: null, noExperienceNeeded: null, employerCountryHint: null, otherConcerns: [] };
const hideDev = async (page) => page.addStyleTag({ content: "nextjs-portal { display: none !important; } html { scroll-behavior: auto !important; }" });
async function capture(page, name, locator) {
  await hideDev(page);
  if (locator) {
    await locator.screenshot({ style: "header.sticky, nav[aria-label=Tools] { visibility: hidden !important; }", path: `${process.env.QA_SHOTS}/${name}.png`, animations: "disabled" });
  } else await shot(page, name);
  shots.push(`${name}.png`);
  assert.equal(await overflowX(page), 0, `${name}: horizontal overflow`);
}
async function showImpact(qq) {
  const closed = qq.locator("[data-impact] details:not([open]) summary").last();
  if (await closed.count()) await closed.click();
}
for (const width of [1440, 390]) for (const theme of ["light", "dark"]) {
  const suffix = `${width}-${theme}`;
  const { browser, page, log } = await openRoute("/check", { width, theme });
  try {
    await capture(page, `v3-report-empty-${suffix}`);
    await page.locator("#message").fill(EX.real.text);
    await capture(page, `v3-report-filled-${suffix}`);
    await mockApi(page, { extract: async () => { await new Promise((r) => setTimeout(r, 5000)); return done(EX.real.savedSteps.extract.data); } });
    await page.getByRole("button", { name: "Check this message", exact: true }).click();
    await page.getByRole("heading", { name: "Following the evidence" }).waitFor();
    await capture(page, `v3-report-checking-${suffix}`);
    await page.locator("article").waitFor();
    await page.waitForTimeout(1000);
    await capture(page, `v3-report-low-${suffix}`);
    assert.equal(await page.getByRole("button", { name: "Copy report", exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Check another message", exact: true }).count(), 1);
    const shortTargets = await page.locator("article").evaluate((article) => [...article.querySelectorAll("button, summary, a")].filter((e) => !e.closest(".am-body")).map((e) => ({ text: e.textContent?.trim(), rect: e.getBoundingClientRect() })).filter(({ rect }) => rect.width > 0 && rect.height > 0 && (rect.height < 44 || rect.width < 44)).map(({ text }) => text));
    assert.deepEqual(shortTargets, [], "report controls must be 44px");
    const qq = page.locator("#qq-title").locator("..");
    await qq.getByRole("button", { name: "None yet", exact: true }).click();
    await qq.locator("[data-impact]").filter({ hasText: "None yet" }).waitFor();
    await showImpact(qq);
    await capture(page, `v3-report-answer-confirmed-${suffix}`, qq);
    await qq.getByRole("button", { name: /None yet.*Change/ }).click();
    await qq.getByRole("button", { name: "Deposit a check", exact: true }).click();
    await qq.getByRole("button", { name: "Update the check", exact: true }).click();
    await page.getByRole("heading", { name: "Strong signs of a scam", exact: true }).waitFor();
    await showImpact(qq);
    await capture(page, `v3-report-answer-changed-${suffix}`, qq);
    assert.equal(await page.getByRole("button", { name: /Tailor my resume|Practice an interview/ }).count(), 0);
    await page.reload();
    await page.locator("article").waitFor();
    await page.getByRole("button", { name: /Deposit a check.*Change/ }).waitFor();
    await page.getByRole("heading", { name: "Strong signs of a scam", exact: true }).waitFor();
    await seedCheck(page, "medium");
    await page.getByRole("heading", { name: "Some warning signs", exact: true }).waitFor();
    await capture(page, `v3-report-medium-${suffix}`);
    await seedCheck(page, "scam");
    await page.getByRole("heading", { name: "Strong signs of a scam", exact: true }).waitFor();
    await capture(page, `v3-report-high-${suffix}`);
    await page.getByRole("button", { name: /Edit company name/ }).click();
    await page.getByLabel("Company", { exact: true }).fill("Northbeam Analytics");
    await page.getByRole("button", { name: "Recheck", exact: true }).click();
    const companyImpact = page.locator("[data-impact]").filter({ hasText: "Company: Northbeam Analytics" });
    await companyImpact.waitFor();
    await capture(page, `v3-report-company-impact-${suffix}`, companyImpact);
    await page.getByText("Add to this check", { exact: true }).click();
    const form = page.getByRole("form", { name: "Add information" });
    await page.getByLabel("Another message", { exact: true }).fill("They now want a payment before the interview. Please deposit a check and send money to our vendor.");
    await form.getByRole("button", { name: "Update this check", exact: true }).click();
    await form.getByRole("status").filter({ hasText: /You added: .*Additional message/ }).waitFor();
    await capture(page, `v3-report-message-impact-${suffix}`, form);
    await page.getByLabel("Another message", { exact: true }).fill("");
    await page.getByLabel("Sender's email or phone", { exact: true }).fill("recruiter@example.com");
    await form.getByRole("button", { name: "Update this check", exact: true }).click();
    await form.getByRole("status").filter({ hasText: /You added: .*Sender/ }).waitFor();
    await capture(page, `v3-report-sender-impact-${suffix}`, form);
    await mockApi(page, { transcribe: () => done({ text: "Another recruiter message asking for a deposit before hiring.", partial: false }) });
    const buffer = await page.screenshot();
    await page.locator('input[type=file]').setInputFiles({ name: "message.png", mimeType: "image/png", buffer });
    await page.waitForFunction(() => document.querySelector("#additional-message")?.value.includes("Another recruiter"));
    await form.getByRole("button", { name: "Update this check", exact: true }).click();
    await form.getByRole("status").filter({ hasText: /You added: .*Additional message/ }).waitFor();
    await capture(page, `v3-report-screenshot-impact-${suffix}`, form);
    // Start a separate check for the held-out link example, keeping the original eval file read-only.
    await page.getByRole("button", { name: "Check another message", exact: true }).click();
    await mockApi(page, { extract: () => done({ ...fullFacts, ...linkCase.savedSteps.extract.data }) });
    await page.locator("#message").fill(linkCase.text);
    await page.getByRole("button", { name: "Check this message", exact: true }).click();
    await page.locator("article").waitFor();
    await page.getByRole("heading", { name: "Strong signs of a scam", exact: true }).waitFor();
    await capture(page, `v3-report-link-scam-${suffix}`);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedCheck(page, "scam");
    await page.getByText("Brightline Data Solutions").first().waitFor();
    await page.waitForFunction(() => Number(document.querySelector("[data-score]")?.textContent ?? 0) >= 85);
    assert(Number(await page.locator("[data-score]").innerText()) >= 85);
    await capture(page, `v3-report-reduced-motion-${suffix}`, page.locator("article header"));
    for (const w of [320, 768]) {
      await page.setViewportSize({ width: w, height: 900 });
      const reportOverflow = await page.locator("article").evaluate((e) => e.scrollWidth - e.clientWidth);
      assert.equal(reportOverflow, 0, `report overflow at ${w}`);
      if (w === 320) assert.equal(await overflowX(page), 0, `overflow at ${w}`);
      else if (await overflowX(page)) console.log(`Needs integration: shared shell overflows at ${w}; report fits.`);
    }
    assert.equal(log.filter((s) => s.startsWith("pageerror")).length, 0, log.join("\n"));
    results.push(`${suffix}: PASS form, checking, three levels, link-scam, changes, persistence, sender, screenshot, reduced motion, 320 page fit / 768 report fit`);
    console.log(results.at(-1));
  } finally { await browser.close(); }
}
writeFileSync("devpost/v3-report-qa.json", JSON.stringify({ results, shots }, null, 2) + "\n");
console.log(`${shots.length} screenshots saved`);
