---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (chosen by Himesh; overnight parallel build per `devpost/build-orchestration.md`)

## Slices

- [x] **1. Scaffold, contracts, and a stub flow that shows a report**
  Becomes usable: `npm run dev` opens a page where "Try an example: a scam / a real one" runs the five stub API routes in relay order and renders a report object.
  Why now: Every worker builds against the same contracts in parallel, so the shapes (facts, step results, flags, report, API bodies), theme tokens, examples, and dependencies have to exist and compile first.
  PRD ref: `prd.md > The Core Journey` (steps 3-5), `prd.md > Message Input and Auto-fill` (examples)
  Spec ref: `spec.md > Stack`, `spec.md > File Structure`, `spec.md > Data Model`, `spec.md > Look and Feel`, `spec.md > Example Snapshots`
  Build: Scaffold Next.js App Router + TS + Tailwind + ESLint, install every dependency, write `lib/types.ts`, `lib/constants.ts`, `lib/quotes.ts`, `lib/examples.ts`, `fixtures/reports.ts`, theme tokens and no-flash theme script, stub routes returning saved example results, `.env.example`, `CLAUDE.md` ownership map.
  Verify (mechanical): lint, `tsc --noEmit`, `vitest run`, `npm run build` pass; `curl` POSTs to `/api/extract` and `/api/explain` on a running server return `{ status: "done" }` bodies.
  Learner check: Run `npm run dev`, open http://localhost:3000, click "Try an example: a scam", and see a report appear (raw data at this stage).
  Commit: `Slice 1: scaffold and contracts`

- [x] **2. The scoring engine decides the risk level, proven by a labeled test set**
  Becomes usable: `score()` turns facts and step results into a 0-100 risk score, level, grouped flags, Couldn't-check list, coverage, and quick questions; `npm run eval` prints the results table for ~25 labeled messages.
  Why now: This is the unique kernel ("fixed rules score them"). Building it first means the UI and routes plug into the real thing, and bad weights show up early.
  PRD ref: `prd.md > Risk Scoring`, `prd.md > Finding Missing Details and Quick Questions`, `prd.md > Fact Extraction and Safety Rules`, `prd.md > Test Set`
  Spec ref: `spec.md > Scoring Engine`, `spec.md > Quote Check`, `spec.md > Data Model`, `spec.md > Test Set and Eval`
  Build: `lib/scoring/*` (score, rules, backstop, domains, patterns, level, questions, coverage), `eval/messages/*.json`, `eval/run.ts`, `eval/live.ts`, vitest tests.
  Verify (mechanical): `npx vitest run` passes, including injection case, critical floor 85, green-credit cap, hiring-platform email, both examples in their expected levels; `npm run eval` prints the table.
  Learner check: Run `npm run eval` and read the table: do the expected and got columns agree, and do the top flags make sense?
  Commit: `Slice 2: scoring engine and test set`

