// Mocked end-to-end editor QA. Set QA_BASE to a resume port and QA_SHOTS outside the tree.
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
const base = new URL(process.env.QA_BASE ?? "http://localhost:3100");
assert(base.hostname === "localhost" && Number(base.port) >= 3100 && Number(base.port) <= 3199);
process.env.QA_BASE = base.origin;
assert(process.env.QA_SHOTS, "QA_SHOTS required");
const { openRoute, shot, tag, done, overflowX, variants } = await import("./v3-lib.mjs");
const full = process.argv.includes("--full");
const fixes = process.argv.includes("--fix-shots");
const capture = (state) => full && (!fixes || ["loading", "accepted-glow", "preview", "download-ready"].includes(state));
const runs = full ? variants : [{ width: 1440, theme: "light" }, { width: 390, theme: "light" }];
for (const variant of runs) {
  const { browser, page, log } = await openRoute("/tailor", { ...variant, profile: false });
  try {
    await page.getByRole("heading", { name: "Tailor your resume" }).waitFor();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.evaluate(() => {
      window.__resumeTiming = {};
      document.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (button?.textContent.includes("Tailor my resume")) window.__resumeTiming.start = performance.now();
        const action = button?.textContent.trim();
        if (action === "Accept" || action === "Accepted" || (action === "Reject" && button.closest("article")?.querySelector('button[aria-pressed="true"]')?.textContent.includes("Accepted"))) {
          window.__resumeTiming.accept = performance.now();
          window.__resumeTiming.before = document.querySelector('[data-preview-ready]')?.getAttribute("data-preview-ready");
        }
      }, true);
      new MutationObserver(() => {
        const timing = window.__resumeTiming;
        if (timing.start && !timing.loading && [...document.querySelectorAll('[role="status"]')].some((n) => n.textContent.includes("Reading your resume"))) timing.loading = performance.now() - timing.start;
        if (timing.accept && document.querySelector("[data-preview-ready]")?.getAttribute("data-preview-ready") !== timing.before) { timing.preview = performance.now() - timing.accept; timing.accept = 0; }
      }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-preview-ready"] });
    });
    if (capture("empty")) await shot(page, `resume-empty-${tag(variant)}`);
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
    await page.waitForFunction(() => {
      const panel = [...document.querySelectorAll('[role="status"]')].find((n) => n.textContent.includes("Reading your resume"));
      if (!panel) return false;
      const box = panel.getBoundingClientRect();
      return box.top >= 56 && box.bottom <= innerHeight - (innerWidth < 768 ? 56 : 0);
    }, null, { timeout: 1000 });
    const loadingMs = await page.evaluate(() => window.__resumeTiming.loading);
    assert(loadingMs <= 300, `loading took ${loadingMs}ms after click`);
    console.log(`${tag(variant)} loading ${Math.round(loadingMs)}ms after click (${Date.now() - started}ms with Playwright overhead)`);
    if (capture("loading")) await shot(page, `resume-loading-${tag(variant)}`, { fullPage: false });
    const cards = page.getByRole("article", { name: /Suggested edit/ });
    await cards.first().waitFor({ timeout: 60000 });
    assert.equal(await cards.count(), 4, "four safe suggestions should survive all client checks");
    assert(await page.getByRole("link", { name: "Engineering notes" }).count());
    if (capture("plan")) await shot(page, `resume-plan-${tag(variant)}`);
    if (!process.argv.includes("--no-shots") && !fixes) await shot(page, `resume-review-${tag(variant)}`);
    await cards.nth(0).getByRole("button", { name: "Accept", exact: true }).click();
    await page.waitForFunction(() => !window.__resumeTiming.accept, null, { timeout: 30000 });
    const previewMs = await page.evaluate(() => window.__resumeTiming.preview);
    assert(previewMs < 200, `accepted preview took ${previewMs}ms`);
    console.log(`${tag(variant)} accept-to-preview ${Math.round(previewMs)}ms`);
    if (capture("accepted-glow")) {
      if (variant.width < 1000) await page.getByRole("button", { name: "Preview", exact: true }).click();
      await page.screenshot({ path: `${process.env.QA_SHOTS}/resume-accepted-glow-${tag(variant)}.png`, fullPage: false, animations: "allow" });
      if (variant.width < 1000) await page.getByRole("button", { name: "Edits", exact: true }).click();
    }
    await cards.nth(1).getByRole("button", { name: "Accept", exact: true }).click();
    await page.waitForFunction(() => !window.__resumeTiming.accept, null, { timeout: 30000 });
    assert((await page.evaluate(() => window.__resumeTiming.preview)) < 200, "second Accept updates the completed byte-matched preview under 200ms");
    await cards.nth(0).getByRole("button", { name: "Reject", exact: true }).click();
    await page.waitForFunction(() => !window.__resumeTiming.accept, null, { timeout: 30000 });
    assert((await page.evaluate(() => window.__resumeTiming.preview)) < 200, "Reject of an accepted edit updates preview under 200ms");
    await cards.nth(0).getByRole("button", { name: "Accept", exact: true }).click();
    await page.waitForFunction(() => !window.__resumeTiming.accept, null, { timeout: 30000 });
    await cards.nth(2).getByRole("button", { name: "Reject", exact: true }).click();
    await cards.nth(3).getByRole("button", { name: "Edit", exact: true }).click();
    const wording = cards.nth(3).getByRole("textbox", { name: "Your wording" });
    await wording.fill("Wrote a brief guide for the checkout desk that new staff still use.");
    await wording.press("Tab");
    await wording.waitFor({ state: "hidden", timeout: 60000 });
    assert.equal(await cards.nth(3).getByRole("alert").count(), 0);
    assert(await cards.nth(3).getByRole("button", { name: "Accepted", exact: true }).isEnabled(), "your valid wording applies immediately");
    if (variant.width < 1000) await page.getByRole("button", { name: "Preview", exact: true }).click();
    const download = page.getByRole("button", { name: "Download PDF", exact: true });
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Download PDF") && !b.disabled), null, { timeout: 60000 });
    const result = page.waitForEvent("download");
    await download.click();
    assert((await result).suggestedFilename().endsWith("-tailored.pdf"));
    assert.equal(await overflowX(page), 0);
    if (full) {
      if (capture("download-ready")) await shot(page, `resume-download-ready-${tag(variant)}`);
      if (capture("preview")) await shot(page, `resume-preview-${tag(variant)}`);
      if (variant.width < 1000) {
        await page.getByRole("button", { name: "Zoom in", exact: true }).click();
        assert.equal(await overflowX(page), 0, "zoom scroll stays inside the preview");
        await shot(page, `resume-zoom-${tag(variant)}`, { fullPage: false });
        await page.getByRole("button", { name: "Fit page", exact: true }).click();
      }
      if (variant.width < 1000) await page.getByRole("button", { name: "Edits", exact: true }).click();
      await cards.nth(3).getByRole("button", { name: "Edit", exact: true }).click();
      const draft = cards.nth(3).getByRole("textbox", { name: "Your wording" });
      await draft.fill("Wrote a short guide for the checkout desk that new staff still use. " + "Extra wording ".repeat(15));
      await draft.press("Tab");
      await cards.nth(3).getByRole("alert").waitFor();
      assert.match(await cards.nth(3).getByRole("alert").innerText(), /Too long/);
      if (capture("too-long")) await shot(page, `resume-too-long-${tag(variant)}`);
    }
    assert.deepEqual(log.filter((line) => line.startsWith("pageerror")), []);
    console.log(`${tag(variant)} upload -> loading -> review -> accept 2/reject 1/edit 1 -> preview -> PDF download passed`);
  } finally { await browser.close(); }
}
console.log("ALL OK");
