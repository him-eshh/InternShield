# InternShield v2, stream CHECK (worktree `InternShield-v2-check`, branch `v2-check`)

The project owner approved the v2 plan on Oct 22, 2026 and wants it done by **Fri Oct 23 night** (deadline Mon Oct 26, 5 PM ET; the weekend is buffer). Run it end to end without asking questions. Anything needing his decision: "Pending owner review" in your log, then continue.

**Your area: the scam check, end to end** — scoring rules, eval set, extraction (company vs department), lookups (Wikidata before Tavily), quick questions, link checks, and every screen of the check: check form, checking state, report (ring, verdict, reasons, evidence, questions, recovery card, annotated message, footer), intro, logo. The `tools` stream builds resume tailoring, interview, screenshot upload and tracker at the same time in another worktree. Integration merges both afterwards.


## Context rotation and usage (read this; it applies to the whole session)
- The launcher watches your context size. At ~75% (150K tokens) it stops you right after your current tool call and starts a fresh session that resumes from your progress file. This is normal and expected; plan for it.
- Keep **`devpost/v2-progress-check.md`** current (short, under ~60 lines): `Done` (item + commit hash), `Current` (exactly what you are doing and which files), `Next` (the next 3-5 unchecked items in brief order), `Gotchas` (things a fresh session must know: decisions, traps, commands that work, flaky tests). Update it after every finished item and before any long task (worker launch, screenshot pass, big refactor). Commit it with your work.
- Commit often so a rotation loses little: after each finished sub-item, and at least every ~30-40 minutes of work. Work that isn't phase-complete yet may be committed as `WIP (v2 check): ...` (gates may be red on WIP commits; the phase-closing commit must be green).
- A fresh session reads: the progress file first, then only the brief sections it needs, `git log --oneline v2-base..HEAD`, `git status`. Don't re-read whole findings files; grep the section you need.
- Save usage: keep tool output short. Never dump big files, lockfiles, build logs or full test output into the conversation: use `npx vitest run --reporter=dot` (then rerun only failing files), pipe long commands through `tail -n 40` or grep for errors, read files with offset/limit, and look at screenshots selectively (one per screen/state, not every variant, unless something looks wrong). Don't paste findings back to yourself; cite section numbers.
- Subagents run on Sonnet (the launcher forces it). Give each a precise, self-contained task with exact files and acceptance checks, and ask for a report of 10 lines or fewer. Do the review of risky logic yourself if a Sonnet reviewer seems unsure.

## Read first
1. `CLAUDE.md`, `devpost/spec.md` (Look and Feel, Components), `devpost/prd.md`, `devpost/fix-summary.md`, `devpost/v2-setup-log.md` (decisions and contracts made in setup).
2. Research (the source for every change; follow its specifics, quote it in the log when you deviate):
   - `devpost/research/findings/01-scam-scoring.md` — sections 9 (Top-10 rules), 3 (calibration, "How sure"), 6 (eval), 7 (Unicode/robustness), 8 (explanations), 12 (made-up example messages).
   - `devpost/research/findings/02-quick-questions.md` — sections 0, 3.2, 3.6, 3.7, 3.8, 4, 5.
   - `devpost/research/findings/05-known-bugs.md` — Bug B, Bug D, standing #3, #10, #12.
   - `devpost/research/findings/06-ui-ux-design.md` — sections 1, 4, 5, 6, 7, 8, 10, 11, 13 (Report/Check/Intro/Global rows), 14, 15.
   - The briefs Research answered: `devpost/research/briefs/00-overview.md`, `01-scam-scoring.md`, `02-quick-questions-and-gap-filling.md`, `06-ui-ux-design.md` (how things work today).

