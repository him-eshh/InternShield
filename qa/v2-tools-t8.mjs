// T8: tracker (empty, filled, menu, delete + undo), system design board (14 px labels, snap, dot grid).
import { open, shot, overflowX, BASE, variants, tag } from "./lib.mjs";

const card = (id, company, role, column, risk, notes = "") => ({ id, company, role, link: null, risk, column, notes, createdAt: 1700000000000 + Number(id.slice(1)) });
const CARDS = [
  card("c1", "Northwind Labs", "Web Intern", "saved", "low"),
  card("c2", "Lumen Labs", "Data Analyst Intern", "applied", "medium", "Applied on the careers page."),
  card("c3", "Acme Robotics", "Software Intern", "interviewing", "high"),
];

async function toTracker(page) {
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
  await page.waitForTimeout(800);
  await page.locator("header button").first().click();
  await page.getByRole("button", { name: "My applications" }).click();
  await page.getByRole("heading", { name: "My applications" }).waitFor();
}

for (const v of variants) {
  const t = tag(v);
  {
    const { browser, page, log } = await open({ ...v, profile: { field: "tech", level: "junior", skills: [] } });
    await toTracker(page);
    await page.waitForTimeout(300);
    console.log(`== tracker-empty ${t} overflow ${await overflowX(page)}`);
    await shot(page, `12-tracker-empty-${t}`);
    await browser.close();
    if (log.length) console.log(`== LOG ${t}\n` + log.join("\n"));
  }
  {
    const { browser, page, log } = await open({ ...v, profile: { field: "tech", level: "junior", skills: [] }, storage: { "is:tracker": JSON.stringify(CARDS) } });
    await toTracker(page);
    await page.waitForTimeout(300);
    console.log(`== tracker-filled ${t} overflow ${await overflowX(page)}`);
    await shot(page, `12-tracker-filled-${t}`);
    await page.getByRole("button", { name: /More actions for Acme Robotics/ }).or(page.locator("summary[aria-label*='Acme Robotics']")).first().click();
    await page.waitForTimeout(200);
    await shot(page, `12-tracker-menu-${t}`, { fullPage: false });
    await page.getByRole("button", { name: "Delete" }).first().click();
    await page.getByRole("button", { name: "Undo" }).waitFor();
    console.log(`== deleted ${t} cards ${await page.locator("li[id^=card-]").count()}`);
    await shot(page, `12-tracker-undo-${t}`, { fullPage: false });
    await page.getByRole("button", { name: "Undo" }).click();
    await page.waitForTimeout(300);
    console.log(`== restored ${t} cards ${await page.locator("li[id^=card-]").count()}`);
    await browser.close();
    if (log.length) console.log(`== LOG ${t}\n` + log.join("\n"));
  }
}
