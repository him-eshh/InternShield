# Tier 3 summary: mock interview

**Merged to main** as `2822cc3` ("Tier 3: mock interview ..."). All three slices are live behind flags that are now `true`.

## What's built
- **Slice 11, interview shell (everyone).** "Practice an interview" from the profile chip, from a report (hidden on high-risk reports), and on Interviewing cards in the tracker. Setup takes company, role, a pasted job description and "Use my resume" (first 1,500 characters only). Rounds are Recruiter screen and Behavioral. Questions come one at a time, and the first question is local, so it uses no AI call. Feedback shows quotes from your own answers (checked to be verbatim) and, for behavioral, a STAR row with text marks. Sessions are saved only in `is:interviews` (max 20) and wiped by Clear my data.
- **Slice 12, live coding (tech).** CodeMirror 6 editor, lazy-loaded, where Tab indents and Escape then Tab leaves. Python runs on Pyodide 314.0.7 from jsDelivr in a Web Worker; JavaScript runs in a sandboxed worker. Both have hard timeouts, terminate on Stop, and have network APIs removed. 5 made-up problems with hidden tests are graded locally and deterministically. AI hints are optional and never see or claim a test result.
- **Slice 13, system design board (tech).** Home-made SVG board: add, move, rename, connect and delete boxes by pointer or keyboard. Arrows are also listed as text, and the board exports as PNG. Its compact JSON is described to the interviewer for follow-ups and feedback.
- **Route** `/api/interview`: guard (origin, 16 KB body, 6/min and 30/day per visitor), `INTERVIEW_DAILY_CAP=50` site-wide, a per-session cap of 12 calls, qwen/qwen3.8-27b only (the core's gpt-oss budget is untouched). Inputs are capped and fenced as untrusted data, and only token counts are logged.

## Test results (main, after merge)
lint clean, tsc clean, **430 tests** (32 files), build OK, **eval 26/26**, `git diff core-v1 -- lib/scoring eval/messages` empty. CodeMirror is only in lazy chunks; the home page doesn't load it. The Pyodide URL returns 200. Both "Try an example" flows still pass their saved-results tests.

## Live calls: 2 of 4
1. Behavioral follow-up question: 200, relevant question.
2. Behavioral feedback: 200, schema valid, both quotes verbatim, sensible STAR marks; 279 + 301 tokens.

## Process notes
- The previous session stopped mid-build. Its uncommitted worker output was committed as WIP (`d94837e`) and finished here.
- There were two review passes. Pass 1 found 1 blocker: a hint saved a fake "0 of 5 passed" result. Pass 2 found no blockers. All blockers and should-fixes were fixed, plus most nits.

## Needs the owner's hands-on check
- Behavioral round for a made-up posting: give one weak and one strong STAR answer, then read the quotes.
- Coding: solve one problem in Python (first load takes a few seconds) and one in JavaScript. Write an infinite loop and watch it get stopped.
- Design: build client → server → database + cache using only the keyboard, export the PNG, then ask for a follow-up.
- Check 320px width and dark mode on all three rounds. The board shrinks to fit, so its labels get small on phones.

## Known issues / left as-is
- The per-session cap trusts the `used` count the client sends. The real limits are the per-visitor and daily guards.
- The workers remove network APIs from `self` but not from `WorkerGlobalScope.prototype`. The code is the user's own and runs in their own browser, so the impact is low.
- The editor's screen-reader label keeps the first language after a switch. Deleting the very last board box drops focus to the page.
- `@codemirror/view`, `state` and `commands` are imported directly but arrive through `codemirror`. They are not listed in package.json.
