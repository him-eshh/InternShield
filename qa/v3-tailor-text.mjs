// Focused Tailor QA: explicit pasted-text mode, no-posting role context, and text download.
import assert from "node:assert/strict";
const base = new URL(process.env.QA_BASE ?? "http://localhost:3100");
assert(base.hostname === "localhost" && Number(base.port) >= 3100 && Number(base.port) <= 3199);
process.env.QA_BASE = base.origin;
const { openRoute, done } = await import("./v3-lib.mjs");

const { browser, page, log } = await openRoute("/tailor", {
  profile: { field: "tech", level: "freshman", skills: ["JavaScript"] },
  targets: { tailor: { company: "Northwind", role: "Data Intern", description: null }, practice: null },
});
try {
  await page.getByRole("button", { name: "Paste text", exact: true }).waitFor();
  await page.getByRole("button", { name: "Upload file", exact: true }).click();
  assert(await page.getByLabel("Upload resume").isVisible());
  await page.getByRole("button", { name: "Paste text", exact: true }).click();
  assert(await page.getByLabel("Resume text", { exact: true }).isVisible(), "text mode stays usable after selecting file mode");
  await page.getByLabel("Resume text", { exact: true }).fill("Sam Rivera\nEXPERIENCE\n- Built a club website with JavaScript.\n- Wrote a short team guide.");
  assert.equal(await page.getByLabel("Job posting").inputValue(), "");
  await page.route("**/api/intel", (route) => route.fulfill(done({ limited: true, resume: { emphasis: [] }, sources: [] })));
  await page.route("**/api/rewrite", async (route) => {
    const input = route.request().postDataJSON();
    assert.equal(input.posting, "");
    assert.equal(input.company, "Northwind");
    assert.equal(input.role, "Data Intern");
    assert.equal(input.level, "freshman");
    const lineId = `l${input.resume.split("\n").findIndex((line) => line.includes("Wrote a short"))}`;
    await route.fulfill(done({ edits: [{ lineId, proposed: "Wrote a brief team guide." }] }));
  });
  await page.getByRole("button", { name: "Tailor my resume", exact: true }).click();
  await page.getByRole("article", { name: /Suggested edit/ }).waitFor();
  assert.equal(await page.getByText("Using the company and role details only", { exact: true }).count(), 1);
  assert.equal(await page.getByText("Using the job post only", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  const download = page.getByRole("button", { name: "Download TXT", exact: true });
  await download.waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Download TXT") && !button.disabled));
  const pending = page.waitForEvent("download");
  await download.click();
  const saved = await pending;
  assert(saved.suggestedFilename().endsWith("-tailored.txt"));
  assert.deepEqual(log.filter((line) => line.startsWith("pageerror")), []);
  console.log("text mode -> role context -> guarded edit -> TXT download passed");
} finally {
  await browser.close();
}