## Your files (ownership)
| You own | |
|---|---|
| Scoring + eval | `lib/scoring/**`, `eval/**`, `tests/scoring/**` |
| Server (check routes) | `app/api/{extract,company,posting,sender,explain}/**`, `lib/server/{extract,extractSchema,tavily,rdap,dns,hunter,http,cache}.ts`, new `lib/server/{wikidata,links}.ts`, `lib/explainFallback.ts` |
| Client logic | `lib/client/{pipeline,copyReport}.ts`, new `lib/client/{annotate,errorCopy}.ts`, `lib/autofill.ts`, `lib/examples.ts`, `lib/quotes.ts`, new `lib/{reportView,recovery}.ts`, `lib/types.ts` (additive; the tools stream reads it), `fixtures/**` |
| UI | `components/report/**`, `components/{CheckForm,Checklist,Intro,Logo,icons}.tsx`, `components/tiers/SaveToTracker.tsx` (Bug B only), `app/v2-check.css`, `app/icon.svg`, `app/apple-icon.png`, `app/opengraph-image.tsx` |
| Tests + QA | `tests/api/{extract,company,sender,explain,explainTidy,picker}.test.ts` + new `tests/api/v2-check-*.test.ts`, `tests/ui/{fixReport,pipeline,autofill,quickQuestionsReal,slice7}.test.*` + new `tests/ui/v2-check-*.test.tsx`, `qa/v2-check-*.mjs`, `devpost/v2-check-*.md`, `README.md` (eval table only) |
Not yours (tools stream): `lib/tiers/**`, `components/tiers/**` (except SaveToTracker), `app/api/{rewrite,transcribe,interview}`, `lib/server/{rewrite,transcribe,interview,groq}.ts`, `lib/client/resume.ts`, `components/ProfileSteps.tsx`, `public/**`. If a shared test file (`tests/ui/uxPass.test.tsx`, `tests/ui/fixTiers.test.tsx`) breaks because of your change, make the minimal fix and log it under "Needs integration".

## Phases (priority order; each ends in a gated commit with screenshots)

### C0. Start (solo)
`git status` (on `v2-check`; if not, `git switch v2-check`). If `node_modules` or `qa/examples.json` is missing: `npm ci`, `npx tsx qa/dump.ts`. Run gates, write the baseline in `devpost/v2-check-log.md` with the full phase checklist below.

### C1. Extraction and lookups (P0) — ~2 h
- **Bug D, company vs department** (findings 05 Bug D + 02 section 3.8): layered rules — department-word stoplist ("University Recruiting", "Talent Acquisition", "Campus Recruiting", "HR", "People Team" …), "the ___ team" pattern, legal-suffix and email-domain scoring, "at X"/signature-block isolation, AI `department` field in the extract schema, leave company empty when unsure (then the editable chip in C4 asks). ~20 table tests, all made up.
- **Wikidata official website before Tavily** (02 section 3.3, 4.2): new `lib/server/wikidata.ts` (server-side fetch, descriptive `User-Agent` per Wikimedia policy, 3 s timeout, `takeCount("wikidata")`, in-memory cache, never throws into the pipeline). Use it first for the company's official domain; call Tavily only when the answer could still matter (no official domain found, or the posting lookup needs it). Clearbit autocomplete only as a last fallback if at all (undocumented). Tavily cap is now 30/day (setup); when capped, the report says the posting wasn't checked, briefly.
- **Bug B, Save-to-tracker form** (05 Bug B): own left-aligned row under the footer, focus moves into the form and back on close.
- Typed error codes (`ApiErrorCode` from setup) in your routes; `lib/client/errorCopy.ts` maps codes to short copy; generic text only for unmapped codes.
Commit `V2 check 1: company vs department, Wikidata first, tracker form, error codes`.

