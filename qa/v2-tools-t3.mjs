// T3: wide coding split pane, code colors, one hidden-test line, 4-area scorecard with a marked quote.
import { open, mockApi, shot, overflowX, BASE, done, variants, tag } from "./lib.mjs";

const PLAN = "I'll scan once and keep a running max, so it is O(n) time and O(1) extra space. I tested an empty list and negatives first.";
const runs = [...variants, { width: 1440, theme: "light", reducedMotion: "reduce", rm: true }];
for (const v of runs) {
  const t = tag(v) + (v.rm ? "-rm" : "");
  const { browser, page, log } = await open({ ...v, profile: { field: "tech", level: "junior", skills: [] } });
  await mockApi(page, {
    interview: (body) =>
      body.ask === "feedback"
        ? done({
            text: null,
            feedback: {
              summary: "Clear plan and a working solution.",
              items: [{ index: 0, strength: "You named the complexity up front.", improve: "Say which edge cases you tried out loud.", quote: "keep a running max", star: null }],
            },
          })
        : done({ text: "Try tracking the max so far.", feedback: null }),
  });
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
  await page.waitForTimeout(800);
  await page.locator("header button").first().click();
  await page.getByRole("button", { name: "Practice an interview" }).click();
  await page.locator("label", { hasText: "Live coding" }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await page.locator(".cm-content").waitFor();
  const fn = await page.locator("code.font-mono").first().innerText();
  await page.getByRole("button", { name: "JavaScript", exact: true }).click();
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  // A comment, string, number and keyword so the colors show.
  await page.keyboard.insertText(`// running max\nfunction ${fn}(nums) {\n  const label = "max";\n  let m = -Infinity;\n  return nums.map((n) => (m = Math.max(m, n)));\n}`);
  await page.fill("#coding-approach", PLAN);
  const idle = () => page.getByRole("button", { name: "Run examples" }).and(page.locator(":enabled")).waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Run examples" }).click();
  await idle();
  await page.getByRole("button", { name: "Submit" }).click();
  await idle();
  const aria = await page.locator(".cm-content").getAttribute("aria-label");
  const hiddenLines = await page.getByText(/hidden tests passed/).count();
  console.log(`== coding ${t} overflow ${await overflowX(page)} aria "${aria}" hidden-lines ${hiddenLines}`);
  if (!v.rm) await shot(page, `05-coding-${t}`);
  await page.getByRole("button", { name: "Finish and get feedback" }).click();
  await page.getByRole("heading", { name: "Scorecard" }).waitFor();
  const axes = await page.locator("#scorecard-h + ul > li").allInnerTexts();
  console.log(`== scorecard ${t} overflow ${await overflowX(page)} marks ${await page.locator("mark").count()} axes: ${axes.map((a) => a.split("\n").slice(0, 2).join(":")).join(" | ")}`);
  await shot(page, `06-scorecard-${t}`);
  if (v.width === 390) {
    await page.setViewportSize({ width: 320, height: 900 });
    console.log(`== scorecard 320 overflow ${await overflowX(page)}`);
  }
  console.log("LOG " + log.join(" | "));
  await browser.close();
}
