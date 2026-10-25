// Additional mocked browser checks without screenshots: cancellation, DOCX, capped intel, manual guard.
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
const base = new URL(process.env.QA_BASE ?? "http://localhost:3100");
assert(base.hostname === "localhost" && Number(base.port) >= 3100 && Number(base.port) <= 3199);
assert(process.env.QA_SHOTS);
process.env.QA_BASE = base.origin;
const { openRoute, done } = await import("./v3-lib.mjs");
const { browser, page, log } = await openRoute("/tailor", { width: 390, theme: "dark", profile: false, reducedMotion: "reduce" });
try {
  await page.getByLabel("Upload resume").setInputFiles("tests/fixtures/resume/one-page.docx");
  await page.getByLabel("Company (optional)").fill("Northwind");
  await page.getByLabel("Job posting", { exact: true }).fill("Required: Python, SQL. Preferred: React.");
  let lookups = 0;
  await page.route("**/api/intel", async (route) => {
    lookups++;
    await delay(1000);
    await route.fulfill(done({ company: "Northwind", limited: true, sources: [] })).catch(() => {});
  });
  let drafts = 0;
  await page.route("**/api/rewrite", async (route) => {
    drafts++;
    const data = route.request().postDataJSON();
    const lines = data.resume.split("\n");
    const edits = [
      { lineId: `l${lines.findIndex((l) => l.includes("Cleaned and merged"))}`, proposed: "Cleaned and merged 3 shipment data sources with Python and fixed duplicate records." },
      ...(data.facts.includes("React") ? [{ lineId: `l${lines.findIndex((l) => l.includes("Wrote a short"))}`, proposed: "Wrote a short React guide for the checkout desk that new staff use." }] : []),
    ];
    await route.fulfill(done({ edits }));
  });
  await page.getByRole("button", { name: "Tailor my resume", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Tailoring cancelled" }).waitFor();
  await delay(1200);
  assert.equal(await page.getByRole("article").count(), 0);
  assert.equal(drafts, 0, "cancelled run must not start drafting");
  await page.getByRole("button", { name: "Tailor my resume", exact: true }).click();
  const cards = page.getByRole("article", { name: /Suggested edit/ });
  await cards.first().waitFor({ timeout: 60000 });
  await page.getByText("Using the job post only", { exact: true }).waitFor();
  await cards.first().getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const download = page.getByRole("button", { name: "Download DOCX", exact: true });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Download DOCX") && !b.disabled), null, { timeout: 30000 });
  assert(await page.locator(".resume-document .resume-highlight-text").count());
  const event = page.waitForEvent("download"); await download.click();
  assert((await event).suggestedFilename().endsWith(".docx"));
  await page.getByRole("button", { name: "Edits", exact: true }).click();
  await cards.first().getByRole("button", { name: "Edit", exact: true }).click();
  const wording = cards.first().getByRole("textbox", { name: "Your wording" });
  await wording.fill("Spearheaded a robust system for Microsoft in 2026.");
  await wording.press("Tab");
  await cards.first().getByRole("alert").waitFor();
  assert(await cards.first().getByRole("button", { name: "Accepted", exact: true }).isDisabled());
  await cards.first().getByRole("button", { name: "Cancel edit", exact: true }).click();
  const chip = page.getByRole("button", { name: "I have this", exact: true });
  await chip.click();
  await page.getByRole("button", { name: "Confirmed", exact: true }).waitFor({ timeout: 30000 });
  assert.equal(await cards.count(), 2);
  await page.getByRole("button", { name: "Confirmed", exact: true }).click();
  assert.equal(await cards.count(), 1, "removing a skill removes dependent suggestions");
  assert.deepEqual(log.filter((line) => line.startsWith("pageerror")), []);
  console.log(`ALL OK cancellation, capped intel, DOCX preview/download, manual fact/tell rejection, reversible skill (${lookups} mocked intel, ${drafts} mocked rewrite)`);
} finally { await browser.close(); }