### C2. Scoring rules (P0) — ~4 h. Owner: `engine-builder` (Opus).
From findings 01 section 9 (critical = 40, 85 floor, keep 25/60 cutoffs). For each rule: positive tests, a legit near-miss negative test, and at least one new made-up eval case.
1. **Unicode cleanup first (rule 4):** NFKC, strip zero-width/bidi/format chars, map common confusables, collapse spacing tricks ("p a y", "W h a t s A p p"), before both the regex backstop and the AI extract; flag +10 when 3+ characters were stripped. Quotes must still match word for word against what the user sees (keep an index map from cleaned text back to the original).
2. **Reimbursement trap (rule 1):** "we'll reimburse your laptop/equipment" no longer cancels the equipment flag; only "we'll ship/provide it at no cost" does. Critical.
3. **Money flowing the wrong way (rule 2):** regex over nearby words + AI field: "send the rest/remaining/balance by Zelle/Cash App/Venmo/Bitcoin/wire/gift card", mobile check deposit, "use your personal account" (money mule), task-scam "fee/tax to withdraw", "negative balance". Critical.
4. **Split run-code (rule 3):** critical for remote-access tools (incl. ones disguised as Zoom/Teams), terminal-paste "fix your camera/driver" commands, disabling antivirus, or clone/npm/run when the contact was unsolicited, off-platform, free-email or crypto-themed; otherwise +15 caution (a normal `git clone` take-home from an applied-to company must not be critical).
5. **Task-scam vocabulary (rule 6):** 2+ terms (like/subscribe, "product boosting", "set of 40 tasks", "optimize orders", "commission per task") -> +20 (was +8).
6. Every flag gets `severity`, one `action` (a verification step) and one `learnMore` official link (FTC/FBI IC3/university career center pages from findings 01 section 8; real URLs only, ones Research checked).
7. `confidence` ("How sure") from how much could be checked (01 section 3): points read as log-odds; don't change the cutoffs.
Commit `V2 check 2: Unicode cleanup, reimbursement trap, wrong-way money, run-code split, task vocab`.

### C3. Report redesign (P0, never drop) — ~4 h. Owner: `ui-builder` (Sonnet), you review visually.
Findings 06 sections 5, 6, 11, 13 (Report rows), 15:
- **Ring v2** (`RiskRing.tsx`): big tabular number, 14 coverage ticks showing which checks ran, a visible non-empty state at score 0 (not an empty grey ring), choreographed reveal under 1.2 s and skippable, no bounce on high risk; when a quick-question answer changes the score the ring animates old -> new with a small delta chip and an `aria-live` announcement.
- Order: ring -> verdict -> **one-line action** under the verdict -> **top 3 reasons** -> explanation (keep the titled sections) -> **one evidence list sorted by severity** (good signs collapsed on high risk) -> quick questions -> recovery card (C4) -> posting section -> footer.
- Quotes use the mark style (not accent blue); marks are not color-only.
- **Footer:** one primary button + a compact secondary row (replacing 5-6 stacked pills). On high risk hide Tailor and Practice. No Copy report on low risk (keep it on medium/high).
- Evidence cards are always visible (setup removed scroll-reveal; keep it that way, test with reduced motion and a full-page shot).
Commit `V2 check 3: report redesign (ring v2, action line, top reasons, severity list, footer)`.

