// T2: tall screenshots are cut into <= 2 strips (one request), every made-up line comes back once.
import { open, mockApi, shot, overflowX, BASE, done, variants, tag } from "../lib.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "is-qa-"));

async function makeChat(browser, name, n, paragraphs = false, deviceScaleFactor = 1) {
  const page = await browser.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor });
  const msg = (i) =>
    paragraphs && i % 3 === 0
      ? `Line ${i}: Hi, this is Jordan from Northwind.<br><br>We reviewed your profile and liked it.<br><br>Reply with a time.`
      : `Line ${i}: are you free for a quick call about the internship?`;
  const html = Array.from({ length: n }, (_, i) => `<div class="${i % 2 ? "r" : "l"}">${msg(i + 1)}</div>`).join("");
  await page.setContent(`<style>body{font:16px system-ui;margin:12px}div{padding:10px;border-radius:14px;margin:8px 0;max-width:75%}.l{background:#eee}.r{background:#2b6cb0;color:#fff;margin-left:auto}</style>${html}`);
  const path = join(dir, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.close();
  return { path, h };
}

const sizes = (urls) => Promise.all(urls.map((u) => new Promise((r) => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = u; })));

for (const v of variants) {
  if (!(v.width === 1440 && v.theme === "light") && !(v.width === 390 && v.theme === "dark")) continue;
  const { browser, page, log } = await open(v);
  const cases = [
    ["short", 10, false],
    ["tall", 60, false],
    ["paragraphs", 50, true],
    ["toolong", 260, false],
    ["phone3x", 30, true, 3],
  ];
  for (const [name, n, para, dsf] of cases) {
    const chat = await makeChat(browser, `${name}-${tag(v)}`, n, para, dsf);
    let sent = null;
    await mockApi(page, {
      transcribe: (body) => {
        sent = body;
        return done({ text: `Line 1: transcribed ${name}` });
      },
    });
    await page.goto(BASE);
    await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
    await page.waitForTimeout(600);
    await page.setInputFiles("#screenshot-file", chat.path);
    await page.waitForTimeout(2500);
    const strips = sent ? (sent.images ?? [sent.image]) : [];
    const dims = strips.length ? await page.evaluate(sizes, strips) : [];
    const bytes = strips.reduce((a, s) => a + s.length, 0);
    console.log(`== ${name} ${tag(v)} png ${chat.h}px -> strips ${JSON.stringify(dims)} bytes ${bytes} overflow ${await overflowX(page)} status: ${(await page.locator("[role=status]").allInnerTexts()).join(" / ")}`);
    await shot(page, `04-screenshot-${name}-${tag(v)}`, { fullPage: false });
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
  console.log("LOG " + log.join(" | "));
  await browser.close();
}
