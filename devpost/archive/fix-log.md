# Fix + audit log (branch `fix`)

Brief: `devpost/fix-brief.md`. Started 2026-10-21 ~20:12 ET.

## Phase 0: baseline on `fix` (= ux f928080 + brief)
- `npm run lint` clean · `npx tsc --noEmit` clean · `npx vitest run` 34 files / **547 passed** · `npm run build` ok · `npm run eval` **26/26** · `git diff ux -- lib/scoring eval/messages` empty.
- Added `playwright` (Apache-2.0) as a devDependency for the QA harness. Re-added the two `@emnapi` lockfile entries Windows npm pruned.

## QA harness
`qa/*.mjs` drive headless Chromium against `npm run dev` (port 3000) with every `/api/*` call mocked from the saved example results (`qa/lib.mjs`). Output goes to `qa/out.txt`, screenshots to `.git/internshield-relay/fix-shots/` (never committed). `qa/make-shots.mjs` renders made-up chat screenshots; `qa/live-transcribe.mjs` is the only script that makes live calls.

## Live calls
| # | When | What | Result |
|---|---|---|---|
| 1 | Phase A | transcribe `long` made-up chat (390px wide, 34 bubbles) | 36 lines, 0 duplicates; header line moved to the end |
| 2 | Phase A | transcribe `multi` made-up email (5 paragraphs) | **bug a reproduced**: full text, then the header and every paragraph again as broken fragments ("e Marketing Intern position at Blue") |
| 3-4 | Phase C | transcribe `multi` + `short` after Fix 1 | calls were made, but the script still waited on the old "Reading your screenshot" copy and read the box too early; no result recorded |
| 5 | Phase C | transcribe `multi` retry | "busy" from the per-visitor limit (most likely stopped by the guard before Groq; counted anyway) |
| 6 | Phase C | transcribe `multi` after Fix 1 + Fix 5 | **fixed**: the email once, 11 lines, 0 duplicate lines, no fragments |

Total: 6 (budget ~10). No live check, rewrite or interview calls.

## Bugs (Phase A hunt, before any code change)
Width/theme: 1440 light unless noted. Shots are `NN-screen-width-theme-before.png`.

| id | where | steps | cause | fix | test | commit |
|---|---|---|---|---|---|---|
| B1 | Check · Upload a screenshot | upload `qa/shots/multi.png` (live call 2) | Vision model re-reads the image in tile-sized fragments after the full transcript; the route returned its output as-is. Client sends one image and replaces (not appends) the text, so not a client bug. | prompt: each line once, top to bottom; server `dedupeTranscript` cuts a restart and drops repeated lines / fragments of earlier lines | | |
| B2 | Report (low) | real example → footer | ux added `CopyReportButton` on low reports | remove on low; keep in "What to do now" for medium/high | | |
| B3 | Report · quick questions | real text pasted without source → answer | thanks shows at the bottom of the box (under all questions), and the box sits at the top of the report, so a thanks appears near the top; heading changes with the count | confirmation renders directly under the answered question, only after answering; heading fixed "A few quick questions" | | |
| B4 | Report (scam) at 320 | scam example, 320 light | `brightline.datasolutions.hr@gmail.com` quote can't wrap: 62px sideways scroll | break long words in evidence quotes | | |
| B5 | Interview · Live coding · Python | Python → Run examples | `importScripts()` of jsDelivr Pyodide fails with NetworkError in current Chromium **and Edge** (fetch of the same URL works). Python never runs. | module worker + `import(pyodide.mjs)` (verified loading + `1+1` in Chromium and Edge) | | |
| B6 | Report when message reading failed | `?fail=extract`, or all routes 500 | report says "No red flags found" with "1 of 14 checks ran" and nothing says the result is incomplete | banner says the message couldn't be read so the result is incomplete | | |
| B7 | Report · posting card | `?fail=company` / daily cap / network down | posting search never ran, but card says "We couldn't find this role in a search of the company's site" | say the posting couldn't be checked when the step didn't run | | |
| B8 | Save to tracker | message with no company/role → Save | placeholders "Unknown company" / "Role not listed" saved | App passes empty values; Save asks for company (role optional) inline | | |
| B9 | Profile chip | stored profile with a level the app doesn't know | chip reads "Tech ·" | chip skips unknown parts | | |
| B10 | Interview · case/finance rubric | reasonable answers ("number of students, how many drink coffee") | keyword matching, no synonyms/stems: most rubric rows "– missing" | stems + synonyms; softer "not mentioned" wording | | |
| B11 | Interview · numeric checks | "four thousand", ranges, trailing numbers | last number in the answer is taken; words not read | pick the stated final number; read number words, units, ranges | | |
| B12 | Tailor · rewrite | qwen down | rewrite had no fallback model | gpt-oss-20b fallback (`lib/server/groq.ts`) + clear retry message | | |
| B13 | Tracker · add by hand | add an application | "Added Acme Robotics" shows at the top of the page, far from the form | confirmation next to the form | | |
| B14 | Report · retry banner | any failed step | 3 sentences for one idea | one short line | | |
| B15 | Report · evidence cards | print or full-page capture | cards stay `opacity-0` until scrolled into view | always visible in print | | |
| B16 | Tracker card | saved from a low report | says "Low risk"; report said "No red flags found" | use the report's own level labels | | |
| B17 | Whole app copy | every screen | too many words (brief d) | see Copy changes | | |

