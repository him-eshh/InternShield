// T1 screens: resume upload parse preview (PDF + DOCX), screenshot error codes, finance "$1.2 million" feedback.
import { open, mockApi, shot, overflowX, BASE, done, fail, variants, tag } from "./lib.mjs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const only = process.argv[2]; // resume | shot | finance
const dir = mkdtempSync(join(tmpdir(), "is-qa-"));

async function makePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]);
  const lines = [
    ["Jordan Avery", bold, 18], ["jordan.avery@example.com | (555) 010-4477 | github.com/javery", font, 10],
    ["EDUCATION", bold, 12], ["B.S. Computer Science, Lakeview State University, 2027", font, 10],
    ["EXPERIENCE", bold, 12], ["Software Intern, Harborline Analytics (Jun 2025 - Aug 2025)", font, 10],
    ["- Built a Flask API that served 3 internal dashboards", font, 10], ["- Cut report load time from 9 s to 2 s with query caching", font, 10],
    ["- Wrote 40 pytest cases for the billing module", font, 10],
    ["PROJECTS", bold, 12], ["Study Buddy", font, 10], ["- React app that matches classmates by course", font, 10],
    ["SKILLS", bold, 12], ["Python, JavaScript, React, SQL, Git", font, 10],
  ];
  let y = 740;
  for (const [t, f, s] of lines) { page.drawText(t, { x: 54, y, size: s, font: f }); y -= s + 10; }
  const p = join(dir, "jordan-resume.pdf");
  writeFileSync(p, await doc.save());
  return p;
}

async function makeDocx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`);
  zip.file("word/numbering.xml", `<?xml version="1.0" encoding="UTF-8"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`);
  const p = (t) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
  const li = (t) => `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
  const body = [
    p("Sam Okafor"), `<w:p><w:r><w:t>sam.okafor@example.com</w:t></w:r><w:r><w:br/><w:t>(555) 010-3321</w:t></w:r></w:p>`,
    p("EXPERIENCE"), p("Marketing Intern, Bluefern Studio (Summer 2025)"),
    li("Planned 6 campus events with 300+ attendees"), li("Grew the newsletter from 800 to 1,400 readers"),
    p("SKILLS"), p("Excel, Canva, Google Analytics"),
  ].join("");
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  const path = join(dir, "sam-resume.docx");
  writeFileSync(path, await zip.generateAsync({ type: "nodebuffer" }));
  return path;
}

async function makeChatPng(browser, h = 900) {
  const page = await browser.newPage({ viewport: { width: 390, height: h } });
  const msgs = Array.from({ length: Math.round(h / 70) }, (_, i) => `<div class="${i % 2 ? "r" : "l"}">Message ${i + 1}: are you free for a quick call about the internship?</div>`).join("");
  await page.setContent(`<style>body{font:16px system-ui;margin:12px}div{padding:10px;border-radius:14px;margin:8px 0;max-width:75%}.l{background:#eee}.r{background:#2b6cb0;color:#fff;margin-left:auto}</style>${msgs}`);
  const path = join(dir, `chat-${h}.png`);
  await page.screenshot({ path, fullPage: true });
  await page.close();
  return path;
}

async function toResumeStep(page) {
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
  await page.waitForTimeout(800);
  await page.locator("header button").first().click();
  await page.getByRole("button", { name: /Edit/ }).first().click();
  for (let i = 0; i < 3; i++) {
    const c = page.getByRole("button", { name: "Continue" });
    if (await c.count()) await c.click();
    await page.waitForTimeout(200);
  }
}

