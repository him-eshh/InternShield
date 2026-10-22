// Text interview rounds end to end with a mocked /api/interview.
import { open, mockApi, shot, overflowX, BASE, done } from "./lib.mjs";

const width = Number(process.argv[2] ?? 1440);
const theme = process.argv[3] ?? "light";
const phase = process.argv[4] ?? "before";
const only = process.argv[5];
const t = `${width}-${theme}`;

const ANSWERS = {
  recruiter: ["I like building tools people use every day, and this team ships fast.", "I want to grow as a backend engineer.", "Next summer, full time."],
  behavioral: [
    "In my data structures class our group project was behind. I was asked to fix the build. I wrote a test script and split tasks. We shipped on time and got an A.",
    "I disagreed with a teammate once and we talked it through.",
    "I led a club event for 80 students; I booked rooms and we raised $400.",
  ],
  case: ["I'd look at the number of students, how many drink coffee, and cups per day.", "About 4,000 cups a day", "Revenue would be about $12,000 a day."],
  finance: ["$1.2 million", "1.2M", "$1,200,000", "Revenue minus cost of goods sold"],
  portfolio: ["My strongest project is a campus map redesign; I ran 5 user interviews.", "I'd change the color contrast.", "I used Figma and tested with paper prototypes."],
};
const FIELD = { recruiter: "tech", behavioral: "tech", case: "business", finance: "finance", portfolio: "design" };
const LABEL = { recruiter: "Recruiter screen", behavioral: "Behavioral", case: /case/i, finance: /finance|technical/i, portfolio: /portfolio/i };

for (const round of Object.keys(ANSWERS)) {
  if (only && only !== round) continue;
  const { browser, page, log } = await open({ width, theme, profile: { field: FIELD[round], level: "junior", skills: [] } });
  await mockApi(page, {
    interview: (b) => {
      if (b.ask === "feedback")
        return done({
          text: null,
          feedback: {
            summary: "Clear answers overall. Add a number to show impact.",
            items: b.turns.map((tt, i) => ({ index: i, strength: "You answered directly.", improve: "Say what changed because of you.", quote: tt.answer.split(/[.;]/)[0], star: null })),
          },
        });
      return done({ text: `Follow-up ${b.turns.length + 1}: what would you do differently?`, feedback: null });
    },
  });
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Is this offer real?" }).waitFor();
  await page.waitForTimeout(1000);
  await page.locator("header button").first().click();
  await page.getByRole("button", { name: "Practice an interview" }).click();
  await page.getByRole("heading", { name: "Practice an interview" }).waitFor();
  console.log(`\n######## ${round}\n== setup\n` + (await page.locator("main").innerText()));
  await page.getByRole("radio", { name: LABEL[round] }).first().check({ force: true });
  if (round === "portfolio") {
    const links = page.getByPlaceholder("One link per line");
    if (await links.count()) await links.fill("https://example.com/alex-portfolio\nhttps://dribbble.example/alex");
  }
  await page.getByRole("button", { name: "Start" }).click();
  await page.waitForTimeout(600);
  await shot(page, `10-interview-${round}-${t}-${phase}`);
  for (const a of ANSWERS[round]) {
    const box = page.locator("#iv-answer");
    if (!(await box.count())) break;
    console.log("Q: " + (await page.locator("main").innerText()).split("\n").slice(0, 8).join(" | "));
    await box.fill(a);
    await page.getByRole("button", { name: "Send answer" }).click();
    await page.waitForTimeout(700);
  }
  const fin = page.getByRole("button", { name: /End and get feedback|Get my feedback/ });
  if (await fin.count()) await fin.first().click();
  await page.waitForTimeout(1200);
  await shot(page, `11-feedback-${round}-${t}-${phase}`);
  console.log(`== feedback (overflow ${await overflowX(page)})\n` + (await page.locator("main").innerText()));
  console.log("== LOG\n" + log.filter((l) => !l.includes("cache-bypass")).join("\n"));
  await browser.close();
}
