// I3: a11y + reduced motion across screens. Per screen and theme: text contrast < 4.5 (rendered colors), unnamed controls,
// Tab walk (focus visible on every stop), live regions. Then Escape on menus and a reduced-motion report shot.
import "./v2-integration-env.mjs";
const { open, mockApi, shot, BASE } = await import("../lib.mjs");

const RESUME = { text: "Sam Lee\nsam@example.com\nEDUCATION\nState University, B.S. Computer Science, 2027\nEXPERIENCE\n- Built a course planner in React used by 40 students\n- Wrote Python scripts to clean lab data\nSKILLS\nPython, React, SQL", fileName: "resume.pdf" };

/** In-page audit. Canvas converts any CSS color (oklch etc.) to sRGB. */
function audit() {
  const cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = "#000"; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const v = rgba(c); if (v[3] > 0.5) return v; } return rgba(getComputedStyle(document.body).backgroundColor); };
  const low = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!el.checkVisibility?.() || el.closest("[aria-hidden=true], nextjs-portal, .sr-only, svg, .cm-editor")) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const s = getComputedStyle(el);
    if (parseFloat(s.opacity) < 1 || el.closest("[disabled], [aria-disabled=true]")) continue;
    const fg = rgba(s.color); const bg = bgOf(el);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const ratio = (a + 0.05) / (b + 0.05);
    const big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5)) low.push(`${ratio.toFixed(2)} "${el.textContent.trim().slice(0, 30)}"`);
  }
  const unnamed = [];
  for (const el of document.querySelectorAll("button, a[href], input:not([type=hidden]), textarea, select, [role=button], [role=tab], [role=menuitem]")) {
    if (!el.checkVisibility?.() || el.closest("nextjs-portal")) continue;
    const id = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    const name = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.textContent.trim() || el.title || id || el.closest("label") || el.getAttribute("alt");
    if (!name) unnamed.push(el.outerHTML.slice(0, 80));
  }
  return { low: [...new Set(low)].slice(0, 8), unnamed: unnamed.slice(0, 5), live: document.querySelectorAll("[aria-live], [role=status], [role=alert]").length };
}

async function tabWalk(page, max = 60) {
  const bad = [];
  let stops = 0;
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el.closest("nextjs-portal")) return null;
      const s = getComputedStyle(el);
      const visible = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
      return { visible, d: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 25)}"` };
    });
    if (!r) continue;
    stops++;
    if (!r.visible) bad.push(r.d);
  }
  return { stops, noFocusRing: [...new Set(bad)].slice(0, 6) };
}

const screens = {
  intro: { profile: false, go: async () => {} },
  check: { go: async () => {} },
  "report-scam": { go: async (p) => { await p.getByRole("button", { name: "a scam", exact: true }).click(); await p.locator("article").waitFor({ timeout: 15000 }); } },
  "report-real": { go: async (p) => { await p.getByRole("button", { name: "a real one", exact: true }).click(); await p.locator("article").waitFor({ timeout: 15000 }); } },
  tracker: { go: async (p) => { await p.getByRole("button", { name: /Tech/ }).first().click(); await p.getByRole("button", { name: "My applications", exact: true }).click(); } },
  tailor: { resume: RESUME, go: async (p) => { await p.getByRole("button", { name: /Tech/ }).first().click(); await p.getByRole("button", { name: "Tailor my resume", exact: true }).click(); } },
  interview: { go: async (p) => { await p.getByRole("button", { name: /Tech/ }).first().click(); await p.getByRole("button", { name: "Practice an interview", exact: true }).click(); } },
  profile: { profile: false, go: async (p) => { await p.locator("main button").first().click(); await p.getByRole("button", { name: "Add profile" }).click(); } },
};

const only = process.argv[2]?.split(",");
for (const theme of ["light", "dark"]) {
  for (const [name, s] of Object.entries(screens)) {
    if (only && !only.includes(name)) continue;
    const { browser, page, log } = await open({ width: 1440, theme, profile: s.profile ?? true, resume: s.resume ?? null });
    await mockApi(page);
    await page.goto(BASE);
    try {
      await s.go(page);
      await page.waitForTimeout(1200);
      const a = await page.evaluate(audit);
      const t = await tabWalk(page);
      console.log(`${name} ${theme}: lowContrast=${JSON.stringify(a.low)} unnamed=${JSON.stringify(a.unnamed)} live=${a.live} tabStops=${t.stops} noRing=${JSON.stringify(t.noFocusRing)} errors=${log.filter((l) => !/cache|503/i.test(l)).join(" | ") || "none"}`);
    } catch (e) {
      console.log(`${name} ${theme}: FAILED ${e.message.slice(0, 160)}`);
      await shot(page, `99-a11y-${name}-${theme}`, { fullPage: false });
    }
    await browser.close();
  }
}

// Escape closes the profile menu and returns focus to its button.
{
  const { browser, page } = await open();
  await mockApi(page);
  await page.goto(BASE);
  const btn = page.getByRole("button", { name: /Tech/ }).first();
  await btn.focus();
  await page.keyboard.press("Enter");
  const opened = await btn.getAttribute("aria-expanded");
  await page.keyboard.press("Escape");
  const closed = await btn.getAttribute("aria-expanded");
  const back = await btn.evaluate((el) => el === document.activeElement);
  console.log(`profile menu: opened=${opened} afterEsc=${closed} focusReturned=${back}`);
  await browser.close();
}

// Reduced motion: the report shows everything at once, nothing animating.
for (const theme of ["light", "dark"]) {
  const { browser, page } = await open({ theme, reducedMotion: "reduce" });
  await mockApi(page);
  await page.goto(BASE);
  await page.getByRole("button", { name: "a scam", exact: true }).click();
  await page.locator("article").waitFor({ timeout: 15000 });
  await page.waitForTimeout(100);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").map((a) => a.animationName || a.constructor.name).slice(0, 5));
  const hidden = await page.evaluate(() => [...document.querySelectorAll("main *")].filter((e) => getComputedStyle(e).opacity === "0" && e.textContent.trim()).length);
  console.log(`reduced-motion report ${theme}: running=${JSON.stringify(running)} opacity0WithText=${hidden}`);
  await page.screenshot({ path: `${process.env.QA_SHOTS}/70-reduced-motion-report-instant-1440-${theme}.png`, fullPage: true });
  await browser.close();
}