- [x] **3. Server routes do the outside checks safely (mocked)**
  Becomes usable: The five API routes call Groq, Tavily, RDAP, DNS and Hunter through `lib/server`, with origin/size/per-visitor/daily caps, caching, timeouts, and model fallback, all proven against mocks.
  Why now: The routes are the only place keys live and the main cost/abuse risk; locking the guard and failure mapping down before live keys touch them keeps the free tiers safe.
  PRD ref: `prd.md > Fact Extraction and Safety Rules`, `prd.md > Sender and Website Checks`, `prd.md > Real-Posting Lookup`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Extract Route`, `spec.md > Model Fallback`, `spec.md > Token Budget`, `spec.md > Company Route`, `spec.md > Sender Route`, `spec.md > Posting Route`, `spec.md > Explain Route`, `spec.md > Usage Guard`, `spec.md > External Services and Dependencies`
  Build: `lib/server/*` (guard, cache, groq, extractSchema, tavily, rdap, dns, hunter), the five routes, `lib/explainFallback.ts`, mocked vitest tests.
  Verify (mechanical): `npx vitest run` passes route tests with mocked fetch/SDKs (quote drop, 429 fallback, caps, origin reject, timeout → failed); gates pass.
  Learner check: Read `lib/server/guard.ts` and confirm the limits match what you agreed (3/min, 20/day, 120 checks/day, 80 searches/day).
  Commit: `Slice 3: server routes with limits and caps`

- [x] **4. Every screen works on fixtures**
  Becomes usable: Intro → profile steps → check form with auto-fill → live checklist → full report (ring, quick questions, explanation, grouped evidence cards, Couldn't check, scam outcome or posting section), theme toggle, profile chip with Clear my data.
  Why now: With contracts fixed, the UI can be built in parallel with the engine and routes and then pointed at them.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > The Report`, `prd.md > Scam Outcome`, `prd.md > Profile and Resume`, `prd.md > Accessibility and Privacy`
  Spec ref: `spec.md > Components`, `spec.md > Look and Feel`, `spec.md > How the Checklist Steps Run (and Fail)`
  Build: `components/**`, `lib/client/*` (pipeline, storage, resume, copyReport), `lib/autofill.ts`, `app/page.tsx`, `app/icon.svg`.
  Verify (mechanical): gates pass; dev server renders `/` with no console errors; pipeline runner test covers timeout → failed → dependent step skipped → retry re-runs only failed/skipped steps.
  Learner check: Run `npm run dev`, go through the intro and profile, paste a made-up message, and look at the report in light and dark mode on a narrow window.
  Commit: `Slice 4: screens on fixtures`

- [x] **5. Both "Try an example" flows work live end to end**
  Becomes usable: With real keys in `.env.local`, "a scam" lands on "Strong signs of a scam" (85+, Critical tags) and "a real one" lands on "No red flags found" with the real posting found and an official apply link.
  Why now: This is the Thursday target and the first time the kernel meets real AI and search output.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Risk Scoring` (acceptance), `prd.md > Real-Posting Lookup`
  Spec ref: `spec.md > The Core Journey Through the System`, `spec.md > Example Snapshots`, `spec.md > Important Failure Modes`
  Build: Merge engine, routes, UI; wire the pipeline to the real routes and `score()`; refresh example snapshots from live output; fix what breaks.
  Verify (mechanical): gates pass on main; dev server, both examples run live (≤10 live checks total) and land in the expected levels; forced `?fail=company` shows step 4 skipped and Retry re-runs only steps 2 and 4.
  Learner check: Run `npm run dev`, click "Try an example: a scam", then "a real one", and say whether each report convinces you and why.
  Commit: `Slice 5: live integration of both examples`

- [x] **6. Review fixes and README**
  Becomes usable: A reviewed app with blockers fixed, plus a README with setup, the eval results table, and the privacy line.
  Why now: Last, because it reviews and documents the finished whole.
  PRD ref: `prd.md > Test Set`, `prd.md > Accessibility and Privacy`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Test Set and Eval`
  Build: Reviewer full pass vs spec; fix blockers and should-fixes; README.
  Verify (mechanical): all gates pass; `npm run eval` rewrites the README table; reviewer re-check finds no blockers.
  Learner check: Read the README as if you'd never seen the project and follow it to run the app.
  Commit: `Slice 6: review fixes and README`

## Tier 2 Slices (`devpost/tier2-spec.md`)

- [x] **7. Core polish from browser QA**
  Becomes usable: the resume step says what it read, the Check button explains itself, the explanation is shorter with no repeated quote, the match table fits at 320px, Clear my data asks first, and quick questions appear for a realistic unknown-source message.
  Why now: These are fixes to the finished core that Himesh found; they go first so later slices build on the polished screens.
  PRD ref: `prd.md > Profile and Resume`, `prd.md > Message Input and Auto-fill`, `prd.md > The Report`, `prd.md > Finding Missing Details and Quick Questions`, `prd.md > States and Boundaries`
  Spec ref: `tier2-spec.md > Slice 7`
  Build: `spottedSkills` + confirmation line, optional legends + hint, `tidyExplanation` + prompt, stacked match rows, inline clear confirm, realistic quick-question tests (questions.ts fix only if needed).
  Verify (mechanical): gates pass; `npm run eval` 26/26; `git diff core-v1 -- lib/scoring eval/messages` empty (or only a reviewed questions.ts fix); new tests for spottedSkills, tidyExplanation, quick questions (engine + UI render) pass.
  Learner check: Upload a resume, check a made-up message without picking a source, and see the quick question; open the report at 320px wide.
  Commit: `Slice 7: core polish`

- [x] **8. Tailored resume PDF**
  Becomes usable: from the profile chip or a report, pick a resume line, get an honest reworded version for the posting, accept it after a before/after diff, and download the resume as a PDF.
  Why now: It reuses the resume already read in the browser and the last report's posting, so it's the most direct next step after a "real" result.
  PRD ref: `prd.md > Deferred From the POC`, `scope.md > Later`
  Spec ref: `tier2-spec.md > Slice 8`, `> Token budget`
  Build: `lib/tiers/resumeGuard.ts`, `/api/rewrite` + `lib/server/rewrite.ts`, `components/tiers/ResumeTailor*`, `lib/tiers/pdf.ts`, App/chip entry, `TIER_FLAGS.resume = true`.
  Verify (mechanical): gates pass; guard tests reject invented numbers/employers/titles/dates/tools; rewrite route tests (origin, caps, failure mapping) pass; pdf test output starts with `%PDF`.
  Learner check: Tailor one bullet toward a made-up posting, try an instruction that invents a tool and see it refused, download the PDF.
  Commit: `Slice 8: tailored resume PDF`

- [x] **9. Application tracker board**
  Becomes usable: Save a report to the tracker or add a card by hand, move it Saved → Applied → Interviewing with buttons or arrow keys, edit notes, delete; Clear my data wipes it.
  Why now: Independent of AI and cheap; gives every checked offer a place to go.
  PRD ref: `prd.md > Deferred From the POC`
  Spec ref: `tier2-spec.md > Slice 9`
  Build: `lib/tiers/tracker.ts`, `components/tiers/Tracker*`, Save to tracker on the report, chip entry, `TIER_FLAGS.tracker = true`.
  Verify (mechanical): gates pass; tracker reducer + storage-validation tests pass; clearMyData test covers `is:tracker`.
  Learner check: Save the real example to the tracker, move it to Interviewing with the keyboard, reload, then Clear my data.
  Commit: `Slice 9: application tracker`

- [x] **10. Message screenshot upload**
  Becomes usable: Upload a screenshot on the check form; its text fills the message box for review, then the normal check runs.
  Why now: Many scam messages arrive as texts/WhatsApp, which are easier to screenshot than copy.
  PRD ref: `prd.md > Deferred From the POC`, `prd.md > Accessibility and Privacy`
  Spec ref: `tier2-spec.md > Slice 10`, `> Token budget`
  Build: `lib/tiers/image.ts`, `/api/transcribe` + `lib/server/transcribe.ts`, `components/tiers/ScreenshotUpload.tsx`, CheckForm hook, privacy line, `TIER_FLAGS.screenshot = true`.
  Verify (mechanical): gates pass; transcribe route tests (body cap, bad prefix, think-strip, trim, caps, no logging) pass; one live call confirms the vision model (logged).
  Learner check: Screenshot a made-up message, upload it, read the filled text, and run the check.
  Commit: `Slice 10: screenshot upload`

## Tier 3 Slices (`devpost/tier3-spec.md`)

- [x] **11. Mock interview shell: recruiter screen + behavioral**
  Becomes usable: from the chip menu, a report, or an Interviewing tracker card, start a recruiter screen or behavioral practice fitted to the posting and resume, answer one question at a time, and get per-answer feedback with quotes from your own answers (STAR for behavioral); sessions are saved in this browser.
  Why now: It is the shell the coding and design rounds plug into, and it works for every field.
  PRD ref: `prd.md > Deferred From the POC`, `scope.md > Later`
  Spec ref: `tier3-spec.md > Screens`, `> Interview logic`, `> Route`, `> Token budget`
  Build: `lib/tiers/interview.ts`, `/api/interview` + `lib/server/interview.ts`, `components/tiers/interview/**` shell, `askInterview`, Tracker `onPractice`, App/chip/report entries, `TIER_FLAGS.interview = true`.
  Verify (mechanical): gates pass; `npm run eval` 26/26; state-machine + validateFeedback + storage tests pass; interview route tests (origin, body, session cap, daily cap, cleaning, feedback validation, no logging) pass; UI render tests pass; clearMyData test covers `is:interviews`.
  Learner check: Practice a behavioral round for a made-up posting, give one weak and one strong STAR answer, and read the feedback quotes.
  Commit: `Slice 11: mock interview shell`

- [x] **12. Live coding round (tech)**
  Becomes usable: tech profiles can solve a made-up problem in Python or JavaScript in a real editor, run the examples, submit against hidden tests graded in the browser, ask for a hint, and get feedback.
  Why now: Needs the interview shell; it is the most common intern tech round.
  PRD ref: `prd.md > Deferred From the POC`
  Spec ref: `tier3-spec.md > Slice 12`
  Build: `lib/tiers/problems.ts`, `public/workers/{js,py}-runner.js`, `lib/tiers/runner.ts`, `CodingRound.tsx` + `CodeEditor.tsx`, shell wiring, `TIER_FLAGS.coding = true`.
  Verify (mechanical): gates pass; every problem's reference solution passes its tests; gradeOutputs equality tests pass; route hint/feedback-with-code tests pass; build shows CodeMirror only in a lazy chunk; Pyodide URL returns 200 from jsDelivr.
  Learner check: Solve one problem in Python and one in JavaScript, write an infinite loop and watch it get stopped.
  Commit: `Slice 12: live coding round`

- [x] **13. System design board (tech)**
  Becomes usable: tech profiles can draw a design with labeled boxes and arrows (mouse or keyboard), export it as PNG, and get follow-up questions and feedback about the diagram.
  Why now: Last tech round; reuses the shell and route.
  PRD ref: `prd.md > Deferred From the POC`
  Spec ref: `tier3-spec.md > Slice 13`
  Build: `lib/tiers/board.ts`, `Board.tsx` + `DesignRound.tsx`, shell wiring, `TIER_FLAGS.design = true`.
  Verify (mechanical): gates pass; board reducer/clamp/cap/JSON round-trip/describe tests pass; route test shows the board description in the prompt.
  Learner check: Draw client → server → database + cache with only the keyboard, export the PNG, ask for a follow-up.
  Commit: `Slice 13: system design board`

- [ ] **14. Business: case interview**
  Becomes usable: business profiles can run a made-up, interviewer-led case (structure, one calculation, recommendation) and get feedback with the math and structure checked in code.
  Why now: Reuses the Tier 3 shell and route; adds the scripted-round engine the finance round also needs.
  PRD ref: `prd.md > Deferred From the POC`
  Spec ref: `tier4-spec.md > Scripted rounds`, `> Feedback view`, `> Route`
  Build: `lib/tiers/scripted.ts` (cases, checks), scripted advance in `lib/tiers/interview.ts`, route check lines + question rejection, Feedback "Checked by code", round line, `TIER_FLAGS.case = true`.
  Verify (mechanical): gates pass; `npm run eval` 26/26; scripted tests (answer keys recomputed, extractNumber table, rubric) pass; route test shows server-computed Check lines; UI test shows Case only for business.
  Learner check: Run a case as a business profile, give a wrong number once and a right one once, read the code check.
  Commit: `Slice 14: business case interview`

- [ ] **15. Finance: technical questions**
  Becomes usable: finance profiles get 4 made-up accounting/valuation questions, numeric answers checked in code and the rest against a rubric, with feedback.
  Why now: Same scripted engine as Slice 14, different bank.
  PRD ref: `prd.md > Deferred From the POC`
  Spec ref: `tier4-spec.md > Scripted rounds`
  Build: `FINANCE_BANK` in `lib/tiers/scripted.ts`, tests, `TIER_FLAGS.finance = true`.
  Verify (mechanical): gates pass; bank has >= 12 questions, >= 5 numeric with keys verified in tests; 4 distinct per session; UI test shows Technical questions only for finance.
  Learner check: Run the finance round, answer one numeric question with "$1.2 million" style text, check it's read right.
  Commit: `Slice 15: finance technical questions`

- [ ] **16. Design and arts: portfolio walkthrough + design challenge**
  Becomes usable: design profiles can talk through their portfolio (links shown, never fetched) and do a 20-minute design challenge on the board, each with follow-ups and feedback.
  Why now: Last field; reuses the board and shell.
  PRD ref: `prd.md > Deferred From the POC`
  Spec ref: `tier4-spec.md > Portfolio walkthrough`, `> Design challenge`
  Build: `cleanLinks`, `PORTFOLIO_FIRST`, `CHALLENGE_PROMPTS`, `challengeLeft`, board `screen` kind, route links parse + prompts, setup links field, DesignRound timer, `TIER_FLAGS.portfolio = true`, `TIER_FLAGS.challenge = true`.
  Verify (mechanical): gates pass; cleanLinks/challengeLeft tests pass; route rejects javascript: links and never fetches (no fetch call in the route for links); UI tests show the links field only for portfolio and the timer only for challenge.
  Learner check: Add two made-up portfolio links, answer a follow-up; draw a 3-screen flow in the challenge and watch the timer.
  Commit: `Slice 16: portfolio walkthrough and design challenge`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — pending Himesh (morning): after Slice 5, try both examples live and give feedback
- [ ] Final kick-the-tires exploration and feedback completed — pending Himesh (morning)

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: pending Himesh (morning)
Route and stops: pending
Edit outcome: pending
Reflection: pending
Activity mode: pending

## Revisions

- Slices 2-4 built in parallel by separate agents (engine, api, ui), reviewed and committed in order engine → api → ui — a deliberate deviation from one-slice-at-a-time, approved by Himesh in `devpost/build-orchestration.md` to fit an overnight build.
- Workers write into the main tree (disjoint file ownership) instead of separate git worktrees, and the orchestrator runs every gate and commit — background agents in worktrees had no shell access overnight (permission prompts can't be answered while Himesh sleeps), so they couldn't link node_modules, run gates, or commit.
- Learner checks and hands-on checkpoints are deferred to the morning — Himesh was asleep during the build; recorded as pending, not done.
- No animation or icon library installed — `spec.md > Stack` rules them out (CSS motion + inline SVG); the orchestration brief only listed them as examples. Spec wins.
- Shared helpers `lib/constants.ts` (domain lists) and `lib/quotes.ts` written in Slice 1 by the orchestrator — both the engine and the routes need them, and parallel workers can't wait on each other.
- `lib/types.ts` adds `Report.postingMatch`, `Report.thinMessage`, `ScoreInput.form`, and `describeChange()` — the PRD's match table, "not much to check" note, form fallback, and "why it changed" line needed a home in the contract.
- Coverage line counts weighted checks (weights sum to 14, e.g. "11 of 14 checks ran") instead of a flat "8 of 10" — the PRD asks that important checks count for more, and the weighted total is what the line shows.
- Each critical flag adds +40 with a floor of 85, and good-sign flags are hidden (not just unscored) when a critical fires — the engine needed concrete numbers for "pushes the score to 85 or higher" and "good signs never apply".
- Explanation `max_completion_tokens` is 300, not ~250 — gpt-oss reasoning tokens count against the limit and 250 risked cut-off text.
- `maxLength`/`maxItems` removed from the Groq strict schema; the 200-char quote and 3-concern caps are enforced in code — `api-facts.md` doesn't confirm Groq strict mode supports those keywords.
- Backstop patterns tightened after review (fraud-warning footers, "moving forward", "driver's license required", "signal processing", "we'll pay for your laptop" no longer fire) — the first version forced ordinary real recruiter messages to 85+.
- Live integration fixes — the first live runs showed: rdap.org returns 403 without a User-Agent (sender age never ran); the company picker matched "Brightline Data Solutions" to gobrightline.com (a train company) on one shared word; the posting picker accepted any page on the site and another company's Workday posting (Dow Jones for Stripe); the city parser read "Software Engineer, Intern" as a place. All fixed with regression tests.
- Explanation gets red flags only, and "legit/legitimate" in AI output is rewritten to "real" instead of discarding the paragraph — good signs sent as "risk signals" made the AI contradict clean reports, and gpt-oss writes "a legitimate company would…" almost every time, so the filter threw away nearly every explanation. "safe" and "guaranteed" still reject outright.
- Light accent token is `#2A5FB8` instead of `#2F6FD6` — final review measured blue text on the 10% blue tint at about 4.2:1, under AA.
- Auto-fill no longer guesses the source pill from WhatsApp/Telegram/Handshake mentions in the body — scams say "we found you on Handshake" / "add us on WhatsApp", which granted false "applied first" credit or double-counted the off-platform flag. Only "thanks for applying" pre-selects a source; otherwise the quick question asks.
- The report appears before the explanation finishes (it fills in afterwards), matching spec step 6; the first build waited up to 10s for it.
- `eval/live.ts` wraps its loop in `main()` — tsx compiles to CommonJS here, which rejects top-level await.
