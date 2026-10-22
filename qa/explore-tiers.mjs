import { open, mockApi, shot, text, overflowX, BASE } from "./lib.mjs";

const width = Number(process.argv[2] ?? 1440);
const theme = process.argv[3] ?? "light";
const phase = process.argv[4] ?? "before";
const t = `${width}-${theme}`;
const RESUME = {
  fileName: "alex-resume.pdf",
  text: "Alex Rivera\nalex@example.com | (555) 010-2000 | github.com/alexr\n\nEXPERIENCE\nSoftware Intern, Lumen Labs (Jun 2025 - Aug 2025)\n- Built a React dashboard used by 40 analysts\n- Cut API response time by 30% with Redis caching\n\nPROJECTS\nCampus Eats\n- Wrote a Python scraper for dining hall menus\n\nSKILLS\nPython, React, SQL",
};
const { browser, page, log } = await open({ width, theme, profile: { field: "tech", level: "junior", skills: ["Python", "React"] }, resume: RESUME });
await mockApi(page);
await page.goto(BASE);
await page.getByRole("button", { name: "a real one" }).click();
await page.locator("article").waitFor({ timeout: 15000 });

const dump = async (label, n) => {
  await page.waitForTimeout(600);
  await shot(page, `${n}-${label}-${t}-${phase}`);
  console.log(`== ${label} (overflow ${await overflowX(page)})\n` + (await text(page, "body")).slice(0, 2500));
};

await page.getByRole("button", { name: "Save to tracker" }).click();
await page.waitForTimeout(500);
console.log("== after save:", (await text(page, "footer")).slice(0, 400));

// Chip menu
await page.locator("header button").first().click();
await dump("chip-menu", "06");
await page.keyboard.press("Escape");

await page.getByRole("button", { name: /Tailor my resume/ }).click();
await dump("tailor", "07");
await page.goto(BASE);
await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
await page.waitForTimeout(1200);
await page.locator("header button").first().click();
await page.getByRole("button", { name: "My applications" }).click();
await dump("tracker", "08");

await page.locator("header button").first().click();
await page.getByRole("button", { name: "Practice an interview" }).click();
await dump("interview-setup", "09");
console.log("== LOG\n" + log.filter((l) => !l.includes("cache-bypass")).join("\n"));
await browser.close();
