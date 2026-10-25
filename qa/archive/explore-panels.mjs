// Coding round (JS/Python, infinite loop), design board by keyboard, design challenge, tracker keyboard.
import { open, mockApi, shot, overflowX, BASE, done } from "../lib.mjs";

const width = Number(process.argv[2] ?? 1440);
const theme = process.argv[3] ?? "light";
const phase = process.argv[4] ?? "before";
const only = process.argv[5];
const t = `${width}-${theme}`;
const mocks = {
  interview: (b) =>
    b.ask === "feedback"
      ? done({ text: null, feedback: { summary: "Solid start.", items: b.turns.map((_, i) => ({ index: i, strength: "Clear.", improve: "Add detail.", quote: null, star: null })) } })
      : done({ text: b.ask === "hint" ? "Try a hash map." : "How would you scale the database?", feedback: null }),
};

async function start(field, round) {
  const s = await open({ width, theme, profile: { field, level: "junior", skills: [] } });
  await mockApi(s.page, mocks);
  await s.page.goto(BASE);
  await s.page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
  await s.page.waitForTimeout(1000);
  await s.page.locator("header button").first().click();
  await s.page.getByRole("button", { name: "Practice an interview" }).click();
  await s.page.locator("label", { hasText: round }).first().click();
  await s.page.getByRole("button", { name: "Start" }).click();
  await s.page.waitForTimeout(800);
  return s;
}
const say = async (page, label) => console.log(`== ${label} (overflow ${await overflowX(page)})\n` + (await page.locator("main").innerText()).slice(0, 1800));

if (only === "coding") {
  // ponytail: superseded by explore-coding.mjs (this wait matched the "Running maximum" title); kept for the old shots.
  const { browser, page, log } = await start("tech", "Live coding");
  await shot(page, `12-coding-${t}-${phase}`);
  await say(page, "coding start");
  const ed = page.locator(".cm-content");
  for (const [lang, loop] of [["JavaScript", "while (true) {}"], ["Python", "while True:\n    pass"]]) {
    await page.getByRole("button", { name: lang, exact: true }).click();
    await ed.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type(lang === "Python" ? `def f(x):\n${loop}` : `function f(x) { ${loop} }`);
    const t0 = Date.now();
    await page.getByRole("button", { name: "Run examples" }).click();
    await page.waitForFunction(() => !document.body.innerText.match(/Loading Python|Running/), null, { timeout: 90000 }).catch(() => console.log("still running after 90s"));
    await page.waitForTimeout(500);
    console.log(`-- ${lang} infinite loop ended after ${Date.now() - t0}ms; status: ${(await page.locator("[role=status]").allInnerTexts()).join(" | ")}; error: ${await page.locator("text=Could not run").count()}`);
    await ed.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type(lang === "Python" ? "x = 1" : "const x = 1;");
    console.log(`-- editor usable after kill: ${(await ed.innerText()).slice(0, 40)}`);
  }
  await shot(page, `13-coding-after-loop-${t}-${phase}`);
  console.log("-- log: " + log.filter((l) => !l.includes("cache-bypass")).join(" || "));
  await browser.close();
}

if (!only || only === "board") {
  const { browser, page, log } = await start("tech", "System design");
  await say(page, "design start");
  const tools = page.getByRole("toolbar", { name: "Board tools" });
  await tools.getByRole("button", { name: "Add box" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  console.log("focused after add: " + (await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName)));
  await page.keyboard.type("Web app");
  await page.keyboard.press("Enter");
  await tools.locator("select").selectOption({ index: 2 });
  await tools.getByRole("button", { name: "Add box" }).click();
  await page.waitForTimeout(300);
  console.log("focused after add 2: " + (await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName)));
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("c");
  await page.waitForTimeout(200);
  console.log("hint: " + (await page.locator("[id$=-hint]").innerText()));
  const boxes = page.locator('svg [aria-label^="Client"], svg [role=button], svg g[tabindex]');
  console.log("box count: " + (await boxes.count()));
  await boxes.first().focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  console.log("arrows section: " + (await page.locator('section[aria-label="Arrows"]').innerText().catch(() => "none")).replace(/\n/g, " | "));
  await page.keyboard.press("Delete");
  await page.waitForTimeout(300);
  console.log("focus after delete: " + (await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName)));
  const dl = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
  await tools.getByRole("button", { name: "Export PNG" }).click();
  console.log("export download: " + ((await dl)?.suggestedFilename() ?? "none"));
  await shot(page, `14-board-${t}-${phase}`);
  await say(page, "board after");
  console.log("-- log: " + log.filter((l) => !l.includes("cache-bypass")).join(" || "));
  await browser.close();
}

if (!only || only === "challenge") {
  const { browser, page, log } = await start("design", "Design challenge");
  await shot(page, `15-challenge-${t}-${phase}`);
  await say(page, "challenge start");
  console.log("-- log: " + log.filter((l) => !l.includes("cache-bypass")).join(" || "));
  await browser.close();
}

if (!only || only === "tracker") {
  const cards = [{ id: "a1", company: "Northwind", role: "Data Intern", link: null, risk: "low", column: "saved", notes: "", createdAt: 1 }];
  const { browser, page, log } = await open({ width, theme, storage: { "is:tracker": JSON.stringify(cards) } });
  await mockApi(page);
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
  await page.waitForTimeout(1000);
  await page.locator("header button").first().click();
  await page.getByRole("button", { name: "My applications" }).click();
  await page.waitForTimeout(500);
  await say(page, "tracker");
  await page.locator("li[tabindex='0']", { hasText: "Northwind" }).first().focus();
  console.log("focused: " + (await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 160))));
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  console.log("after ArrowRight focus: " + (await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 160))));
  await say(page, "tracker after arrow");
  await page.getByLabel("Company").fill("Acme Robotics");
  await page.getByLabel("Role").fill("Hardware Intern");
  await page.getByRole("button", { name: "Add application" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Edit notes" }).first().click();
  await page.waitForTimeout(300);
  await say(page, "tracker notes open");
  await shot(page, `16-tracker-${t}-${phase}`);
  console.log("-- log: " + log.filter((l) => !l.includes("cache-bypass")).join(" || "));
  await browser.close();
}
