# v3 interview QA evidence

## Gates

Final application source: `c710ba0` on `v3-interview` (Oct 25, 2026).

- `npm run lint`: green (two existing warnings in `qa/v2-check-heldout-lint.mjs`).
- `npx tsc --noEmit`: green.
- `npx vitest run`: 78 files, 1,232 tests green.
- `npm run build`: green.
- `npm run eval`: 88/88; held-out 24/27, zero low-risk false positives.
- Exact gate output: `qa/gates-out.txt` (ignored local artifact).

## Automated quality evidence

| Requirement | Evidence |
|---|---|
| Five questions across coding, behavioral and SQL, exact automatic end | `qa/v3-interview-session.mjs`: all four variants; 5 answered, 5 unique main questions, 11 mocked API requests including intel |
| N rounds and early stop | `qa/v3-interview-edge.mjs`: 2 behavioral rounds end at exactly 6 questions; matrix early stop reaches saved summary; engine tests keep the answered current turn on early stop |
| Rounds, topics, custom questions, difficulty respected | `tests/tiers/session.test.ts`: generated slots, real Amazon/array/Hard bank selection, verbatim custom wording, duplicate custom removal, no unrelated fallback on exhausted filters |
| Real bank, metadata only, permissive source provenance | `tests/tiers/bank.test.ts`: 1,130 unique questions, valid public URLs/difficulties, exact allowed metadata fields, size under 2 MB; `data/question-bank/SOURCES.md` records both MIT licenses, pinned commits and retrieval date |
| Follow-ups and no repeats | Matrix exercises follow-ups; engine tests enforce 0-2 follow-ups, no duplicate main questions or runnable IDs (including skips), and Mixed difficulty changes |
| Python, TypeScript and SQL still execute | Matrix uses real Pyodide and SQL workers and asserts every hidden test passes. Edge QA executes typed TypeScript with the real compiler/worker. All existing runner tests remain green |
| Intel sources and fallback | Matrix shows cited company card and preselects its stages. Edge QA verifies limited research uses the Amazon-style preset. `v3-session-intel.test.ts` rejects uncited values/stages |
| Refresh resumes useful work | Matrix reloads during a follow-up and verifies its unfinished draft. Edge QA reloads before code submission and verifies TypeScript source and approach text. Engine tests round-trip state and reject damaged storage |
| Free-tier budget and offline continuation | Route tests allow call 30 and reject call 31 before a model request. Edge QA resumes at 30 calls, gives a clear message and completes without AI. Hints remain noted in recaps |
| Scorecards use evidence | Failed-SQL regression prevents positive model feedback from hiding local query failure. The final server review discards model-written achievement and STAR claims even when a quote matches; it uses exact quote occurrence and browser test counts for visible evidence. Only rounds with runnable results receive quality bands; discussion and untested rounds show “Not scored.” Older saved summaries hide previous model prose. Completeness uses the chosen question count |
| Responsive and reduced motion | Matrix has no horizontal overflow at 390; early-stop summary checked at 320. Desktop coding is wide, phone coding stacks. Captures use reduced motion; celebration skips motion and progress is immediate. Edge QA also checks the normal-motion celebration reaches its final state within 1.2 seconds; configured duration is 0.6 seconds |

## Browser commands

Use the user's hidden launcher on port 3200; never use port 3000. Set:

```powershell
$env:QA_BASE='http://localhost:3200'
$env:QA_SHOTS='[project root]\.git\internshield-relay\v3-shots\interview'
$env:QA_OUT='qa/v3-interview-edge-out.txt'
node qa/v3-interview-edge.mjs --loud
$env:QA_OUT='qa/v3-interview-matrix-out.txt'
node qa/v3-interview-session.mjs --matrix --loud
```

All `/api/interview` and `/api/intel` calls are mocked. Browser runtime assets use their existing public, free CDNs. No live model or company-intel calls were made. Servers are stopped after each capture round by verifying the exact interview worktree's Next command line, then terminating that owned process tree.

## Screenshot index

36 captures, nine states at `1440-light`, `1440-dark`, `390-light`, `390-dark`.
Root: `[project root]\.git\internshield-relay\v3-shots\interview`.

Filename format: `v3-interview-<state>-<variant>.png`.

| State | Shows |
|---|---|
| setup | Round cards, topics, language, difficulty, custom questions and session length |
| intel | Cited company stages and behavioral value themes |
| coding | Wide desktop / stacked phone Python editor, hydrated before capture |
| feedback | Specific strength and concrete improvement |
| followup | Interviewer's follow-up and answer control |
| progress | Question 3 of 5, round counts and filled segments |
| end-confirm | Native, focus-contained end confirmation |
| summary | Overall and per-round scorecards, strengths, next drills and recaps |
| history | Completed session on Practice home |

Feedback and follow-up use the same combined view (feedback above the next interviewer question).

`review-<state>.jpg` contact sheets contain every full capture for inspection. Fixed mobile navigation naturally appears at viewport height in full-page shots; scrollable content remains reachable. Development overlays are hidden by the QA capture helper, not by product code.

Final capture inspection and server-stop confirmation are recorded in `v3-interview-log.md`.
