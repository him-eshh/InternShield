// T6: tailor (keyword gap panel, options collapsed/open, 3 options with a warning + held back, blocked-from-posting).
import { open, mockApi, shot, overflowX, BASE, done, variants, tag } from "../lib.mjs";

const RESUME = {
  fileName: "alex-resume.pdf",
  text: "Alex Rivera\nalex@example.com | (555) 010-2000\n\nEXPERIENCE\nSoftware Intern, Lumen Labs (Jun 2025 - Aug 2025)\n- Helped build a React dashboard used by 40 analysts\n- Wrote JavaScript tests for the billing page\n\nSKILLS\nPython, React, SQL",
};
const POSTING = "Requirements:\nReact and TypeScript\nPython\nREST APIs\nGit\nNice to have:\nDocker\nAWS";
const reply = (body) =>
  done(
    body.text.startsWith("Helped")
      ? {
          text: "Helped build a React dashboard for 40 analysts",
          options: [
            "Helped build a React dashboard for 40 analysts",
            "Led a React dashboard build used by 40 analysts",
            "Built a React and TypeScript dashboard used by 40 analysts",
          ],
          heldBack: ["TypeScript", "REST APIs"],
        }
      : { text: "Wrote TypeScript and Docker tests for the billing page", options: ["Wrote TypeScript and Docker tests for the billing page"], heldBack: [] },
  );

for (const v of variants) {
  const t = tag(v);
  const { browser, page, log } = await open({ ...v, resume: RESUME, profile: { field: "tech", level: "junior", skills: ["Python"] } });
  await mockApi(page, { rewrite: reply });
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
  await page.waitForTimeout(800);
  await page.locator("header button").first().click();
  await page.getByRole("button", { name: "Tailor my resume" }).click();
  await page.getByRole("heading", { name: "Tailor your resume" }).waitFor();
  await page.locator("#tl-role").fill("Frontend Intern");
  await page.locator("#tl-desc").fill(POSTING);
  await page.waitForTimeout(400);
  console.log(`== gap ${t} overflow ${await overflowX(page)} "${await page.locator("#tl-gap + p").innerText()}"`);
  await shot(page, `11-tailor-gap-${t}`);

  await page.getByRole("button", { name: /I have this\s*: Git/ }).click();
  await page.getByRole("button", { name: /Leave out\s*: AWS/ }).click();
  await page.locator("summary").click();
  await page.waitForTimeout(300);
  console.log(`== options ${t} overflow ${await overflowX(page)} "${await page.locator("#tl-gap + p").innerText()}"`);
  await shot(page, `11-tailor-options-${t}`);
  await page.locator("summary").click();

  await page.getByRole("button", { name: /Helped build a React/ }).click();
  await page.getByRole("button", { name: "Suggest a rewrite" }).click();
  await page.getByRole("radiogroup").waitFor();
  console.log(`== three ${t} radios ${await page.getByRole("radio").count()} overflow ${await overflowX(page)}`);
  await page.getByRole("radiogroup").scrollIntoViewIfNeeded();
  await shot(page, `11-tailor-three-${t}`);
  await page.getByRole("button", { name: "Use this option" }).click();
  await page.waitForTimeout(300);
  console.log(`== accepted ${t} bar "${await page.locator("p", { hasText: /^\d+ changes?$/ }).innerText()}"`);
  await shot(page, `11-tailor-accepted-${t}`);

  await page.getByRole("button", { name: /Wrote JavaScript tests/ }).click();
  await page.getByRole("button", { name: "Suggest a rewrite" }).click();
  await page.getByText("from the posting, not your resume").waitFor();
  console.log(`== blocked ${t} overflow ${await overflowX(page)}`);
  await shot(page, `11-tailor-blocked-${t}`);
  console.log(`== LOG ${t}\n` + log.filter((l) => !l.includes("cache-bypass")).join("\n"));
  await browser.close();
}
