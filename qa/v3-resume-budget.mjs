// A pending shortening must not subsidize an accepted manual edit's +3% budget.
import assert from "node:assert/strict";
const base = new URL(process.env.QA_BASE ?? "http://localhost:3100");
assert(base.hostname === "localhost" && Number(base.port) >= 3100 && Number(base.port) <= 3199);
assert(process.env.QA_SHOTS);
process.env.QA_BASE = base.origin;
const { openRoute, done } = await import("./v3-lib.mjs");
const original = "Built a small reporting tool for the student team.";
const { browser, page } = await openRoute("/tailor", { width: 390, resume: { fileName: "demo.txt", text: `Sam Rivera\nEXPERIENCE\n- ${original}\n- Wrote a short team guide.` } });
try {
  await page.getByLabel("Job posting", { exact: true }).fill("Write reports and team guides.");
  await page.route("**/api/rewrite", (route) => route.fulfill(done({ edits: [
    { lineId: "l2", proposed: "Built a reporting tool for the student team." },
    { lineId: "l3", proposed: "Wrote a team guide." },
  ] })));
  await page.getByRole("button", { name: "Tailor my resume", exact: true }).click();
  const card = page.getByRole("article").first();
  await card.waitFor({ timeout: 30000 });
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  const input = card.getByRole("textbox", { name: "Your wording" });
  await input.fill("Built a small reporting tool for the the student team.");
  await input.press("Tab");
  await card.getByRole("alert").waitFor();
  assert.match(await card.getByRole("alert").innerText(), /Longer than your original/);
  assert(await input.isVisible(), "over-budget wording stays a draft");
  assert.equal(await page.getByRole("button", { name: "Accepted", exact: true }).count(), 0);
  console.log("ALL OK manual wording cannot exceed +3% using a pending edit's shortening");
} finally { await browser.close(); }
