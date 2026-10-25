// Mocked interview/intel end-to-end QA. Must run only in the interview worktree port range.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
assert.match(process.env.QA_BASE ?? "", /^http:\/\/(localhost|127\.0\.0\.1):32\d\d$/);
assert.ok(process.env.QA_SHOTS, "Set the interview QA_SHOTS directory");
const { open, mockApi, shot: capture, overflowX, BASE, done, variants, tag } = await import("./lib.mjs");
const all = process.argv.includes("--matrix");
async function shot(page, name) {
  await page.addStyleTag({ content: "nextjs-portal { display:none !important }" });
  await capture(page, name);
}
const sqlSource = readFileSync("lib/tiers/sql.ts", "utf8");
const sql = Object.fromEntries([...sqlSource.matchAll(/id: "([^"]+)"[\s\S]*?reference:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
const py = {
  "count-vowels": "def count_vowels(s):\n    return sum(c.lower() in 'aeiou' for c in s)",
  "reverse-words": "def reverse_words(s):\n    return ' '.join(reversed(s.split()))",
  "two-sum": "def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1,len(nums)):\n            if nums[i]+nums[j]==target: return [i,j]",
  "running-max": "def running_max(nums):\n    return [max(nums[:i+1]) for i in range(len(nums))]",
  "group-anagrams": "def group_anagrams(words):\n    groups={}\n    for w in words: groups.setdefault(''.join(sorted(w)),[]).append(w)\n    return sorted([sorted(g) for g in groups.values()], key=lambda g:g[0])",
};
async function edit(page, code) {
  const editor = page.locator(".cm-content").first();
  await editor.waitFor({ timeout: 60000 });
  await editor.click(); await page.keyboard.press("Control+a"); await page.keyboard.insertText(code);
}
const getState = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("is:practice-active")));
const answer = "I owned the dashboard rollout. I interviewed five users, shipped a simpler view with the team, and reduced lookup time by 30 percent. I verified the result with usage logs and would measure adoption earlier next time.";
for (const v of all ? variants : [variants[0]]) {
  const t = tag(v); const { browser, page, log } = await open({ ...v, reducedMotion: "reduce" });
  const calls = await mockApi(page, {
    intel: (body) => done({ company: body.company, cached: true, interview: { rounds: ["Coding", "Behavioral", "SQL"], notes: ["Explain decisions and test edge cases."] }, values: ["Ownership"], sources: [{ label: "Official careers", url: "https://example.com/careers" }] }),
    interview: (body) => body.ask === "hint" ? done({ text: "Try an empty input and state the complexity.", feedback: null }) : done({ text: null, feedback: { summary: "Clear approach.", items: [{ index: body.turns.length - 1, strength: "You explained your own action and checked the result.", improve: "Name one edge case and quantify the trade-off.", quote: "", star: { situation: true, task: true, action: true, result: true } }] }, level: "strong", followUp: body.followUpsLeft === 2 ? "How would your approach change at ten times the scale?" : null }),
  });
  try {
    await page.goto(BASE + "/practice", { waitUntil: "load", timeout: 90000 });
    await page.getByRole("button", { name: "Start session", exact: true }).waitFor();
    await page.addStyleTag({ content: "nextjs-portal { display:none !important }" });
    await shot(page, `v3-interview-setup-${t}`);
    await page.getByLabel(/Company/).fill("Acme");
    await page.getByRole("button", { name: "Research company" }).click();
    await page.getByRole("link", { name: /Official careers/ }).waitFor();
    assert.equal(await page.getByRole("button", { name: "SQL", exact: true }).getAttribute("aria-pressed"), "true");
    await shot(page, `v3-interview-intel-${t}`);
    // Company filtering would intentionally choose bank discussion; clear it for runnable coverage.
    await page.getByLabel(/Company/).fill("");
    await page.getByRole("button", { name: "Start session", exact: true }).click();
    for (let i = 1; i <= 5; i++) {
      await page.getByRole("heading", { name: `Question ${i} of 5`, exact: true }).waitFor();
      const s = await getState(page); const item = s.activeQuestion.item;
      if (i === 1) {
        await page.locator(".cm-content").first().waitFor();
        await page.locator('textarea[aria-label*="code editor"]').waitFor({ state: "hidden" });
        await shot(page, `v3-interview-coding-${t}`);
      }
      if (item.kind === "code" || item.kind === "sql") {
        await edit(page, item.kind === "sql" ? sql[item.problemId] : py[item.problemId]);
        await page.locator(item.kind === "sql" ? "#sql-approach" : "#coding-approach").fill("Use one pass where possible, verify empty inputs and explain time and space complexity.");
        await page.getByRole("button", { name: "Submit", exact: true }).click();
        const finish = page.getByRole("button", { name: "Finish and get feedback", exact: true });
        await finish.waitFor(); await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Finish and get feedback") && !b.disabled), null, { timeout: 90000 });
        const graded = await getState(page);
        assert.equal(graded.activeQuestion.inner.code.passed, graded.activeQuestion.inner.code.total, "real runnable tests pass");
        await finish.click();
      } else {
        await page.getByLabel("Your answer", { exact: true }).fill(answer);
        await page.getByRole("button", { name: "Get feedback", exact: true }).click();
      }
      await page.getByRole("heading", { name: /Code review|SQL review|Answer feedback/ }).waitFor();
      if (i === 1) { await shot(page, `v3-interview-feedback-${t}`); await shot(page, `v3-interview-followup-${t}`); }
      if (i === 2) {
        await page.getByLabel("Your follow-up answer").fill("My in-progress follow-up draft");
        const before = await getState(page);
        await page.reload(); await page.getByRole("button", { name: "Resume session" }).click();
        assert.deepEqual((await getState(page)).activeQuestion.followUps, before.activeQuestion.followUps);
        assert.equal(await page.getByLabel("Your follow-up answer").inputValue(), "My in-progress follow-up draft");
      }
      await page.getByLabel("Your follow-up answer").fill("I would profile the bottleneck, test with ten times the data, and compare latency before scaling capacity.");
      await page.getByRole("button", { name: "Answer follow-up", exact: true }).click();
      const next = page.getByRole("button", { name: i === 5 ? "View summary" : "Next question", exact: true });
      await next.waitFor();
      if (i === 3) await shot(page, `v3-interview-progress-${t}`);
      assert.equal(await overflowX(page), 0, `no overflow at question ${i}`);
      await next.click();
    }
    await page.getByRole("heading", { name: "Keep the momentum." }).waitFor();
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem("is:practice-history")));
    assert.equal(history[0].summary.turns.length, 5);
    assert.equal(new Set(history[0].summary.turns.map((x) => x.question)).size, 5);
    assert.equal(history[0].summary.answered, 5);
    assert.equal(new Set(history[0].summary.next).size, history[0].summary.next.length, "next drills are distinct");
    assert.equal(history[0].summary.rounds.find((r) => r.round === "sql").axes.find((a) => a.id === "coding").label, "Query correctness");
    assert.ok(calls.filter((c) => c.name === "interview").length <= 15);
    await shot(page, `v3-interview-summary-${t}`);
    await page.getByRole("button", { name: "Back to Practice", exact: true }).click();
    await page.getByRole("heading", { name: "Past sessions" }).scrollIntoViewIfNeeded();
    await shot(page, `v3-interview-history-${t}`);
    await page.getByRole("button", { name: "Start session", exact: true }).click();
    await page.locator(".cm-content").first().waitFor();
    await page.locator('textarea[aria-label*="code editor"]').waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "End session", exact: true }).click();
    await page.getByRole("alertdialog").waitFor(); await shot(page, `v3-interview-end-confirm-${t}`);
    await page.getByRole("button", { name: "End and view summary" }).click();
    await page.getByText("Session saved", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("is:practice-history"))[0].summary.endedEarly), true);
    if (v.width === 390) { await page.setViewportSize({ width: 320, height: 900 }); assert.equal(await overflowX(page), 0); }
    assert.equal(log.filter((s) => s.startsWith("pageerror:")).length, 0, log.join("\n"));
    console.log(`PASS ${t}: five answers, real Python/SQL, follow-ups, reload, summary/history, early stop; API calls ${calls.length}`);
  } finally { await browser.close(); }
}

