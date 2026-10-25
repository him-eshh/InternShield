# InternShield v2, session 4 of 4: INTEGRATION (main tree, branch `v2`)

The `check` and `tools` streams finished (or stopped) in their worktrees. Your job: combine them on a new branch `v2`, wire the seams, finish the shared polish, prove everything with live smoke + a full screenshot pass, and write the summary the project owner approves. Run end to end without asking questions; anything needing his decision is "Pending owner review" in the summary. **Do not merge into `main` and do not push** — the project owner approves that after reading your summary and screenshots; Coder pushes after a secret scan.


## Context rotation and usage (read this; it applies to the whole session)
- The launcher watches your context size. At ~75% (150K tokens) it stops you right after your current tool call and starts a fresh session that resumes from your progress file. This is normal and expected; plan for it.
- Keep **`devpost/v2-progress-integration.md`** current (short, under ~60 lines): `Done` (item + commit hash), `Current` (exactly what you are doing and which files), `Next` (the next 3-5 unchecked items in brief order), `Gotchas` (things a fresh session must know: decisions, traps, commands that work, flaky tests). Update it after every finished item and before any long task (worker launch, screenshot pass, big refactor). Commit it with your work.
- Commit often so a rotation loses little: after each finished sub-item, and at least every ~30-40 minutes of work. Work that isn't phase-complete yet may be committed as `WIP (v2 integration): ...` (gates may be red on WIP commits; the phase-closing commit must be green).
- A fresh session reads: the progress file first, then only the brief sections it needs, `git log --oneline v2-base..HEAD`, `git status`. Don't re-read whole findings files; grep the section you need.
- Save usage: keep tool output short. Never dump big files, lockfiles, build logs or full test output into the conversation: use `npx vitest run --reporter=dot` (then rerun only failing files), pipe long commands through `tail -n 40` or grep for errors, read files with offset/limit, and look at screenshots selectively (one per screen/state, not every variant, unless something looks wrong). Don't paste findings back to yourself; cite section numbers.
- Subagents run on Sonnet (the launcher forces it). Give each a precise, self-contained task with exact files and acceptance checks, and ask for a report of 10 lines or fewer. Do the review of risky logic yourself if a Sonnet reviewer seems unsure.

## Read first
`CLAUDE.md` (v2 ownership + gates), `devpost/v2-setup-log.md`, `devpost/v2-check-summary.md` + `v2-check-log.md`, `devpost/v2-tools-summary.md` + `v2-tools-log.md` (especially every "Needs integration" and "Pending owner review" item), the launcher logs `.git/internshield-relay/v2-check-status.txt` and `v2-tools-status.txt` (ownership notes, gate results), and `devpost/research/findings/06-ui-ux-design.md` sections 10, 11, 14, 15.
If a stream has no summary commit, it stopped early: integrate what it committed (its last green commit; never its uncommitted work), keep unfinished features hidden, and list what's missing.