### C4. Quick questions + recovery + company chip (P1) — ~3 h
Findings 02 sections 3.2, 3.5, 3.6, 3.7, 4.1, 4.3:
- Show a question only if an answer could change the level, switch on a critical flag, or change the advice (score movement alone is not enough). Max 3. After each answer drop questions that no longer matter; never add new ones. Stable question ids (standing #3).
- New set: multi-select "Have they asked you to do any of these?" (pay or buy, deposit a check, crypto top-up, install or run a file, share SSN or bank info); "Did you apply for this job first?"; "Where did this message reach you?" only when the channel can't be inferred; "Have you talked to them live?"; keep the signed-offer question. **Delete "Is the employer outside the US?"**; soften the chat-app penalty only when the user applied first. "Not sure" instead of "I don't know"; "Not sure" never raises or lowers the score.
- UI: title stays **"A few quick questions"**; hint line under the ring like "Could change to Strong signs depending on 2 answers"; section "Make this check more accurate · Optional" with the top question open and "+N more"; the confirmation appears only below the answered question, after answering.
- **Recovery card** at medium/high: "Already sent money or shared info?" opens steps in the FTC order (stop paying, call your payment company, don't spend a deposited check, IdentityTheft.gov + credit freeze, change passwords, report, beware of "recovery" scams). It does not change the score.
- **Editable company chip**: editing re-runs only the company and posting lookups (`pipeline.ts`), not extraction.
Commit `V2 check 4: question picking, new question set, recovery card, editable company`.

### C5. Link checks + rules 7-10 (P1) — ~3 h
- Local link checks with no network fetch of the link itself (02 section 3.3, 4.2; 01 rule 5): extract URLs, punycode (+20), brand + careers/hr/apply on a non-official or lookalike host (+30), shortener (+5), Google Forms/Docs (+10, critical when it asks for bank/SSN data), raw IP host. Domain age for the link host via the existing RDAP (+15 under 90 days) only if it fits the existing lookup budget. Fill `report.links`. Coordinate weights so links + existing domain flags don't double count.
- Then, in order, as time allows: rule 7 secrecy ("don't tell your bank", "don't contact HR") +20; rule 8 impersonated university/gov/immigration (sender not the exact .edu/.gov, "via" relays) +30, visa-status threat +25, with payment -> critical; rule 9 hiring paperwork before an offer (I-9, E-Verify, W-4, direct deposit, background check) +20, with a fee -> critical; rule 10 more hiring platforms at -5 (Rippling, Gem, JazzHR, Breezy, Pinpoint, Teamtailor, Recruitee, Workable, myworkdayjobs) and "reply YES" texts scored 0 when the user applied and the text names a scheduled interview.
Commit `V2 check 5: link checks and rules 7-10` (list in the log which of 7-10 made it).

### C6. Annotated message view (P1, never drop) — ~2.5 h
06 sections 5 and 13 ("Annotated-message view"): the pasted message shown with each quoted phrase marked, numbered, and two-way linked to its evidence card (click/Enter on a mark scrolls to and focuses the card; the card links back). Positions come from the verified quotes (`lib/client/annotate.ts`, pure, tested, handles overlaps, repeats and the Unicode index map from C2). Accessible: marks are focusable, have labels, not color-only; long messages collapse with "Show all". Works on mobile.
Commit `V2 check 6: annotated message view`.

### C7. Eval set to ~90 (P1; run as a parallel subagent during C4-C6) — ~3 h
01 section 6 and 12:
- Grow `eval/messages` from 26 to about 90 made-up cases (keep the original 26 files byte-identical): new rules' positives and near-miss negatives, Unicode/spacing/prompt-injection variants of each high case, more legit cases (applied-first Handshake/Greenhouse/Workday, university recruiters, staffing agencies) so false positives are measured.
- **Held-out set:** 25-30 cases in `eval/heldout/`, written by a separate Sonnet subagent that is NOT allowed to read `lib/scoring/**` or the new rules (give it only the three level definitions and findings 01 section 12). Reported, not gating.
- `eval/run.ts`: print a 3x3 confusion matrix and the false-positive rate on legit messages for both sets; README eval block updated.
Commit `V2 check 7: eval set to N cases, held-out set, confusion matrix`.

### C8. Check form + checking screen (P2) — ~2 h
06 section 7 and 13 (Check, Checking rows): don't pre-disable "Check it" (validate on click with an inline hint); fold the optional pill groups into "Add context (optional)"; reveal Sender/Company on autofill or "Add details". Checking state inside the report layout with real per-step outcomes (no fake progress), show-delay so fast steps don't flicker, slow-step copy. Error copy via `errorCopy.ts`, keep the pasted text on error.
Commit `V2 check 8: check form and checking screen`.

### C9. Intro + logo (P3; first to drop) — ~2 h
Drop order if behind: intro first, then logo. Intro: asymmetric hero with a live mini report built from the saved example, three-fact privacy row, straight to Check. Logo: the ring mark (ring with ticks) as `Logo.tsx`, `app/icon.svg`, apple icon and `opengraph-image.tsx` (made with code, no stock icons).
Commit `V2 check 9: intro and ring logo`.

### C10. Final (always)
- Reviewer (Opus, read-only) full pass on `git diff v2-base...v2-check` vs this brief and findings; fix blockers and should-fixes.
- Full screenshot pass of every check screen: check form (empty, filled, error), checking, report low/medium/high (both "Try an example" choices plus a link-scam case and a score-0 case), quick questions before/after answering, recovery card open, company chip editing, annotated message (desktop + mobile), footer on each level, intro, logo/OG — 1440 + 390, light + dark, plus reduced-motion report shots.
- Gates green; both "Try an example" flows land in their levels; stop servers; ports clear.
- Write `devpost/v2-check-summary.md`: what's built per phase (with ✓/✗ against this brief), rule list with weights, eval results (N/N main, held-out confusion matrix, FP rate), existing assertions changed (and why), screenshots index, "Needs integration", "Pending owner review", known issues.
- Commit `V2 check summary` (this exact subject start tells the launcher you are done). Exit.

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
