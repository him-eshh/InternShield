# InternShield tiers build: orchestrator brief (one session per tier)

Himesh approved this on Oct 21, 2026 ~2:20 AM ET and is asleep. Run it end to end without asking questions. Where a skill says to pause for the learner, record the item as "pending Himesh (morning)" and continue. FAST MODE, as in the core build. Treat this brief as his approval of the tier checklist slices you write (status stays `approved`).

**Each tier runs in its own fresh Claude Code session.** Your launch prompt names your tier: `TIER=2`, `TIER=3` or `TIER=4`. Do ONLY your tier, then stop. The launcher (`.git/internshield-relay/run-tiers.ps1`, you never edit it) starts the next tier's session after you exit. It decides "merged" by looking for a merge commit on `main` whose subject starts with `Tier N:`.

You are the orchestrator (Opus). Same workflow as the core build (`devpost/build-orchestration.md`, `.claude/skills/5-build/SKILL.md` for checklist format, verification, commits, git safety). Source of truth: `devpost/prd.md` (Deferred From the POC, Non-Goals, Product Decisions), `devpost/scope.md` (Later, Explicitly Cut), `devpost/spec.md` (Look and Feel, Components, Usage Guard, Token Budget, Browser Storage, Stack), `devpost/api-facts.md`, `devpost/build-summary.md`, `CLAUDE.md`.

The finished core is tagged `core-v1` (6067a1d, pushed). It works: 175 tests, eval 26/26, both "Try an example" flows live. **Never break it.**

