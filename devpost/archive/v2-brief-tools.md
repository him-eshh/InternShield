# InternShield v2, stream TOOLS (worktree `InternShield-v2-tools`, branch `v2-tools`)

The project owner approved the v2 plan on Oct 22, 2026 and wants it done by **Fri Oct 23 night** (deadline Mon Oct 26, 5 PM ET; the weekend is buffer). Run it end to end without asking questions. Anything needing his decision: "Pending owner review" in your log, then continue.

**Your area: the career tools, end to end** — resume upload parsing and tailoring, mock interviews (all rounds, runners, grading), screenshot upload, tracker. The `check` stream builds the scam check and report at the same time in another worktree. Integration merges both afterwards.


## Context rotation and usage (read this; it applies to the whole session)
- The launcher watches your context size. At ~75% (150K tokens) it stops you right after your current tool call and starts a fresh session that resumes from your progress file. This is normal and expected; plan for it.
- Keep **`devpost/v2-progress-tools.md`** current (short, under ~60 lines): `Done` (item + commit hash), `Current` (exactly what you are doing and which files), `Next` (the next 3-5 unchecked items in brief order), `Gotchas` (things a fresh session must know: decisions, traps, commands that work, flaky tests). Update it after every finished item and before any long task (worker launch, screenshot pass, big refactor). Commit it with your work.
- Commit often so a rotation loses little: after each finished sub-item, and at least every ~30-40 minutes of work. Work that isn't phase-complete yet may be committed as `WIP (v2 tools): ...` (gates may be red on WIP commits; the phase-closing commit must be green).
- A fresh session reads: the progress file first, then only the brief sections it needs, `git log --oneline v2-base..HEAD`, `git status`. Don't re-read whole findings files; grep the section you need.
- Save usage: keep tool output short. Never dump big files, lockfiles, build logs or full test output into the conversation: use `npx vitest run --reporter=dot` (then rerun only failing files), pipe long commands through `tail -n 40` or grep for errors, read files with offset/limit, and look at screenshots selectively (one per screen/state, not every variant, unless something looks wrong). Don't paste findings back to yourself; cite section numbers.
- Subagents run on Sonnet (the launcher forces it). Give each a precise, self-contained task with exact files and acceptance checks, and ask for a report of 10 lines or fewer. Do the review of risky logic yourself if a Sonnet reviewer seems unsure.

## Read first
1. `CLAUDE.md`, `devpost/spec.md` (Look and Feel, Components), `devpost/tier2-spec.md`, `tier3-spec.md`, `tier4-spec.md`, `devpost/fix-summary.md`, `devpost/api-facts.md` (Groq models and limits), `devpost/v2-setup-log.md` (decisions: how TypeScript and sql.js wasm load, contracts, flags).
2. Research (the source for every change; follow its specifics, note deviations in the log):
   - `devpost/research/findings/05-known-bugs.md` — Bugs A, C, E, standing #2, #4, #5, #7, #8, #13; and `devpost/research/findings/05-assets/` (reference sketches `parseAnswer.mjs`, `tiles.mjs`, `pdfLines.mjs` with tests: copy ideas, reimplement in TS with tests).
   - `devpost/research/findings/03-resume-tailoring.md` — TL;DR, sections 3, 4 (Guard v2), 5 (parsing), 7 (prompting), Ranked plan.
   - `devpost/research/findings/04-interview-prep.md` — sections 0, 2b, 3d, 4, 5, 7, 8, (c).
   - `devpost/research/findings/06-ui-ux-design.md` — sections 13 (Tailor, Tracker, Interview setup, Live coding, Boards, Feedback rows), 10, 15.
   - The briefs Research answered: `devpost/research/briefs/00-overview.md`, `03-resume-tailoring.md`, `04-interview-prep.md`, `05-known-bugs.md` (how things work today).

