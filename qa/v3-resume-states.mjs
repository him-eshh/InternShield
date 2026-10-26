// Additional mocked browser checks without screenshots: cancellation, DOCX, capped intel, manual guard.
import assert from "node:assert/strict";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
const base = new URL(process.env.QA_BASE ?? "http://localhost:3100");
assert(base.hostname === "localhost" && Number(base.port) >= 3100 && Number(base.port) <= 3199);
assert(process.env.QA_SHOTS);
process.env.QA_BASE = base.origin;
const { openRoute, done } = await import("./v3-lib.mjs");
const { browser, page, log } = await openRoute("/tailor", { width: 390, theme: "dark", profile: false, reducedMotion: "reduce" });
try {
  const zip = await JSZip.loadAsync(readFileSync("tests/fixtures/resume/one-page.docx"));
  let xml = await zip.file("word/document.xml").async("string");
  if (!xml.includes("xmlns:r=")) xml = xml.replace("<w:document ", '<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
  xml = xml.replace("</w:body>", '<w:p><w:hyperlink r:id="qa-link"><w:r><w:t>Contact portfolio</w:t></w:r></w:hyperlink></w:p></w:body>');
  zip.file("word/document.xml", xml);
  zip.file("word/_rels/document.xml.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="qa-link" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="javascript:alert(1)" TargetMode="External"/></Relationships>');
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await page.getByLabel("Upload resume").setInputFiles({ name: "links.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer });
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
      { lineId: `l${lines.findIndex((l) => l.includes("Cleaned and merged"))}`, proposed: data.source === "docx" ? "Cleaned 3 shipment data sources with Python to fix duplicate records." : "Merged and cleaned 3 shipment data sources with Python to fix duplicate records." },
      ...(data.facts.includes("React") ? [{ lineId: `l${lines.findIndex((l) => l.includes("Wrote a short"))}`, proposed: "Wrote a React guide for the checkout desk that new staff use." }] : []),
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
  await page.getByText("Word edits shorten wording while keeping the remaining words in order. Check the downloaded file in Word before sending it.", { exact: true }).waitFor();
  await cards.first().getByRole("button", { name: "Accept", exact: true }).click();
  await cards.first().getByRole("button", { name: "Edit", exact: true }).click();
  const validWord = cards.first().getByRole("textbox", { name: "Your wording" });
  await validWord.fill("Cleaned 3 shipment data sources with Python to fix records.");
  await validWord.press("Tab");
  await validWord.waitFor({ state: "hidden", timeout: 30000 });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const download = page.getByRole("button", { name: "Download DOCX", exact: true });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Download DOCX") && !b.disabled), null, { timeout: 30000 });
  assert(await page.locator(".resume-document .resume-highlight-text").count());
  assert((await page.locator(".resume-document").innerText()).includes("Cleaned 3 shipment data sources with Python to fix records."));
  assert.equal(await page.locator(".resume-document .resume-highlight-text").first().evaluate((node) => getComputedStyle(node).animationName), "none", "reduced motion disables highlight animation");
  assert((await page.locator(".resume-document").innerText()).includes("Contact portfolio"), "DOCX preview keeps hyperlink text");
  assert.equal(await page.locator('.resume-document a,.resume-document script,.resume-document [onclick]').count(), 0, "DOCX preview removes active HTML");
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
  await page.getByRole("button", { name: "Change inputs", exact: true }).click();
  await page.getByLabel("Upload resume").setInputFiles("tests/fixtures/resume/one-page.pdf");
  await page.getByRole("button", { name: "Tailor my resume", exact: true }).click();
  await cards.first().waitFor({ timeout: 60000 });
  const chip = page.getByRole("button", { name: "I have this", exact: true });
  await chip.click();
  await page.getByRole("button", { name: "Confirmed", exact: true }).waitFor({ timeout: 30000 });
  assert.equal(await cards.count(), 2);
  await page.getByRole("button", { name: "Confirmed", exact: true }).click();
  assert.equal(await cards.count(), 1, "removing a skill removes dependent suggestions");
  assert.deepEqual(log.filter((line) => line.startsWith("pageerror")), []);
  console.log(`ALL OK cancellation, capped intel, DOCX preview/download, manual fact/tell rejection, reversible skill (${lookups} mocked intel, ${drafts} mocked rewrite)`);
} finally { await browser.close(); }