## Phases
### I0. Start
Main tree `[project root]` (has `.env.local`; never read it). `git status` (the owner's untracked folders stay untouched). `git switch -c v2 v2-base` (if `v2` exists, switch and resume from `devpost/v2-integration-log.md`). Log the heads of v2-base, v2-check, v2-tools. Gates baseline.

### I1. Merge
1. `git merge --no-ff v2-check -m "V2 merge: check stream"` -> gates.
2. `git merge --no-ff v2-tools -m "V2 merge: tools stream"`. Expected conflicts: `README.md` eval table (re-run `npm run eval` to regenerate), `CLAUDE.md`, `tests/ui/uxPass.test.tsx` / `fixTiers.test.tsx`, files listed as ownership notes. Resolve keeping both sides' intent; never drop a feature silently. Gates.
3. Apply every "Needs integration" item from both logs (e.g. `.env.example` model vars, `next.config.ts` worker CSP headers, `App.tsx` navigation, shared CSS moved from `app/v2-*.css` into `globals.css` if cleaner). One commit per logical change: `V2 integrate: …`.

### I2. Seams and review
- Report footer (check) -> Tailor / Practice (tools) still open correctly with the report's company, role and posting; hidden on high risk; Save-to-tracker works with the tracker's new cards.
- Error codes mapped end to end on every route; typed copy everywhere.
- Both "Try an example" flows land in their levels; quick questions re-score and the ring animates.
- Run the Opus `reviewer` (read-only) on `git diff main...v2` against the approved plan (below) and the owner's rules; fix blockers and should-fixes. Gates. Commit.

### I3. Shared polish (in this order; drop from the bottom if short on usage)
1. Accessibility + reduced-motion pass across every screen: keyboard-only walkthrough of every flow (tab order, visible focus, Escape closes menus/dialogs, focus returns), labels on every control, `aria-live` for results and score changes, contrast >= 4.5:1 for text (compute from tokens), `emulateMedia({ reducedMotion: "reduce" })` shows everything immediately with no motion.
2. Logo / favicon / OG image if the check stream didn't finish C9 (ring-with-ticks mark).
3. Copy pass: cut words on new screens (concise), consistent terms ("Strong signs of a scam", "Some warning signs", "No red flags found").
Commit `V2 integrate: a11y, reduced motion, brand`.

### I4. Live smoke (the ONLY live API calls in all of v2; max 10, log each in the integration log)
Start `next dev` on port 3000 (this tree reads `.env.local` itself). Suggested: 3 checks (scam example, real example, one made-up link-scam with a lookalike careers URL), 1 Wikidata-first company lookup (observe Tavily skipped), 2 screenshot transcriptions (one tall, tiled), 1 rewrite with 3 options, 2 interview turns, 1 spare. Made-up content only. Record pass/fail and latency; fix what breaks with mocks + tests, not more live calls.

### I5. Full screenshot pass (the owner's proof)
Every feature and state from both stream summaries' screenshot lists, on the merged app: 1440 + 390, light + dark, plus reduced-motion report shots. Set `QA_SHOTS` already points to `.git/internshield-relay/v2-shots/integration`. Name `NN-feature-state-width-theme.png`. Look at every image yourself; fix what's wrong (blank sections, clipping, sideways scroll at 390/320, unreadable dark colors, purple, console errors) and reshoot. Also write `v2-shots/integration/INDEX.md` (outside git) listing each shot with one line of what it proves.

### I6. Final
- Gates green on `v2`: lint, `npx tsc --noEmit`, `npx vitest run` (report the count), `npm run build`, `npm run eval` (main set N/N, held-out confusion matrix). `git diff --diff-filter=DMR v2-base -- eval/messages` empty (original cases untouched).
- Secret scan of `git diff main...v2` for gsk_, tvly-, sk-, ghp_, github_pat_, AKIA; confirm no `.env*` (except `.env.example`), `devpost/learner-profile.md`, images or `qa/out*` are tracked.
- Stop every server you started; nothing listens on 3000-3099.
- Write `devpost/v2-summary.md` for the project owner, short and scannable:
  1. The approved plan as a checklist, each item ✓ / partial / ✗ with one line (bugs A-F, caps + Wikidata, design groundwork, scoring rules 1-4 + 6 and which of 5, 7-10, eval N cases, report redesign, quick questions, link checks, annotated view, tailoring, interview, logo, a11y, screenshots).
  2. What was dropped, following the drop order (intro, resume diff, logo, tracker polish) and why.
  3. Test count, eval results, live calls used.
  4. Screenshot index path and the 10 most important shots.
  5. What needs his hands-on check before merging.
  6. Pending owner review: merge `v2` into `main` (`--no-ff`, his OK), push (Coder, after a scan), deploy (his OK; set `DAILY_CHECK_CAP=100` and confirm `TAVILY_DAILY_CAP=30` in Vercel; check the Stripe posting used in the real example is still live), new env vars for Vercel (names only).
  7. Known issues.
- Commit `V2 summary` on `v2` (this exact subject start tells the launcher you are done). Exit. Leave the worktrees in place (Coder removes them later).

## The approved plan (for the review in I2)
Bugs A tall screenshots, B tracker form at 1440, C "$1.2 million" -> 1,200,000%, D company = department, E resume line breaks, F CRLF fixtures; Tavily cap ~30/day and Wikidata official site before Tavily; Calm Instrument tokens, readable dark mode, motion/react with reducedMotion=user, evidence cards always visible; scoring rules 1-4 and 6 (5, 7-10 if time); eval ~90 cases with every original case correct; report: ring with ticks + visible score 0, one-line action, top 3 reasons, one severity-sorted evidence list, one primary footer button, Tailor/Practice hidden on high risk, ring animates on score change; quick questions: only if an answer could change level/critical/advice, max 3, new set, "employer outside US" deleted, "Not sure", recovery card at medium/high, editable company chip; local link checks; annotated message view; tailoring: keyword-gap panel, 3 options, stronger guard, more presets; interview: 4-area scorecard, TypeScript + SQL in browser, debugging round, company-style presets, wide coding layout + readable dark code theme, duplicated "hidden tests passed" fixed; Java/C++/Go/Rust execution out; logo/favicon/OG, a11y + reduced motion, screenshots of every feature. Never dropped: always-visible cards, ring, report order, annotated message. the owner's rules: concise UI text, no Copy report on low risk, confirmations below the chosen answer, title "A few quick questions", tailoring never invents facts.

## How you work
- You are the orchestrator (Opus) in ONE session, in the main tree. Subagents (`.claude/agents`: Opus `engine-builder` for pure logic, Sonnet `ui-builder` for components/copy, Sonnet `api-builder` for routes/`lib/server`, Haiku `chores` for small named-file tasks, Opus `reviewer` read-only) run in THIS directory. Never pass worktree isolation to a subagent. Workers may not be able to run commands; you run every install, gate and commit. Run workers in parallel only with disjoint files you name explicitly per worker.
- Both streams are finished; you may edit any file, but keep changes minimal and logged in `devpost/v2-integration-log.md`.
## Gates (every commit)
```
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
npm run eval        # every labeled case lands in its level; the original 26 files in eval/messages are never edited
```
- `lib/scoring` and `eval/messages` were frozen since tag `core-v1`; v2 changes to scoring are now approved (made by the check stream), but every original eval case must stay correct and every existing scoring test must keep passing; if an existing test's expectation must change because a rule was deliberately changed, change only that assertion and log it (test, old, new, why).

## Screenshots (test proof, the project owner reviews them)
- Use the `qa/` Playwright harness (`qa/lib.mjs`: `open`, `mockApi`, `shot`, `variants`, `overflowX`). Every `/api` call is mocked; only phase I4 makes live calls. Add your scripts as `qa/v2-<stream>-*.mjs` only.
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
- Build locally only. No cloud sessions, no deploy (no vercel, no gh), never `git push`, never touch remotes, never force-push. Never switch to, commit to, or merge into `main`. Work only on `v2`.
- Never read, print or log `.env.local` or any `.env*` except `.env.example`. Keys only via `process.env` inside `lib/server/**`, never `NEXT_PUBLIC_`, never sent to the client.
- Free services only, no card. No paid APIs. No LinkedIn or people-search scraping; no Glassdoor scraping; no urlscan (public scans leak users' links).
- Stage only intended files; read every staged diff for secrets (gsk_, tvly-, sk-, ghp_, github_pat_, AKIA) before each commit. Never commit `.env*` (except `.env.example`), `devpost/learner-profile.md`, screenshots or `qa/out*.txt`.
- Never touch `.agents/`, `agent/`, `.claude/skills/`, `skills-lock.json`, `.codex/`; never edit `.claude/settings.json`; in `.git/internshield-relay/` write only inside `$QA_SHOTS`.
- Never `git reset --hard`, `git clean`, or a repo-wide `git checkout .`/`restore .`.
- Nothing from `devpost/prd.md` Non-Goals or `devpost/scope.md` Explicitly Cut: no accounts/server storage, no ML classifier, no recruiter profile search.
