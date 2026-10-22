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

## Slices