## Lessons from the core build (apply them)
- Subagents run in the MAIN tree, not worktrees (worktree workers had no shell: permission prompts are auto-denied in -p mode). Do not pass worktree isolation. Workers may not be able to run commands; YOU run every install, gate and commit.
- Parallel work only with disjoint file ownership you assign explicitly per worker. Anything conflict-prone (package.json/lockfile, `lib/types.ts` or new shared contracts, `lib/server/guard.ts` route names and caps, `components/App.tsx` navigation, `app/globals.css`, `CLAUDE.md`, configs) is done by you FIRST, solo, before workers start.
- Model split: you (Opus) orchestrate; Opus `engine-builder` for pure logic (grading, tailoring-guard rules, interview state machines, prompts' validators); Sonnet `ui-builder` for pages/components; Sonnet `api-builder` for routes/`lib/server`; Haiku `chores` for small named-file tasks; Opus `reviewer` (read-only) before every merge. Workers report in <=10 lines.
- Usage limits are waited out automatically (CLAUDE_CODE_RETRY_WATCHDOG=1). Don't stop because of them.

## Phase 0 (you, solo, every tier)
1. `git status`. Untracked `.agents/`, `agent/`, `.claude/skills/`, `skills-lock.json` are Himesh's skill files: never touch, stage or delete them. If there are other uncommitted changes left by a crashed earlier session, commit them on that tier's branch as `WIP (unmerged): ...` (never discard work, never `reset --hard`/`clean`).
2. `git switch main`. Run the gates (below). If main is red, fix main first (a `git revert -m 1 <tier merge>` is allowed if a tier merge broke it) and log it.
3. If branch `tier<TIER>` already exists (a resumed session), switch to it and continue from `devpost/checklist.md` and `devpost/build-log.md`; otherwise `git switch -c tier<TIER>` from main.
4. Append `- <time ET> Tier <TIER> session started` under the `## Tiers` heading of `devpost/build-log.md` (create the heading once).

## Phase A (you, solo): mini-spec, contracts, slices
1. Write `devpost/tier<TIER>-spec.md`: a concise spec for this tier only, grounded in prd/scope/spec and the existing look and feel (Apple-like, system font, one soft-blue accent, green/amber/red only for results, light/dark, CSS motion only, inline SVG icons, keyboard and screen-reader accessible, self-explanatory). Cover: screens and where they're reached from, data model, any new route (inputs, model, caps, failure -> friendly message), browser storage keys, dependencies (with license), tests, and how it stays hidden until it works.
2. Dependencies: prefer zero or minimal. Only free, keyless, license-OK libraries; check each with `npm view <pkg> license` and record it in the spec. Allowed candidates: `pdf-lib` (MIT) or a print stylesheet for PDFs; CodeMirror 6 packages (MIT) for the editor; Pyodide (MPL-2.0) loaded from jsDelivr CDN at runtime inside a Web Worker (not bundled); tesseract.js (Apache-2.0) only if the Groq vision path is not usable. **Do NOT use tldraw** (its SDK license needs a license key/watermark for production); build a simple SVG/canvas board yourself (Excalidraw, MIT, only if a home-made board is clearly not enough). No animation or icon libraries. Install everything for the tier now, so workers never touch package.json.
3. Any new AI route reuses `lib/server/guard.ts` (origin check, body cap, per-visitor limits, daily caps via `takeCount`), `lib/server/groq.ts` (model fallback, timeouts), keys only in `lib/server/**`. Add a new env-configurable daily cap per new route (add the name with a default to `.env.example`, no values for keys). In `tier<TIER>-spec.md` write a token budget table per Groq model (per api-facts: ~1,000 req/day and ~200,000 tokens/day per model, 8,000 tokens/min) showing core caps + all tier caps at full use stay under each model's free limit with at least 25% left for the demo. Starting points (adjust to fit): screenshot transcription 30/day, resume rewrite 40/day, interview turns 200/day site-wide with a per-visitor cap and a per-session max of ~12 turns.
4. Shared contracts for the tier go in a new `lib/tiers/types.ts` (or additive changes to `lib/types.ts`), written by you before workers start. Navigation: you add the entry point in `components/App.tsx` / `ProfileChip` yourself, gated by a constant in `lib/tiers/flags.ts` that is only set `true` in the commit where that feature passes its gates. **No "coming soon" buttons**: a feature that isn't finished is invisible.
5. Add this tier's slices to `devpost/checklist.md` in the same template format (Becomes usable / Why now / PRD ref / Spec ref / Build / Verify (mechanical) / Learner check / Commit). Number them after the existing ones: Tier 2 = slices 7-9, Tier 3 = 10-12, Tier 4 = 13-15 (see per-tier sections). Every Verify line is mechanical (tests, curl, gates, diff checks).
6. Update `CLAUDE.md` ownership map for the tier. Gates green. Commit on `tier<TIER>`: `Tier <TIER> setup: spec, contracts, slices`.

## Phase B: build (parallel, disjoint ownership)
Launch workers in the background together, each with a precise task, the exact files it owns, and the contracts to build against. Do not edit their files while they run. Then: reviewer on the slice -> send blockers back to the owner (or fix yourself) -> gates -> commit each slice on `tier<TIER>` (`Slice N: ...`) and tick the checklist immediately.

## Phase C: merge gate (every tier)
1. Reviewer full pass on `git diff main...tier<TIER>` vs `tier<TIER>-spec.md`, prd, scope (Explicitly Cut), Non-Goals. Fix all blockers and should-fixes.
2. Gates on the branch, all green:
   ```
   npm run lint
   npx tsc --noEmit
   npx vitest run
   npm run build
   npm run eval            # must still be 26/26
   git diff core-v1 -- lib/scoring eval/messages   # must be empty (the scoring core is frozen)
   ```
   Plus: start the dev server and confirm both "Try an example" flows still land in their levels using the saved example results (no live calls needed), and the new feature's mechanical checks pass.
3. Live API budget for the WHOLE tiers build is ~10 real calls: Tier 2 <= 4, Tier 3 <= 4, Tier 4 <= 2. Mocks everywhere else. Log every live call in build-log.md. Never read, print or log `.env.local`; the app reads it.
4. If green: `git switch main` -> `git merge --no-ff tier<TIER> -m "Tier <TIER>: <short what>"` -> re-run lint/tsc/vitest/build/eval on main -> if anything is red on main, `git revert -m 1 HEAD` immediately and record why. Main must always pass gates and keep both example flows working.
5. If the tier can't be made green: leave it unmerged on `tier<TIER>`, commit its state there, note why in the summary. You may merge a green subset (e.g. two of three features) only if the unfinished one stays fully hidden and the subset passes every gate; the merge subject still starts `Tier <TIER>:` and the summary says what's left out.
6. Write `devpost/tier<TIER>-summary.md` (what's built, what's merged, test results, live calls used, what needs Himesh's hands-on check, known issues). Then rewrite `devpost/tiers-summary.md` combining every `tier*-summary.md` that exists so far (one section per tier, plus "not run yet" for later tiers). Commit both on main (`Tier <TIER> summary`). Append the end line to build-log.md. Exit.

## Hard rules
- Never `git push`, never touch remotes, never deploy (no vercel, no gh). Local commits only. Stage only intended files; read every staged diff for secrets (gsk_, tvly-, sk-, ghp_, AKIA). Never commit `.env.local` or `devpost/learner-profile.md`.
- Never touch `.agents/`, `agent/`, `.claude/skills/`, `skills-lock.json`. Never edit `.claude/settings.json` or the relay folder.
- No real recruiter or scam messages anywhere: all examples, fixtures, screenshots, resumes, postings and interview content are made up.
- Nothing from prd Non-Goals or scope Explicitly Cut: no login/accounts/server storage, no recruiter profile search, no ML classifier, no "safe" verdicts, no scraping LinkedIn or people-search sites.
- Resume, tracker and interview data live only in the browser (localStorage under the `is:` prefix) and are wiped by "Clear my data". Uploaded screenshots are never stored or logged (server holds them in memory for one request only).
- No `--dangerously-skip-permissions` behavior. Keep your own context small: track progress in checklist.md and git.

## Tier 2 (slices 7-9)
**First, before anything else (chore):** `npm ci` fails on Linux because `package-lock.json` is out of sync with `package.json` (missing `@emnapi/runtime@1.11.3` and `@emnapi/core@1.11.3`, Windows-generated optional deps). Fix the lockfile so `npm ci` works cross-platform (needed for the Vercel deploy): e.g. `npm install --package-lock-only` (or delete and regenerate only the lockfile with `npm install`) so the lockfile lists those packages; verify with `npm ci` (then confirm `node -e` that `package-lock.json` contains `node_modules/@emnapi/runtime` and `node_modules/@emnapi/core` entries at 1.11.3, or the versions npm resolves) and the gates. Give it to the Haiku `chores` worker if it can run commands; otherwise do it yourself. Commit on main directly, before branching: `Fix lockfile for cross-platform npm ci`. Then branch `tier2`.
- **7 Tailored resume PDF.** From the resume already read in the browser (profile step) and a posting (the last report's posting/company, or a pasted job description). The user selects a section/bullet and asks for a change; an AI route rewords ONLY that text. It never invents experience: a pure guard (engine-builder, `lib/tiers/resumeGuard.ts`, tested) rejects any rewrite that adds numbers, employers, titles, dates, tools/skills or proper nouns not present in the original resume, and the UI shows a before/after diff the user must accept. Download as a PDF (pdf-lib or print stylesheet). Without a resume, the feature explains it needs one and links to the profile step.
- **8 Application tracker board.** Columns Saved / Applied / Interviewing (prd wording). Add a card from a report ("Save to tracker" with company, role, link, risk level) or manually; move cards with buttons and keyboard (drag optional), edit notes, delete. localStorage only, cleared by Clear my data. No server.
- **9 Message screenshot upload.** On the check form, "Upload a screenshot" next to paste. Use Groq vision `qwen/qwen3.8-27b` (api-facts: Vision section, Preview, max 3 images, 2,048 tokens each, 20 MB cap) via a new guarded route that only transcribes the visible text (prompt-injection-safe: output is plain text, treated as untrusted message text). Downscale/compress in the browser first; cap size; image never stored or logged. The transcribed text fills the message box for the user to review, then the normal check runs unchanged. If the vision model isn't available (verify against the Groq models page in one live call, counted in the budget), fall back to tesseract.js in the browser. Privacy line updated honestly.

## Tier 3 (slices 10-12): mock interview
Based on the posting, company and resume (whatever is available; ask for a pasted job description otherwise). Reached from the report's posting section and the tracker's Interviewing column (only if Tier 2 is merged; otherwise from the profile chip menu).
- **10 Interview shell + recruiter screen + behavioral round (everyone).** A guarded `/api/interview` route (Groq, per-session turn cap) plays the interviewer one question at a time; the user types answers; the end shows feedback per answer (behavioral uses STAR: situation/task/action/result) with quotes from the user's own answers. Interview state machine and feedback validation are pure, tested logic (engine-builder). Sessions saved only in localStorage.
- **11 Live coding (tech).** CodeMirror 6 editor, Python via Pyodide (CDN, in a Web Worker) and JavaScript in a sandboxed Web Worker, both with a hard timeout and kill. A small bank of made-up problems with hidden tests graded locally and deterministically (no AI grading of correctness); AI only gives optional hints/feedback through the interview route. If adding a CSP or headers, allow only jsDelivr for Pyodide.
- **12 System design on a drawing board (tech).** A home-made SVG board: add labeled boxes (client, server, DB, cache, queue...), connect arrows, move, delete, keyboard accessible, export as PNG. The board serializes to compact JSON that the interviewer route reads to ask follow-ups and give feedback.

## Tier 4 (slices 13-15): other fields
Runs only if Tier 3 is merged (it reuses the interview shell). Each round picks by the profile's field.
- **13 Business: case interviews.** Interviewer-led case (made-up prompts), structure/framework feedback, simple math check done in code where possible.
- **14 Finance: technical questions.** Accounting/valuation question bank (made up), answers checked by rubric; numeric answers checked in code.
- **15 Design and arts: portfolio walkthrough + design challenge.** Portfolio walkthrough by text/links the user provides (no scraping; links are only shown, never fetched), plus a timed design challenge using the Tier 3 board.