if (!only || only === "resume") {
  const pdf = await makePdf();
  const docx = await makeDocx();
  for (const v of variants) {
    for (const [kind, file] of [["pdf", pdf], ["docx", docx]]) {
      if (kind === "docx" && v.theme === "dark" && v.width === 1440) continue;
      const { browser, page, log } = await open({ ...v, profile: { field: "tech", level: "junior", skills: [] } });
      await mockApi(page);
      await toResumeStep(page);
      await page.setInputFiles("#resume-file", file);
      await page.getByText(/Read \d+ lines?/).waitFor({ timeout: 15000 });
      await page.getByText(/Read \d+ lines?/).click();
      await shot(page, `01-resume-${kind}-preview-${tag(v)}`);
      console.log(`== resume ${kind} ${tag(v)} overflow ${await overflowX(page)}\n` + (await page.locator("main").innerText()).slice(0, 900));
      console.log("LOG " + log.join(" | "));
      await browser.close();
    }
  }
}

if (!only || only === "shot") {
  const cases = [
    ["partial", () => done({ text: "Hi Alex, thanks for applying.\nAre you free Thursday at 2?\nThe role pays $25/hour." , partial: true })],
    ["rate", () => fail("limit", 429, { code: "RATE_LIMITED", retryAfter: 12 })],
    ["toolarge", () => fail("error", 413, { code: "TOO_LARGE" })],
    ["failed", () => fail("error", 502, { code: "TRANSCRIBE_FAILED" })],
  ];
  for (const v of variants) {
    for (const [name, fn] of cases) {
      if (name !== "partial" && !(v.width === 1440 && v.theme === "light") && !(v.width === 390 && v.theme === "dark")) continue;
      const { browser, page, log } = await open(v);
      await mockApi(page, { transcribe: fn });
      const png = await makeChatPng(browser);
      await page.goto(BASE);
      await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
      await page.waitForTimeout(800);
      await page.setInputFiles("#screenshot-file", png);
      await page.waitForTimeout(1500);
      await shot(page, `02-screenshot-${name}-${tag(v)}`, { fullPage: false });
      console.log(`== screenshot ${name} ${tag(v)} overflow ${await overflowX(page)}: ` + (await page.locator("[role=status]").allInnerTexts()).join(" / "));
      console.log("LOG " + log.join(" | "));
      await browser.close();
    }
  }
}

if (!only || only === "finance") {
  for (const v of [...variants, { width: 1440, theme: "light", reducedMotion: "reduce" }]) {
    const { browser, page, log } = await open({ ...v, profile: { field: "finance", level: "junior", skills: [] } });
    await mockApi(page, {
      interview: (b) => b.ask === "feedback"
        ? done({ text: null, feedback: { summary: "Solid structure. Check units.", items: b.turns.map((tt, i) => ({ index: i, strength: "You answered directly.", improve: "State the unit.", quote: tt.answer.split(/[.;]/)[0], star: null })) } })
        : done({ text: "Follow-up: walk me through it.", feedback: null }),
    });
    await page.goto(BASE);
    await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
    await page.waitForTimeout(800);
    await page.locator("header button").first().click();
    await page.getByRole("button", { name: "Practice an interview" }).click();
    await page.locator("label", { hasText: /finance|technical/i }).first().click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.waitForTimeout(600);
    for (let i = 0; i < 6; i++) {
      const box = page.locator("#iv-answer");
      if (!(await box.count())) break;
      await box.fill(i === 0 ? "I think around $1.2 million." : "$1.2 million");
      await page.getByRole("button", { name: "Send answer" }).click();
      await page.waitForTimeout(600);
    }
    const fin = page.getByRole("button", { name: /End and get feedback|Get my feedback/ });
    if (await fin.count()) await fin.first().click();
    await page.waitForTimeout(1200);
    const t = v.reducedMotion ? `${tag(v)}-reduced` : tag(v);
    await shot(page, `03-finance-feedback-${t}`);
    const body = await page.locator("main").innerText();
    console.log(`== finance ${t} overflow ${await overflowX(page)} has1.2M%=${body.includes("1,200,000%")}\n` + body.slice(0, 1500));
    console.log("LOG " + log.join(" | "));
    await browser.close();
  }
}
