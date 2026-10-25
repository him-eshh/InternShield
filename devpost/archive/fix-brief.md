# InternShield fix + audit session: orchestrator brief

The owner requested a full bug hunt on Oct 21, 2026. Specific issues were excess UI copy, Copy report on low-risk reports, and quick-question confirmations appearing above their answers. The requested outcome was a smooth end-to-end workflow verified after fixes.

The plan was approved for unattended execution. Where a decision was needed, the historical workflow recorded it as pending owner review in `devpost/fix-summary.md`.

You are the orchestrator (Opus), in ONE session. Same workflow as the tier builds: read `devpost/tiers-orchestration.md` (Lessons, model split, Hard rules all apply), `CLAUDE.md`, `devpost/spec.md` (Look and Feel), `devpost/prd.md`, `devpost/tier2-spec.md`, `tier3-spec.md`, `tier4-spec.md`, `devpost/tiers-summary.md`.

## Starting point
- Branch `fix` (created from `ux` = f928080). Work and commit ONLY on `fix`. Never switch main or ux, never merge into them.
- `main` = 1f037dd (core + Tiers 2-4 + polish). `ux` adds: quick-questions thanks moved below, resume tailoring options panel, Copy report on all risk levels, sectioned fallback explanation. 547 tests, eval 26/26.
- Untracked `.agents/`, `agent/`, `.claude/skills/`, `skills-lock.json`, `.codex/` are the owner's: never touch, stage or delete.

## Workflow
1. Phase 0 (solo): `git status`, run all gates on `fix`, record the baseline in `devpost/fix-log.md`.
2. Phase A (solo): a full bug hunt FIRST (section e below) with Playwright before changing code, so every bug is logged with steps, screen, width, theme and a screenshot path. Group the fixes into slices with disjoint file ownership. Shared files (`components/App.tsx`, `app/globals.css`, `lib/types.ts`, `lib/server/guard.ts`, `package.json`, configs) are yours, done solo first.
3. Phase B: parallel subagent workers in the main tree (no worktrees). Model split: Opus `engine-builder` for pure logic, Sonnet `ui-builder` for components/copy, Sonnet `api-builder` for routes/`lib/server`, Haiku `chores` for small named-file tasks. You run every install, gate and commit. Each slice: reviewer -> fix blockers -> gates -> commit `Fix N: ...` on `fix` -> log it in fix-log.md.
4. Phase C: independent Opus `reviewer` (read-only) full pass on `git diff ux...fix`, then a SECOND full Playwright pass over every screen (section e) to prove the fixes and catch regressions. Repeat until the second pass finds nothing new that's reasonable to fix.
5. Gates, all green on `fix` at the end:
   ```
   npm run lint
   npx tsc --noEmit
   npx vitest run
   npm run build
   npm run eval            # must be 26/26
   git diff core-v1 -- lib/scoring eval/messages   # must be empty (except the already-reviewed Tier 2 slice-7 questions.ts change that is in main)
   ```
   Compare against ux, not core-v1 alone: `git diff ux -- lib/scoring eval/messages` must be empty.
6. Write `devpost/fix-summary.md` and commit it on `fix` (`Fix summary`). Exit.

