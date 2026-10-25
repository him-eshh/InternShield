// T9: first screen of the rounds not shot earlier (recruiter, behavioral, design board, case, portfolio, timed challenge).
import { open, mockApi, shot, overflowX, BASE, done, variants, tag } from "../lib.mjs";

const rounds = [
  ["Recruiter screen", "tech", "screen"],
  ["Behavioral", "tech", "behavioral"],
  ["System design", "tech", "design"],
  ["Case interview", "business", "case"],
  ["Portfolio walkthrough", "design", "portfolio"],
  ["Design challenge", "design", "challenge"],
];
const runs = [...variants, { width: 1440, theme: "light", reducedMotion: "reduce", rm: true }];
for (const v of runs) {
  const t = tag(v) + (v.rm ? "-rm" : "");
  for (const [label, field, id] of rounds) {
    const { browser, page, log } = await open({ ...v, profile: { field, level: "junior", skills: [] } });
    await mockApi(page, { interview: () => done({ text: "What drew you to this role?", feedback: null }) });
    await page.goto(BASE);
    await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
    await page.waitForTimeout(800);
    await page.locator("header button").first().click();
    await page.getByRole("button", { name: "Practice an interview" }).click();
    await page.locator("label", { hasText: label }).first().click();
    if (id === "portfolio") {
      const link = page.getByRole("textbox").first();
      if (await link.count()) await link.fill("https://example.com/my-work").catch(() => {});
    }
    await page.getByRole("button", { name: "Start" }).click();
    await page.waitForTimeout(900);
    console.log(`== ${id} ${t} overflow ${await overflowX(page)} log ${log.join(" | ")}`);
    await shot(page, `13-${id}-${t}`);
    await browser.close();
  }
}