## Your files (ownership)
| You own | |
|---|---|
| Tier logic + types | `lib/tiers/**` (incl. `lib/tiers/types.ts` and `lib/tiers/flags.ts`, which only you edit after setup), new `lib/v2/tools-*.ts` |
| Server (tool routes) | `app/api/{rewrite,transcribe,interview}/**`, `lib/server/{rewrite,transcribe,interview,groq}.ts` |
| Client | `lib/client/resume.ts`, `components/ProfileSteps.tsx` (resume upload preview only) |
| UI | `components/tiers/**` except `SaveToTracker.tsx`, `app/v2-tools.css`, `public/**` (workers, vendor assets) |
| Tests + QA | `tests/tiers/**`, `tests/fixtures/**`, `tests/api/{rewrite,transcribe,transcribeDedupe,interview,guard}.test.ts` + new `tests/api/v2-tools-*.test.ts`, `tests/ui/interview*.test.tsx` + new `tests/ui/v2-tools-*.test.tsx`, `qa/v2-tools-*.mjs`, `devpost/v2-tools-*.md` |
Not yours (check stream): `lib/scoring/**`, `eval/**`, `components/report/**`, `components/CheckForm.tsx`, `lib/client/pipeline.ts`, `lib/types.ts`, the check routes, `components/tiers/SaveToTracker.tsx`. `lib/types.ts` is read-only to you (setup already added `ApiErrorCode`). The report's footer buttons that open Tailor/Practice belong to the check stream; keep your components' entry props backward compatible. If a shared test file (`tests/ui/uxPass.test.tsx`, `tests/ui/fixTiers.test.tsx`) breaks because of your change, make the minimal fix and log it under "Needs integration".

## Phases (priority order; each ends in a gated commit with screenshots)

### T0. Start (solo)
`git status` (on `v2-tools`; if not, `git switch v2-tools`). If `node_modules` or `qa/examples.json` is missing: `npm ci`, `npx tsx qa/dump.ts`. Run gates, write the baseline in `devpost/v2-tools-log.md` with the full phase checklist below.