Later finds (Phase C): B18 rate-limit/daily-cap banners lost their reason behind "incomplete" (combined); B19 fallback explanation listed all 6 flags with quotes that the cards right below repeat (top 3, no quotes); B20 tracker add-by-hand required a role while Save-from-report didn't (role optional in both; `addCard` fixed instead of a duplicate helper).

## Slices (each: worker → orchestrator gates → reviewer → commit)
| commit | slice | owner | bugs | tests |
|---|---|---|---|---|
| `50994de` Fix 0 | QA harness + this log | orchestrator | - | - |
| `ad47f99` Fix 1 | transcribe prompt + `dedupeTranscript`, rewrite fallback to gpt-oss-20b (700 tokens) | api-builder (Sonnet) + orchestrator (`groq.ts`) | B1, B12 | `tests/api/transcribeDedupe.test.ts` (fixtures `tests/fixtures/transcripts/{short,long,multi}.txt`, one-image-per-request route test), `rewrite.test.ts` fallback tests |
| `13b2784` Fix 2 | report + check screen | ui-builder A (Sonnet) | B2, B3, B4, B6, B7, B9, B14, B15, B17, B18 | `tests/ui/fixReport.test.tsx`, `quickQuestionsReal.test.tsx`, `uxPass.test.tsx` |
| `9e1478c` Fix 3 | tiers: Python module worker, Save-to-tracker company form, confirmations, labels | ui-builder B (Sonnet) + orchestrator (`App.tsx`, `tracker.ts`) | B5, B8, B10 (wording), B13, B16, B17, B20 | `tests/ui/fixTiers.test.tsx`, `tracker.test.ts`, `interview.test.tsx` |
| `0c50b0a` Fix 4 | number reading + rubric stems/synonyms | engine-builder (Opus) | B10, B11 | `tests/tiers/scriptedFix.test.ts` |
| `e983382` Fix 5 | full-review fixes: no cut at a repeated sender header, stricter cues/synonyms, CSP on the Python worker, honest rewrite wait | orchestrator | review | dedupe header test, weak-cue/generic-synonym tests, rewrite long-wait test |
| `fcbe892` Fix 6 | fallback explanation: top 3 signs, no repeated quotes | orchestrator | B19 | `explainTidy.test.ts` "at most 3 signs" |

Reviews: reviewer on the UI slices (0 blockers, 8 should-fixes, all applied before Fix 2/3 were committed); full reviewer on `ux...fix` (1 blocker: dedupe could cut a chat at a repeated sender header and drop a payment ask; 5 should-fixes; all fixed in Fix 5).

## Copy changes (before → after, notable)
- Quick questions heading: "Answer N quick questions to make this more accurate" → "A few quick questions"; thanks: "Thanks, we updated the score. …" → "Thanks. Score updated: …" (under the answered question).
- Retry banner: "Some checks didn't finish. They're listed under Couldn't check. Retry runs only those." → "Some checks didn't finish."; "We're busy right now. Try again in a moment. The checks that finished are below." → "We're busy. Try again in a moment."; new "We couldn't read the message, so this result is incomplete."
- Posting: "We couldn't find this role in a search of the company's site. That doesn't count against the message. Roles don't always show up in a search." → "We couldn't find this role on the company's site. That doesn't count against the message." / "We couldn't check the posting." when it didn't run.
- Report: "There wasn't much to check in this message. …" → "Not much to check here. …"; "Example (saved results)" → "Example (saved)"; footer "Look up the company's own website to apply or verify." → "Check the company's own website."
- Check form: "from screenshot, check it" → "from screenshot"; "That message was longer than 4,000 characters, so we kept the first 4,000." → "Too long. We kept the first 4,000 characters."; "We couldn't find it. Add it if you have it." → "No sender found. Add it if you have it."; "Paste a message to check it." → "Paste a message first."
- Intro: "Paste a recruiter message and see the evidence in seconds" → "Paste a recruiter message. See the evidence."; privacy line shortened, same meaning.
- Resume step: "… Only a line you choose to reword is ever sent to an AI." → "It goes to an AI only when you reword a line or practice with it." (now also true for interviews).
- Screenshot: "We couldn't read that screenshot. Try again, or paste the text instead." → "Couldn't read that screenshot. Try again or paste the text."; "Reading your screenshot…" → "Reading screenshot…".
- Tracker: "Kept in this browser only. Use the buttons on a card, or the arrow keys, to move it along." → "Saved in this browser."; risk tag "Low risk" → "No red flags found" (report's own labels).
- Tailor: privacy line → "Only the line you pick and the job details go to an AI. The rest stays here."; "Applies to every suggestion. Facts stay the same…" removed; "Pick a bullet to reword. Your name, contact details and section headings stay as they are." → "Pick a bullet to reword."; retry → "Couldn't reword that right now. Try again in a minute."
- Interview: intro (2 long sentences) → "Answer a few questions, get feedback. Answers stay here; an AI sees the current practice."; new hint under "Use my resume": "Sent to the AI with your answers."; portfolio help (3 sentences) → one; round blurbs and board hints shortened; feedback "– missing" → "not mentioned".
- Fallback explanation: 6 bullets each ending "They wrote: …" → top 3 bullets, quotes only on the evidence cards.

## Final gates (on `fix`, after Fix 6)
lint clean · tsc clean · vitest 38 files / **641 passed** · build ok · eval **26/26** · `git diff ux -- lib/scoring eval/messages` empty · `git diff core-v1 -- lib/scoring eval/messages` empty. Dev server stopped; nothing listening on 3000-3999 (`qa/ports.mjs`).
