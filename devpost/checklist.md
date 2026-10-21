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

- [ ] **5. Both "Try an example" flows work live end to end**
  Becomes usable: With real keys in `.env.local`, "a scam" lands on "Strong signs of a scam" (85+, Critical tags) and "a real one" lands on "No red flags found" with the real posting found and an official apply link.
  Why now: This is the Thursday target and the first time the kernel meets real AI and search output.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Risk Scoring` (acceptance), `prd.md > Real-Posting Lookup`
  Spec ref: `spec.md > The Core Journey Through the System`, `spec.md > Example Snapshots`, `spec.md > Important Failure Modes`
  Build: Merge engine, routes, UI; wire the pipeline to the real routes and `score()`; refresh example snapshots from live output; fix what breaks.
  Verify (mechanical): gates pass on main; dev server, both examples run live (≤10 live checks total) and land in the expected levels; forced `?fail=company` shows step 4 skipped and Retry re-runs only steps 2 and 4.
  Learner check: Run `npm run dev`, click "Try an example: a scam", then "a real one", and say whether each report convinces you and why.
  Commit: `Slice 5: live integration of both examples`

- [ ] **6. Review fixes and README**
  Becomes usable: A reviewed app with blockers fixed, plus a README with setup, the eval results table, and the privacy line.
  Why now: Last, because it reviews and documents the finished whole.
  PRD ref: `prd.md > Test Set`, `prd.md > Accessibility and Privacy`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Test Set and Eval`
  Build: Reviewer full pass vs spec; fix blockers and should-fixes; README.
  Verify (mechanical): all gates pass; `npm run eval` rewrites the README table; reviewer re-check finds no blockers.
  Learner check: Read the README as if you'd never seen the project and follow it to run the app.
  Commit: `Slice 6: review fixes and README`

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
