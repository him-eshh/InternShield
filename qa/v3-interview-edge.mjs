// Extra browser checks for real TypeScript, round-count mode, custom wording, caps and limited intel.
import assert from "node:assert/strict";
assert.match(process.env.QA_BASE ?? "", /^http:\/\/(localhost|127\.0\.0\.1):32\d\d$/);
const { open, mockApi, BASE, done } = await import("./lib.mjs");
const js = {
 "count-vowels": "function count_vowels(s: string): number { return [...s].filter(c => 'aeiou'.includes(c.toLowerCase())).length; }",
 "reverse-words": "function reverse_words(s: string): string { return s.trim().split(/\\s+/).filter(Boolean).reverse().join(' '); }",
 "two-sum": "function two_sum(nums: number[], target: number): number[] { for(let i=0;i<nums.length;i++) for(let j=i+1;j<nums.length;j++) if(nums[i]+nums[j]===target) return [i,j]; return []; }",
 "running-max": "function running_max(nums: number[]): number[] { return nums.map((_,i)=>Math.max(...nums.slice(0,i+1))); }",
 "group-anagrams": "function group_anagrams(words: string[]): string[][] { const g: Record<string,string[]>={}; for(const w of words) (g[[...w].sort().join('')]??=[]).push(w); return Object.values(g).map(a=>a.sort()).sort((a,b)=>a[0].localeCompare(b[0])); }",
};
async function setup(opts = {}) {
 const s = await open({ width: 390, theme: "dark", reducedMotion: "reduce", ...opts });
 await mockApi(s.page, { intel: (b) => done({ company: b.company, cached: false, limited: true, sources: [] }), interview: (b) => b.ask === "hint" ? done({ text: "Check an empty input first.", feedback: null }) : done({ text: null, feedback: { summary: "Good start", items: [{ index: b.turns.length-1, strength: "Clear reasoning", improve: "Name an edge case", quote: "", star: { situation: true, task: true, action: true, result: true } }] }, level: "ok", followUp: null }) });
 await s.page.goto(BASE + "/practice", { waitUntil: "load", timeout: 90000 });
 await s.page.getByRole("button", { name: "Start session", exact: true }).waitFor();
 return s;
}
async function editor(page, code) { const cm=page.locator(".cm-content").first(); await cm.waitFor(); await cm.click(); await page.keyboard.press("Control+a"); await page.keyboard.insertText(code); }
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("is:practice-active")));
{
 const { browser, page } = await setup();
 try {
  await page.getByRole("button", { name: "Behavioral", exact: true }).click();
  await page.getByRole("button", { name: "SQL", exact: true }).click();
  await page.getByLabel("Language", { exact: true }).selectOption("typescript");
  await page.getByLabel("Session length", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Start session", exact: true }).click();
  await page.getByRole("button", { name: "TypeScript", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "TypeScript", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.getByRole("button", { name: "JavaScript", exact: true }).count(), 0);
  const s=await state(page); await editor(page, js[s.activeQuestion.item.problemId]);
  await page.getByRole("button", { name: "Ask for a hint", exact: true }).click();
  await page.getByText("Check an empty input first.").first().waitFor();
  assert.equal((await state(page)).calls, 1, "hint call count survives panel callbacks");
  assert.equal((await state(page)).activeQuestion.hints.length, 1);
  await page.locator("#coding-approach").fill("I use one pass with O(n) time and check empty input and repeated values before submitting the result.");
  await page.reload(); await page.getByRole("button", { name: "Resume session" }).click();
  await page.locator(".cm-content").first().waitFor();
  assert.ok((await page.locator(".cm-content").first().innerText()).includes("function"), "code draft survives refresh");
  assert.ok((await page.locator("#coding-approach").inputValue()).includes("one pass"), "approach survives refresh");
  await page.getByRole("button", { name: "Run examples", exact: true }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).and(page.locator(":enabled")).waitFor({timeout:60000});
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Finish and get feedback", exact: true }).and(page.locator(":enabled")).waitFor({timeout:60000});
  const graded=(await state(page)).activeQuestion.inner.code; assert.equal(graded.language,"typescript"); assert.equal(graded.passed,graded.total);
  await page.getByRole("button", { name: "Finish and get feedback", exact: true }).click();
  await page.getByRole("button", { name: "View summary", exact: true }).click();
  await page.getByRole("heading", { name: "Keep the momentum." }).waitFor();
  const summary=await page.evaluate(()=>JSON.parse(localStorage.getItem("is:practice-history"))[0].summary);
  assert.equal(summary.turns[0].hintsUsed,1); assert.equal(summary.turns[0].code.language,"typescript");
  console.log("PASS real TypeScript, chosen language, hint note/call count and single-question end");
 } finally { await browser.close(); }
}
{
 const { browser, page }=await setup();
 try {
  await page.getByRole("button", {name:"Live coding",exact:true}).click(); await page.getByRole("button",{name:"SQL",exact:true}).click();
  await page.getByLabel("Session length",{exact:true}).fill("2"); await page.getByLabel("Count by").selectOption("rounds");
  await page.getByRole("button",{name:"Start session",exact:true}).click();
  for(let i=1;i<=6;i++) {
   await page.getByRole("heading",{name:`Question ${i} of 6`,exact:true}).waitFor();
   await page.getByLabel("Your answer",{exact:true}).fill("I led the project with two classmates, measured the latency, and reduced response time 30 percent by testing one change at a time.");
   await page.getByRole("button",{name:"Get feedback",exact:true}).click(); await page.getByRole("button",{name:i===6?"View summary":"Next question",exact:true}).click();
  }
  await page.getByRole("heading",{name:"Keep the momentum."}).waitFor();
  const result=await page.evaluate(()=>JSON.parse(localStorage.getItem("is:practice-history"))[0].summary);
  assert.equal(result.answered,6); assert.equal(result.config.limit.kind,"rounds"); assert.equal(result.config.limit.count,2);
  assert.equal(new Set(result.turns.map(t=>t.question)).size,6);
  console.log("PASS two rounds auto-end at six questions, no repeats");
 } finally { await browser.close(); }
}
{
 const {browser,page}=await setup();
 try {
  await page.getByLabel(/Company/).fill("Amazon"); await page.getByRole("button",{name:"Research company"}).click();
  await page.getByText(/Research is unavailable. Using Amazon-style/).waitFor();
  await page.getByLabel(/Company/).fill("");
  const custom="  What trade-off did you make?  "; await page.getByLabel(/Your questions/).fill(custom); await page.getByLabel("Session length",{exact:true}).fill("1");
  await page.getByRole("button",{name:"Start session",exact:true}).click();
  assert.equal((await state(page)).activeQuestion.item.question,custom);
  await page.getByRole("button",{name:/Hint/}).click();
  assert.equal((await state(page)).activeQuestion.hints.length,1);
  // Resume a valid state at the free-tier cap; the UI must finish without another model request.
  await page.evaluate(()=> {const s=JSON.parse(localStorage.getItem("is:practice-active"));s.calls=30;localStorage.setItem("is:practice-active",JSON.stringify(s));});
  await page.reload(); await page.getByRole("button",{name:"Resume session"}).click();
  await page.getByLabel("Your answer",{exact:true}).fill("I chose a simpler design to ship a working version first.");
  await page.getByRole("button",{name:"Get feedback",exact:true}).click();
  await page.getByText(/30 AI calls/).waitFor(); await page.getByRole("button",{name:"View summary",exact:true}).click();
  await page.getByRole("heading",{name:"Keep the momentum."}).waitFor();
  console.log("PASS limited intel/preset fallback, custom wording, hint note, capped offline completion");
 } finally {await browser.close();}
}
