# Fix + audit summary (branch `fix`)

Everything is on `fix` (7 commits on top of `ux`, `Fix 0`–`Fix 6` + this summary). Not merged into `ux` or `main`, nothing pushed. Details, steps and causes per bug: `devpost/fix-log.md`.

## Bugs found and fixed
| id | bug | cause | fix | commit |
|---|---|---|---|---|
| B1 | Screenshot text repeats chunks | Vision model transcribes the message, then starts over in broken tile-sized fragments; the route returned it as-is (client sends one image and replaces the text, so not a client bug) | prompt says each line once, never restart; server `dedupeTranscript` cuts a restart (first two lines again, in order) and drops long repeats/fragments; short lines and sender headers always stay | Fix 1, 5 |
| B2 | Copy report on low reports | added on every level in `ux` | removed from low; medium/high keep it | Fix 2 |
| B3 | Quick-questions thanks "on top" | thanks sat at the bottom of the whole box, which is at the top of the report; heading changed with answers. (`main`, which the deploy runs, still has the thanks *in the heading*: that's likely what you saw) | heading always "A few quick questions"; "Thanks. …" appears only after answering, directly under the question just answered | Fix 2 |
| B4 | Scam report scrolls sideways at 320px | long email quote couldn't wrap | quotes/titles wrap anywhere | Fix 2 |
| B5 | **Live coding: Python never ran** | `importScripts` of Pyodide from jsDelivr fails with NetworkError in current Chromium and Edge | Python runner is a module worker using `import(pyodide.mjs)`; verified pass/fail, 8s timeout + kill, editor usable after | Fix 3 |
| B6 | "No red flags found" when the message couldn't be read | nothing said the result was incomplete | banner: "We couldn't read the message, so this result is incomplete." (scoring untouched) | Fix 2 |
| B7 | Posting card claimed a search ran when it didn't | not-run and not-found shared one message | "We couldn't check the posting." when the step didn't run | Fix 2 |
| B8 | "Unknown company" saved to tracker | placeholders in `App.tsx` | unknown company/role passed as empty; Save asks for the company inline (role optional) | Fix 3 |
| B9 | Profile chip "Tech ·" | stored profile with an unknown level | chip joins only known parts | Fix 2 |
| B10 | Interview rubric "– missing" for fine answers | exact keyword match | whole-word stems + a small synonym map; wording "not mentioned" | Fix 3, 4, 5 |
| B11 | Number checks took the last number | no answer cues, no words/ranges | cue order (final answer > = / so / total > about > last), number words, units, ranges → midpoint, per-day side notes skipped | Fix 4, 5 |
| B12 | Resume rewrite had no fallback | qwen (Preview) only | falls back to gpt-oss-20b; short retry message; long waits say "busy"/"resting", not "a minute" | Fix 1, 5 |
| B13 | Tracker "Added X" at the top of the page | status line placed under the intro | shown next to the Add button, after adding; checked every other confirmation | Fix 3 |
| B14 | Retry banner: 3 sentences | - | one short line per case | Fix 2 |
| B15 | Evidence cards blank when printed | scroll-in animation starts at opacity 0 | `print:` overrides, reduced-motion respected | Fix 2 |
| B16 | Tracker said "Low risk", report said "No red flags found" | own labels | report's level labels | Fix 3 |
| B17 | UI says too much | - | copy cut on every screen (below) | Fix 2, 3 |
| B18 | Rate-limit/daily-cap banner lost its reason | B6 message took priority | reason + "incomplete" together | Fix 2 |
| B19 | Explanation repeated every card's quote | fallback listed 6 flags with quotes | top 3 signs, no quotes | Fix 6 |
| B20 | Tracker: role required by hand, optional from report | two rules | role optional everywhere (`addCard`) | Fix 3 |
| review | Python code could reach the network via `import()` in the module worker | module workers keep dynamic import | CSP header on `/workers/py-runner.js` (jsDelivr only); verified Pyodide loads and `import('https://example.com/…')` is blocked | Fix 5 |

Each fixed bug has a regression test (see fix-log Slices table).

## Copy changes
Full before → after list: `devpost/fix-log.md > Copy changes`. In short: quick questions, retry banner, posting card, check form hints, intro, resume step, screenshot status, tracker intro, tailor and interview intros each lost one to three sentences. Privacy meaning kept, and two lines became more honest (the resume is also sent when you use it in a practice interview, which now says so).

## What changed per screen
- **Intro / profile:** shorter headline, privacy line and step helpers; resume line now mentions interviews.
- **Check:** shorter hints; "Paste a message first." under the disabled button; "No sender found…"; screenshot tag "from screenshot".
- **Report:** no Copy report on low; quick-question thanks under the answered question; one-line banners incl. "incomplete"; posting "couldn't check" state; explanation = verdict, top 3 signs, next step; long quotes wrap; prints fully.
- **Save to tracker:** asks for the company when the report has none; focus moves to "Open my applications".
- **Tracker:** "Saved in this browser."; role optional; confirmation by the form; report's level labels.
- **Tailor:** shorter text; retry message matches the server; download confirmation next to the button.
- **Interview:** shorter setup; "Use my resume" says it's sent to the AI; feedback "not mentioned"; Python works; board export confirmation in the toolbar; challenge "Time's up. Explain your design, then finish."

## Gate results (final, on `fix`)
lint clean · `tsc --noEmit` clean · vitest **641 passed** (38 files; was 547) · build ok · eval **26/26** · `git diff ux -- lib/scoring eval/messages` empty · `git diff core-v1 -- lib/scoring eval/messages` empty.

## Live calls used: 6 of ~10
All transcribe calls on made-up screenshots (2 to reproduce, 4 to verify; 2 of those were read too early by my script, 1 hit the per-visitor limit). No live check, rewrite or interview calls. Table in fix-log.

## Screenshots
`.git/internshield-relay/fix-shots/` (212 PNGs, never committed), named `NN-screen-width-theme-before|after.png`:
01 check · 02 report scam · 03 report real · 04 report with questions · 05 questions answered (box + full page) · 06 chip menu · 07 tailor · 08 tracker · 09 interview setup · 10 interview round start (recruiter, behavioral, case, finance, portfolio) · 11 feedback per round · 12/13 coding (JS, Python) · 14 board · 15 design challenge · 16 tracker notes · 17 intro · 18 profile steps 1-5 · 19 clear-data confirm · 20-29 error states (fail-extract/company/sender/posting/explain, rate limit, daily cap, network down, not a job, no company).
- **after:** every screen at 1440 light, 1440 dark, 390 light, 390 dark and 320 light (interview rounds, coding and error states at 1440 light + 390 dark).
- **before:** 1440 light for every screen, plus reports at 390 dark and 320 light. The other before combos weren't taken: once workers started editing, the dev server would have shown half-fixed screens.

## Remaining issues / needs your hands-on check
- **Quick questions on the real deploy:** the deploy runs `main`, which still shows the thanks in the heading. Check on `fix` locally (`npm run dev`, real example text without picking a source, answer once) at phone and desktop width.
- **Screenshot upload from your phone** with a long made-up chat: the text should appear once.
- **Live coding in Python** in your browser: first run loads Python (~5-15 s), an endless loop stops after 8 s, and the editor stays usable.
- **Save to tracker** from a report with no company: the inline form, then the card.
- **Tailor fallback** is untested live: if qwen is down, gpt-oss-20b rewrites (700-token cap). A rewrite can briefly push 20b into its rest window, so a check at that moment uses 120b for extraction. Acceptable at the 30/day rewrite cap.
- **Known limits kept on purpose:** the transcript cleanup keeps short repeated lines (under 40 chars) and sender headers, because dropping them could hide evidence; a model that repeats a short line will show it twice. Number reading follows a fixed cue order, so odd phrasings can still pick the wrong number; rubric synonyms are a small hand list.
- Evidence cards still animate in on scroll (only print was fixed).

## Pending owner review
- Merge `fix` into `ux`/`main` and deploy (not done: the brief says leave it on `fix`). Run the secret scan before pushing.
- Whether `qa/` (Playwright harness, committed; `playwright` is a devDependency) should stay in the repo or move out before submission.
