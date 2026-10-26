// Focused Tracker journey: stage moves, desktop drop, reload persistence, and tool handoff.
import assert from "node:assert/strict";
import { BASE, openRoute } from "./v3-lib.mjs";

assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE), "Set QA_BASE to the local app URL");
const { browser, page } = await openRoute("/tracker", { width: 1280 });
try {
  await page.getByRole("heading", { name: "Your application notebook" }).waitFor();
  await page.getByLabel("Company", { exact: true }).fill("Brightleaf Labs");
  await page.getByLabel("Role (optional)", { exact: true }).fill("Data Analyst Intern");
  await page.getByLabel("Job posting (optional)", { exact: true }).fill("Analyze product data with SQL and explain findings to partners.");
  await page.getByRole("button", { name: "Add application", exact: true }).click();

  for (const stage of ["Applied", "Interviewing", "Interviewed"]) {
    await page.getByRole("button", { name: `Move to ${stage}`, exact: true }).click();
    assert.equal(await page.getByLabel("Status for Brightleaf Labs").inputValue(), stage.toLowerCase());
  }

  await page.reload();
  await page.getByRole("heading", { name: "Your application notebook" }).waitFor();
  assert.equal(await page.getByLabel("Status for Brightleaf Labs").inputValue(), "interviewed");
  assert.match(await page.locator('li[id^="card-"]').innerText(), /Job posting saved: Analyze product data/);

  await page.evaluate(() => {
    const card = document.querySelector('li[id^="card-"]');
    const column = document.querySelector('section[aria-labelledby="col-applied"]');
    const dataTransfer = new DataTransfer();
    card?.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer }));
    column?.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }));
    column?.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
    card?.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer }));
  });
  assert.equal(await page.getByLabel("Status for Brightleaf Labs").inputValue(), "applied");
  await page.reload();
  assert.equal(await page.getByLabel("Status for Brightleaf Labs").inputValue(), "applied");

  await page.getByLabel("More actions for Brightleaf Labs").click();
  await page.getByRole("button", { name: "Practice interview", exact: true }).click();
  await page.waitForURL(`${BASE}/practice`);
  const practice = await page.evaluate(() => JSON.parse(localStorage.getItem("is:targets") ?? "{}").practice);
  assert.deepEqual(practice, { company: "Brightleaf Labs", role: "Data Analyst Intern", description: "Analyze product data with SQL and explain findings to partners." });

  await page.goto(`${BASE}/tracker`);
  await page.getByLabel("More actions for Brightleaf Labs").click();
  await page.getByRole("button", { name: "Tailor resume", exact: true }).click();
  await page.waitForURL(`${BASE}/tailor`);
  const tailor = await page.evaluate(() => JSON.parse(localStorage.getItem("is:targets") ?? "{}").tailor);
  assert.deepEqual(tailor, practice);
  console.log("ALL OK: Tracker move, drop, persistence, and handoffs");
} finally {
  await browser.close();
}