## What to fix
a) **Screenshot upload repeats text.** Text read from an image repeats chunks of the message (seen in a test, shot 12 of the last QA). Find the root cause (e.g. tiling/overlapping crops, multiple images sent, model output not de-duplicated, tesseract fallback run on top of vision output, React state appending twice, StrictMode double effect). Fix the cause, not just the symptom. Add tests with realistic made-up screenshots (generate them, e.g. render a fake chat/email to PNG in the test setup or check in small fixtures; made-up content only, never real messages) covering short, long (taller than one tile) and multi-paragraph messages; assert no duplicated lines/chunks.
b) **Copy report: remove it from low-risk reports.** the project owner: not needed there. Keep it on medium and high, as on main. Update tests.
c) **Quick questions "thanks" still at the top.** the project owner still sees the thank-you at the top. Find out why in the real rendered app (look for every place it can render: heading, banner, toast, aria-live region shown visually, the report header/score ring area, a stale state from `main`'s code path, a second component). Required behavior: the box heading stays "A few quick questions" (or shorter); no thank-you/confirmation ever appears in the heading or above a question; a short confirmation appears only BELOW the answered question(s), and only after answering. Verify in a real browser at 1440 and 390, light and dark, with screenshots before/after answering. Also check every other thanks/confirmation in the app (quick questions, tracker save, Copy report, interview, tailor accept, clear data) for the same placement/timing problem: confirmations appear next to what the user just did, after they did it.
d) **The UI says too much.** Audit all copy on every screen and cut it: shorter labels, hints, headings, helper text, empty/loading/error states and feedback text. Self-explanatory with fewer words; remove sentences that repeat the label or explain the obvious. Keep the meaning of safety/privacy lines (no "safe" verdicts, honest privacy). Keep his style: Apple system font / Inter, lots of white space, one soft-blue accent, green/amber/red only for results. No purple gradients, glassy glow, emoji clutter or cluttered dashboards. List notable before -> after copy changes in fix-log.md.
e) **Full bug hunt.** the project owner believes there are more bugs. Test every feature and flow end to end in a real headless browser (Playwright; Chromium is already installed in `%LOCALAPPDATA%\ms-playwright`; use `@playwright/test` or `playwright` only as a devDependency if not present, or a script outside the app bundle) at 1440 and 390 widths, light and dark:
   - check page; both "Try an example" choices; the report shows first; quick questions update the score ring without reload; Copy report; screenshot upload
   - resume tailoring with the options panel: only bullets selectable (not name, contact line, headers), accept / keep original, PDF download
   - tracker: save from a report, manual add, list, move with buttons and keyboard, notes, delete, company name. Fix the known "Unknown company" issue (company should come from the report/posting, or ask) and the known profile chip issue (find it in tiers-summary/build-log/known issues; if unclear, test the chip and its menu and fix whatever is broken)
   - every interview round: recruiter screen, behavioral, live coding (Python and JS, including an infinite loop -> timeout and kill, editor still usable after), system design board (including keyboard-only: add, connect, move, delete, export PNG), business case with answers in words ("about 4,000 cups"), finance ("$1.2 million", "1.2M", "$1,200,000"), design portfolio, timed design challenge with the timer running and ending
   - error states via the dev `?fail=<step>` switch for every step; rate-limit/usage-cap messages; network failure; empty inputs
   - theme toggle; keyboard navigation and visible focus everywhere; tab order; screen-reader labels on controls; console errors and warnings; layout overflow (no sideways scroll at 390 and 320); dead ends (every screen has an obvious next step or way back)
   Review the known issues and fix what's reasonable: interview rubric keyword matching (unusual wording shows as "missing": add synonyms/stemming or soften the wording), last-number parsing (pick the answer number sensibly, handle words like "four thousand", units, ranges), resume rewrite on a preview model with no fallback (add a fallback model from `devpost/api-facts.md`, or a clear retry message).
   Log every bug in `devpost/fix-log.md` (id, where, steps, cause, fix, test, commit). Add a regression test for each fixed bug.
f) **Make the whole workflow smooth.** No confusing steps, no dead ends, no duplicate buttons, sensible defaults, clear next step after each result.

## Constraints
- Never read, print or log `.env.local`. The app reads it. Keys stay server-only.
- Don't change `lib/scoring` or `eval/messages`. Keep tier features behind `lib/tiers/flags.ts`.
- No new paid services. No new deps unless essential (Playwright as a devDependency is fine).
- Live API calls: at most ~10 for the whole session, mocks everywhere else (tests mock `groq-sdk` and `@tavily/core`). Log each live call in fix-log.md. `DAILY_CHECK_CAP` applies. For local test servers, any allow-origin or similar setting is passed only as an env var on the test process, never by editing `.env.local`.
- No deploy, no `git push`, never touch remotes (no vercel, no gh). Local commits only; Coder pushes after a secret scan. Stage only intended files and read every staged diff for secrets (gsk_, tvly-, sk-, ghp_, AKIA). Never commit `.env.local` or `devpost/learner-profile.md`.
- Never touch `.agents/`, `agent/`, `.claude/skills/`, `skills-lock.json`, `.codex/`. Never edit `.claude/settings.json`. In `.git/internshield-relay/` you may only write inside `.git/internshield-relay/fix-shots/`.
- No real recruiter or scam messages anywhere; all test content is made up. No LinkedIn or people-search scraping. Nothing from prd Non-Goals / scope Explicitly Cut.
- Screenshots of every screen (before and after, both widths, both themes) go to `.git/internshield-relay/fix-shots/` (outside git; never commit images). Name them `NN-screen-width-theme-before|after.png` and list them in fix-summary.md.
- Every server you start (next dev/start, Playwright webServer) you stop, then verify nothing listens on ports 3000-3999 and no node process of yours is left. Never kill processes you didn't start (the owner's Codex, Tabbit and Claude desktop apps).
- Commit slices as `Fix N: ...` on `fix`. Leave everything on `fix`: do NOT merge into ux or main.

## fix-summary.md
Bugs found and fixed (table), copy changes, what changed per screen, gate results (test count, eval score, scoring diff empty), live calls used, screenshots list, remaining issues and what needs the owner's hands-on check, and anything "pending owner review".
