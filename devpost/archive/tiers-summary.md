# Tiers summary

All three tiers ran and merged to main with gates green. Nothing was pushed. Per-tier detail: `devpost/tier2-summary.md`, `tier3-summary.md`, `tier4-summary.md`.

| Tier | Slices | Merge commit | Tests | Eval | Live calls |
|---|---|---|---|---|---|
| 2 | 7-10 | `27a8fc8` | 290 | 26/26 | 2 of 4 |
| 3 | 11-13 | `2822cc3` | 430 | 26/26 | 2 of 4 |
| 4 | 14-16 | `cb65b55` | 519 | 26/26 | 0 of 2 |

Total live calls: 4 of the ~10 budget. `git diff core-v1 -- lib/scoring eval/messages` was empty at every merge.

## Launcher history
- The first launch (02:27) failed: tier 2 and tier 3 each exited with code 1 twice, and tier 4 was skipped. It was stopped and relaunched.
- The relaunch hit usage limits several times. The launcher waited them out, and a duplicate launcher chain was stopped.
- Tier 2 merged green at 06:51 and tier 3 at 11:38. Tier 4 waited for the 16:13 reset, then merged green at 18:10 (main `40e4416`).
- No tier is left unrun.

## Tier 2: core polish, resume PDF, tracker, screenshot upload
**Merged** (`27a8fc8`), with a lockfile fix on main first (`bb58163`).
- **Built:**
  - Slice 7: resume read-back line, optional source and stage with a hint, explanation capped at 2 paragraphs with each quote shown once, 320px match rows, inline Clear-my-data confirm, quick questions proven in tests. `questions.ts` is unchanged.
  - Slice 8: tailored resume PDF. `/api/rewrite` reworded a single line, `resumeGuard` rejects invented facts, you accept a before/after diff, and pdf-lib builds the PDF.
  - Slice 9: Saved / Applied / Interviewing tracker in `is:tracker`.
  - Slice 10: screenshot upload. The browser downscales it and `/api/transcribe` (qwen vision) fills the message box. The image is never stored.
- **Tests:** lint, tsc and build pass, 290 tests (175 before), eval 26/26.
- **Live calls (2 of 4):** transcribe on the app's own share image, and rewrite on a made-up bullet. Both worked.
- **Needs your hands-on check:**
  - the resume confirmation line;
  - the posting match at 320px;
  - the Clear-my-data confirm by keyboard;
  - the tailor flow (ask for "add Kubernetes", see it refused, download the PDF);
  - the tracker (save, arrow-key to Interviewing, reload);
  - a phone screenshot upload of a made-up text;
  - both examples in a real browser.
- **Known issues:**
  - The core's explain cap can push gpt-oss to about 90% of its free tokens. Set `DAILY_CHECK_CAP=100` for the demo.
  - qwen is a Preview model, and rewrite has no fallback.
  - Resume guard heuristics are imperfect: "double-checked" is flagged as a number, and lowercase employers are caught only after "at" / "worked for".
  - "Save to tracker" uses placeholders when the report has no company or role.
  - Re-check the `@emnapi` lockfile entries after any Windows `npm install`. A real `npm ci` failed with EPERM on a locked SWC binary, and `npm install` restored node_modules.

## Tier 3: mock interview
**Merged** (`2822cc3`), all three slices on behind flags.
- **Built:**
  - Slice 11: interview shell with recruiter screen and behavioral rounds. Feedback quotes your own answers, and behavioral gets a STAR row. Sessions are in `is:interviews` (max 20).
  - Slice 12: live coding with CodeMirror 6, Python on Pyodide (jsDelivr, in a worker) and JavaScript in a sandboxed worker. Hard timeouts, 5 made-up problems graded locally, optional AI hints.
  - Slice 13: home-made SVG system design board with keyboard support and PNG export. Its JSON goes to the interviewer.
  - Route `/api/interview`: guarded, `INTERVIEW_DAILY_CAP=50`, 12 calls per session, qwen only.
- **Tests:** lint, tsc and build pass, 430 tests, eval 26/26. The Pyodide URL returns 200.
- **Live calls (2 of 4):** a behavioral follow-up question, and behavioral feedback (schema valid, quotes verbatim).
- **Needs your hands-on check:**
  - a behavioral round with one weak and one strong STAR answer;
  - coding in Python and JavaScript, including an infinite loop being stopped;
  - the design board by keyboard only, then PNG export and a follow-up;
  - 320px width and dark mode on all three rounds.
- **Known issues:**
  - The per-session cap trusts the client's `used` count. The per-visitor and daily guards are the real limits.
  - Workers remove network APIs from `self` but not from `WorkerGlobalScope.prototype`. Impact is low, since it is the user's own code in their own browser.
  - The editor's screen-reader label keeps the first language after a switch.
  - Deleting the last board box drops focus to the page.
  - Board labels get small on phones.
  - `@codemirror/view`, `state` and `commands` are not listed in package.json (they arrive through `codemirror`).

## Tier 4: other fields
**Merged** (`cb65b55`). It reuses the Tier 3 shell and adds no route, cap, dependency or storage key.
- **Built:**
  - Slice 14: Business case interview. Four made-up cases, the calculation is checked in code, and there is one AI call for feedback.
  - Slice 15: Finance technical questions. 13 made-up questions (6 numeric, checked in code), 4 per session.
  - Slice 16: Design portfolio walkthrough (links shown, never fetched, up to 5) and a 20-minute design challenge on the board.
  - Feedback has a "Checked by code" row, and the route rejects any round whose flag is off.
- **Tests:** lint, tsc and build pass, 519 tests, eval 26/26, a `next start` smoke test (`/` returns 200, a foreign-origin POST returns 403).
- **Live calls:** 0 of 2. Mocked route tests cover the prompts, checks and link handling.
- **Needs your hands-on check:**
  - a Business case, with the calculation answered in words ("about 4,000 cups");
  - a Finance numeric answer written as "$1.2 million";
  - Design: two made-up links, one follow-up, and a 3-screen flow with the timer running;
  - one live feedback call for a scripted round, to confirm qwen doesn't re-grade the "Check:" lines.
- **Known issues:**
  - Rubric checks are keyword matches, so unusual wording can show "– missing".
  - Question banks must only be appended to, or in-progress sessions shift to different questions.
  - Number reading takes the last number in the answer, so another trailing number can be picked up instead of the final answer.

## Overall hands-on list
Nothing in Tiers 2-4 has been looked at in a real browser. Start with both "Try an example" flows, then the per-tier lists above.