### T1. Data bugs (P0) — ~4 h. Owner: `engine-builder` (Opus) for C and E logic.
- **Bug E, resume line breaks** (05 Bug E, 03 section 5): pdf.js text rebuilt by y-grouping with `hasEOL` (see `05-assets/pdfLines.mjs`); DOCX via mammoth **HTML** -> lines (lists become bullets), not raw text; no early `\s+ -> " "` collapse (normalize at the last step only). Parse preview after upload in `ProfileSteps.tsx` showing the lines read (and their kind: heading / bullet / contact), short. "File -> pipeline" tests with made-up PDF and DOCX fixtures generated in test setup or checked in small (`tests/fixtures/`), asserting bullets and sections survive.
- **Bug C, unit-aware number reader** (05 Bug C + standing #2, `05-assets/parseAnswer.mjs` 19-case table): `{value, unit}` parsing ("$1.2 million", "1.2M", "$1,200,000", "four thousand", ranges, %), pick the final-answer cue, else the last candidate with the expected unit, else the last; unit mismatch shows a short message instead of "1,200,000%"; UI line "We read your final number as X. Not right? Edit." Port the full table as tests.
- **Bug A1, screenshot route** (05 Bug A1): typed `ApiErrorCode`s (`TRANSCRIBE_PARTIAL`, `TOO_LARGE`, `RATE_LIMITED`, …), accept `finish_reason: "length"` as partial, `reasoning_effort` per findings, higher `max_completion_tokens`; `ScreenshotUpload.tsx` maps codes to short copy and never shows the generic error for a known code.
Commit `V2 tools 1: resume line breaks, unit-aware numbers, screenshot errors`.

### T2. Tall screenshots + model resilience (P0) — ~3.5 h
- **Bug A2 tiling** (05 Bug A2, `05-assets/tiles.mjs`): tile tall images (2 strips per request, seam-cut on whitespace gaps, overlap merge, de-dupe lines), within the 4.5 MB Vercel body limit and the vision model's image limits. Tests with generated tall made-up chat PNGs (short, taller than one tile, multi-paragraph), asserting no lost or duplicated lines. A3 (line protocol) only if time.
- **`lib/server/groq.ts`** (standing #4, 04 section 7): model IDs from env with current defaults (`VISION_MODEL`, `INTERVIEW_MODEL`, `REWRITE_MODEL`; add them to the log under "Needs integration: .env.example"), interview text fallback to `openai/gpt-oss-20b`, honor `retry-after` on 429 with one retry, map to `RATE_LIMITED`; interview question generation on gpt-oss-20b, feedback on qwen or 120b (load split across per-model buckets). Mock a 404 "model not found" and a 429 in tests.
Commit `V2 tools 2: tall screenshot tiling, model env ids, fallback and 429 handling`.

### T3. Interview core (P1) — ~3.5 h
- Fix the duplicated "6 of 6 hidden tests passed".
- **Wide coding layout** (06 section 13 Live coding): at >= 1024 px a ~1200 px split pane (problem left, editor + console right); stacks on mobile. **Readable dark code theme, no purple** (contrast >= 4.5:1 for tokens). CodeMirror `aria-label` via a `Compartment`, reconfigured on language switch (standing #8).
- **4-area scorecard** (04 sections 0, 2b, (c) #1): Communication, Problem solving, Coding, Verification/testing for tech rounds; round-specific axes elsewhere. Bands **Strong / Solid / Developing / Not yet**. Fill from code-measured signals first ("Checked by code" badge: tests passed, edge cases tried, ran before submit, time used); the LLM only explains, with quotes from the user's answer checked word for word; evidence-or-cap rule (no evidence -> max "Developing"). Feedback screen: scorecard at the top, "One thing to try next" highlighted, quotes marked inside the user's answer. Rubric copy "we didn't spot this; it may be worded differently" (standing #1). Flip `scorecard` flag.
Commit `V2 tools 3: wide coding layout, dark code theme, 4-area scorecard`.

### T4. TypeScript + SQL runners (P1) — ~4 h
04 section 3d (RunnerHost, per-language workers, JSON harness, grader):
- **TypeScript** via `typescript.transpileModule()` in the existing JS worker (loaded as decided in setup), same harness, `@codemirror/lang-javascript` with `typescript: true`. Flip `tsRunner`.
- **SQL round**: sql.js worker seeded per problem with made-up data; grade by comparing result sets as multisets (column order by name, numbers within 1e-9, order only if the problem says ORDER BY matters), show the first 5 differing rows; 6 made-up questions (joins, group by, window function, null handling…), each with a reference query tested in vitest. `@codemirror/lang-sql`. Flip `sqlRound`.
- Worker hardening for new and existing workers (standing #7): CSP header on each worker script response via a route/header config you own, or if that needs `next.config.ts`, log it under "Needs integration" and do the prototype-level deletes (fetch, XMLHttpRequest, WebSocket, EventSource, importScripts, indexedDB, caches, BroadcastChannel) now; hard timeout, output cap, kill on timeout. Tests that try each blocked API.
- **Out of scope:** Java, C++, Go, Rust execution. Those languages get discussion / code-review rounds only (say so briefly in the language picker).
Commit `V2 tools 4: TypeScript and SQL runners, worker hardening`.

### T5. Debugging round + company-style presets + round cards (P1) — ~3 h
- **Debugging round** (04 section 4): ~5 made-up programs (Python/JS/TS) with planted bugs and failing tests; graded by tests passing; each has a reference fix tested in vitest. Flip `debugRound`.
- **Company-style presets** (04 sections 1a, 5, (c) #5-#6): e.g. "Google-style intern loop", "Meta-style coding", "Amazon-style (Leadership Principles)", "McKinsey-style case", "Goldman-style finance" — labels say "-style", a small "Based on <official page>" link only to sources Research verified, never implying affiliation. Amazon LP behavioral with code-checked STAR signals ("I" vs "we", a metric in the result, LP tags). Flip `presets`.
- **Interview setup round cards** (06 section 13): title, ~minutes, what you'll practice, what feedback you get; pre-filled from the report's company/role when present.
Commit `V2 tools 5: debugging round, company-style presets, round cards`.

### T6. Resume tailoring (P1) — ~4 h
03 Ranked plan items 2, 3, 4, 6 (and 5 if time). Tailoring **never invents facts**.
- **Keyword-gap panel, no LLM**: posting terms from the skill list + an alias map; Required vs Preferred from cue phrases (must/required/minimum vs preferred/plus/nice to have); three buckets: In your resume · Same idea, different words · Not found — add only if true, each with "I have this" / "Leave out". Show counts ("6 of 8 required terms found"), **never an "ATS score"**. Flip `keywordGap`.
- **3 rewrite options in one strict-JSON call** + a `heldBack` "Not added" list (what the model was asked to add but couldn't support). Each option runs through the guard; blocked options are not shown. Flip `rewriteOptions`.
- **Guard v2** (03 section 4): digit-token number regex (standing #5), inflated-verb ladder (warn), scope/seniority words, qualifier-drop warnings, synonym aliases, "from the posting, not your resume" label for JD-leaked terms, Block / Check / OK tiers; a 40-pair made-up guard eval in tests.
- **More options**: Target level, Region, Use the posting's words, Avoid buzzwords, saved presets; "How to tailor" collapses to a one-line summary ("Confident · Light touch · Same length ▾").
- Ask-for-the-number slots (item 5) only if time: export blocked while a slot is empty.
Commit `V2 tools 6: keyword gap, 3 rewrite options, guard v2, tailoring presets`.

### T7. Resume diff (P2; drop order #2) — ~2 h
Side-by-side Before / Suggested with word-level highlights (marks not color-only); Accept morphs into the bullet; sticky "N changes · Download PDF" bar. PDF v2 basics (name header, bold titles, proper file name) if time.
Commit `V2 tools 7: side-by-side resume diff`.

### T8. Polish (P3; tracker polish is drop order #4) — ~2 h
Pyodide preload when a coding round is picked + staged progress text (standing #13); board node labels 14 px, 8 px snap, dot grid; tracker designed empty states, compact cards (company, role, risk tag, one "Move ->" + a "…" menu with Edit and Delete-with-Undo).
Commit `V2 tools 8: Pyodide preload, board and tracker polish`.

### T9. Final (always)
- Reviewer (Opus, read-only) full pass on `git diff v2-base...v2-tools` vs this brief and findings; fix blockers and should-fixes.
- Full screenshot pass of every tools screen: profile resume upload + parse preview (PDF and DOCX), tailor (gap panel, options, guard warnings, diff, PDF button), interview setup (round cards, presets), every round (recruiter, behavioral incl. Amazon-style, live coding Python/JS/TS incl. infinite loop -> timeout -> editor still usable, SQL, debugging, system design board, case, finance with "$1.2 million", portfolio, timed challenge), feedback scorecard, screenshot upload (short + tall + error codes), tracker (empty, filled, undo) — 1440 + 390, light + dark, plus reduced-motion shots of anything animated.
- Gates green; stop servers; ports clear.
- Write `devpost/v2-tools-summary.md`: what's built per phase (✓/✗ vs this brief), flags flipped, test counts, guard eval result, screenshots index, "Needs integration" (e.g. `.env.example` model vars, `next.config.ts` worker headers), "Pending owner review", known issues.
- Commit `V2 tools summary` (this exact subject start tells the launcher you are done). Exit.

Estimated: ~26 h of agent work; with parallel workers ~11-14 h wall.

## How you work (both streams)
- You are the orchestrator (Opus) in ONE session, in YOUR worktree (the current directory). Subagents (`.claude/agents`: Opus `engine-builder` for pure logic, Sonnet `ui-builder` for components/copy, Sonnet `api-builder` for routes/`lib/server`, Haiku `chores` for small named-file tasks, Opus `reviewer` read-only) run in THIS directory. Never pass worktree isolation to a subagent. Workers may not be able to run commands; you run every install, gate and commit. Run workers in parallel only with disjoint files you name explicitly per worker.
- The other stream is building at the same time in a sibling worktree. **Only edit files in your ownership table.** If you truly need a change in a file you don't own, don't make it: write it under "Needs integration" in your log (file, exact change, why) and work around it (wrapper, prop, local helper). The launcher logs every file you change outside your table.
- Shared files are frozen for both streams: `package.json`, `package-lock.json`, configs (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`), `.gitattributes`, `app/globals.css`, `app/layout.tsx`, `components/App.tsx`, `components/ProfileChip.tsx`, `components/MotionProvider.tsx`, `lib/constants.ts`, `lib/server/guard.ts`, `.env.example`, `CLAUDE.md`, `qa/lib.mjs`, `qa/ports.mjs`, `tests/shared/**`. Global CSS goes only in your `app/v2-<stream>.css`. New shared-looking types go in `lib/v2/<stream>-types.ts`.
- No new dependencies (setup installed motion, sql.js, @codemirror/lang-sql and friends). If something is truly missing, log it under "Needs integration" instead.
- Track progress in `devpost/v2-<stream>-log.md` (create it): a checklist of every phase item `[ ]`/`[x]`, each bug (id, steps, cause, fix, test, commit), decisions, "Needs integration", "Pending owner review". Keep your own context small: rely on the log and git, not memory.
- **Each phase ends with:** reviewer pass on the phase diff -> fix blockers -> all gates green -> screenshots of every changed screen -> commit `V2 <stream> N: <what>` -> tick the log. Never leave a phase half-committed; if a phase item can't be finished, hide or revert just that item and log why.
- **Priority order is the phase order.** If you run low on usage or time, finish and commit the current phase cleanly, skip to the final phase, and list what's left.

## Gates (every commit)
```
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
npm run eval        # every labeled case lands in its level; the original 26 files in eval/messages are never edited
```
- `lib/scoring` and `eval/messages` were frozen since tag `core-v1`; v2 changes to scoring are now approved **for the check stream only**, but every original eval case must stay correct and every existing scoring test must keep passing; if an existing test's expectation must change because a rule was deliberately changed, change only that assertion and log it (test, old, new, why).

## Screenshots (test proof, the project owner reviews them)
- Use the `qa/` Playwright harness (`qa/lib.mjs`: `open`, `mockApi`, `shot`, `variants`, `overflowX`). Every `/api` call is mocked; this worktree has no `.env.local`, so live calls are impossible here by design. Add your scripts as `qa/v2-<stream>-*.mjs` only.
- Start your own dev server on `$QA_PORT` (`npx next dev -p $QA_PORT`, record the PID), use `QA_BASE`; screenshots go to `$QA_SHOTS` (already set; never into the repo, never commit images).
- For every changed feature: 1440 and 390 widths, light and dark (`variants`), plus one `reducedMotion: "reduce"` shot of anything animated. Name `NN-feature-state-width-theme.png`. Check each image yourself (Read it): look for invisible/blank sections, clipped text, sideways scroll (`overflowX` must be 0 at 390 and 320), unreadable dark-mode colors, purple, overlapping elements. The frontend is judged visually, not just by tests.
- Capture console errors/warnings per screen; zero new errors.
- Stop every server you start, then `node qa/ports.mjs` must show nothing in `$QA_PORT_RANGE`. Never kill processes you didn't start (the owner's Codex, Tabbit and Claude desktop apps, or the other stream's servers on the other port range).

## the owner's product rules (apply everywhere)
- UI text concise: short labels, no sentences that repeat the label or explain the obvious.
- No "safe", "legit" or "guaranteed" verdicts. No celebratory moment on a low score.
- Look: "Calm Instrument" (findings 06): Inter/system font, slightly blue-tinted greys, ONE blue accent, green/amber/red only for results, no purple anywhere (including code themes), no glassy glow, no emoji clutter, no stock shield icons, no shadcn defaults. Motion only via `motion/react` with the existing `MotionConfig reducedMotion="user"`; never scroll-reveal, never hide content until scrolled, no bounce on scam results, no `transition: all`.
- Confirmations appear right below what the user just did, after they did it, never in a heading or above.
- Keyboard and screen-reader accessible; visible focus; marks/highlights never color-only.
- All examples, fixtures, resumes, postings and messages are made up.

## Hard rules
- Build locally only. No cloud sessions, no deploy (no vercel, no gh), never `git push`, never touch remotes, never force-push. Never switch to, commit to, or merge into `main` or the other stream's branch. Stay on your branch.
- Never read, print or log `.env.local` or any `.env*` except `.env.example`. Keys only via `process.env` inside `lib/server/**`, never `NEXT_PUBLIC_`, never sent to the client.
- Free services only, no card. No paid APIs. No LinkedIn or people-search scraping; no Glassdoor scraping; no urlscan (public scans leak users' links).
- Stage only intended files; read every staged diff for secrets (gsk_, tvly-, sk-, ghp_, github_pat_, AKIA) before each commit. Never commit `.env*` (except `.env.example`), `devpost/learner-profile.md`, screenshots or `qa/out*.txt`.
- Never touch `.agents/`, `agent/`, `.claude/skills/`, `skills-lock.json`, `.codex/`; never edit `.claude/settings.json`; in `.git/internshield-relay/` write only inside `$QA_SHOTS`.
- Never `git reset --hard`, `git clean`, or a repo-wide `git checkout .`/`restore .`.
- Nothing from `devpost/prd.md` Non-Goals or `devpost/scope.md` Explicitly Cut: no accounts/server storage, no ML classifier, no recruiter profile search.
