// Mocked end-to-end editor QA. Set QA_BASE to a resume port and QA_SHOTS outside the tree.
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
const base = new URL(process.env.QA_BASE ?? "http://localhost:3100");
assert(base.hostname === "localhost" && Number(base.port) >= 3100 && Number(base.port) <= 3199);
process.env.QA_BASE = base.origin;
assert(process.env.QA_SHOTS, "QA_SHOTS required");
const { openRoute, shot, tag, done, overflowX, variants } = await import("./v3-lib.mjs");
const full = process.argv.includes("--full");
const runs = full ? variants : [{ width: 1440, theme: "light" }, { width: 390, theme: "light" }];
for (const variant of runs) {
  const { browser, page, log } = await openRoute("/tailor", { ...variant, profile: false });
  try {
    await page.getByRole("heading", { name: "Tailor your resume" }).waitFor();
    if (full) await shot(page, `resume-empty-${tag(variant)}`);
    await page.getByLabel("Upload resume").setInputFiles("tests/fixtures/resume/one-page.pdf");
    await page.getByLabel("Company (optional)").fill("Northwind");
    await page.getByLabel("Role (optional)").fill("Data Intern");
    await page.getByLabel("Job posting", { exact: true }).fill("Required: Python, SQL, Excel. Preferred: Tableau.");
    await page.route("**/api/intel", async (route) => {
      await delay(700);
      await route.fulfill(done({ company: "Northwind", resume: { emphasis: ["Explain how you checked your data."] }, sources: [{ label: "Engineering notes", url: "https://northwind.example/engineering" }] }));
    });
    await page.route("**/api/rewrite", async (route) => {
      await delay(600);
      const input = route.request().postDataJSON();
      const lines = input.resume.split("\n");
      const choices = [
        ["Cleaned and merged", "Cleaned and merged 3 shipment data sources with Python and fixed duplicate records."],
        ["Presented route", "Presented route delay findings to a team of 8 and helped select two new carriers."],
        ["Helped 40", "Helped 40 students each week find research sources and book study rooms."],
        ["Wrote a short", "Wrote a short guide for the checkout desk that new staff use."],
      ];
      await route.fulfill(done({ edits: choices.map(([prefix, proposed]) => ({ lineId: `l${lines.findIndex((line) => line.includes(prefix))}`, proposed })) }));
    });
    const started = Date.now();
    await page.getByRole("button", { name: "Tailor my resume", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Reading your resume" }).waitFor({ timeout: 1000 });
    console.log(`${tag(variant)} loading visible ${Date.now() - started}ms (includes Playwright click overhead)`);
    if (full) await shot(page, `resume-loading-${tag(variant)}`, { fullPage: false });
    const cards = page.getByRole("article", { name: /Suggested edit/ });
    await cards.first().waitFor({ timeout: 60000 });
    assert.equal(await cards.count(), 4, "four safe suggestions should survive all client checks");
    assert(await page.getByRole("link", { name: "Engineering notes" }).count());
    if (full) await shot(page, `resume-plan-${tag(variant)}`);
    if (!full) await shot(page, `resume-review-${tag(variant)}`);
    else await shot(page, `resume-review-${tag(variant)}`);
    await cards.nth(0).getByRole("button", { name: "Accept", exact: true }).click();
    await cards.nth(1).getByRole("button", { name: "Accept", exact: true }).click();
    await cards.nth(2).getByRole("button", { name: "Reject", exact: true }).click();
    await cards.nth(3).getByRole("button", { name: "Edit", exact: true }).click();
    const wording = cards.nth(3).getByRole("textbox", { name: "Your wording" });
    await wording.fill("Wrote a brief guide for the checkout desk that new staff still use.");
    await wording.press("Tab");
    await cards.nth(3).getByRole("button", { name: "Accept", exact: true }).waitFor({ state: "visible" });
    assert.equal(await cards.nth(3).getByRole("alert").count(), 0);
    if (variant.width < 1000) await page.getByRole("button", { name: "Preview", exact: true }).click();
    const download = page.getByRole("button", { name: "Download PDF", exact: true });
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Download PDF") && !b.disabled), null, { timeout: 60000 });
    const result = page.waitForEvent("download");
    await download.click();
    assert((await result).suggestedFilename().endsWith("-tailored.pdf"));
    assert.equal(await overflowX(page), 0);
    if (full) {
      await shot(page, `resume-download-ready-${tag(variant)}`);
      await shot(page, `resume-preview-${tag(variant)}`);
      if (variant.width < 1000) await page.getByRole("button", { name: "Edits", exact: true }).click();
      await cards.nth(3).getByRole("button", { name: "Edit", exact: true }).click();
      const draft = cards.nth(3).getByRole("textbox", { name: "Your wording" });
      await draft.fill("Wrote a short guide for the checkout desk that new staff still use. " + "Extra wording ".repeat(15));
      await draft.press("Tab");
      await cards.nth(3).getByRole("alert").waitFor();
      assert.match(await cards.nth(3).getByRole("alert").innerText(), /Too long/);
      await shot(page, `resume-too-long-${tag(variant)}`);
    }
    assert.deepEqual(log.filter((line) => line.startsWith("pageerror")), []);
    console.log(`${tag(variant)} upload -> loading -> review -> accept 2/reject 1/edit 1 -> preview -> PDF download passed`);
  } finally { await browser.close(); }
}
console.log("ALL OK");
