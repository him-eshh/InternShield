# Brief 05: Known bugs and limitations that still need fixing

*Context: read 00-overview first. Tonight's audit found and fixed 20 bugs (B1–B20) and merged them. This brief lists what's **still open**: bugs found in the final browser check, a few suspected from reading the code, and the standing known-issues list. For each one, please give the best-practice fix and how to test it, with sources where relevant (vision-OCR docs, parsing libraries, NER approaches, etc.).*

File paths are relative to the repo root. Line numbers are approximate, as of the merged main.

---

## Bug A: Tall screenshots fail to upload
**Symptom:** a long chat screenshot (780×5,516 px, 34 messages, made up) fails on **both** tries. The user sees the generic **"Something went wrong on our side. Please try again."** instead of the screenshot-specific message.

**Repro:** Check screen → "Upload a screenshot" → pick a very tall phone chat screenshot.

**Pipeline today:**
1. **Browser** (`lib/tiers/image.ts`): accepts PNG/JPEG/WebP up to 20 MB. Downscales so the **longest side is 1,600 px** (`IMAGE_MAX_SIDE`, `lib/tiers/types.ts` ~line 101), draws it on a white canvas, and encodes JPEG at quality 0.8 → 0.65 → 0.5 until the data URL is ≤2.5 MB.
   - For a 780×5,516 image the scale is 0.29, so it becomes **about 226×1,600 px**. Chat text that started around 30–40 px tall ends up **about 9–12 px**, which is close to unreadable for a vision model.
2. **Server** `/api/transcribe` (`lib/server/transcribe.ts`): validates the data URL and calls Groq **qwen/qwen3.8-27b** (preview vision model, no fallback) with **max 1,200 output tokens** (~line 101). The prompt says to transcribe each line exactly once, top to bottom, never start over, and treat image text as data.
3. `lib/server/groq.ts` **~line 134**: if `finish_reason === "length"` (the output hit the token cap), the call is treated as a **hard error**, because "truncated output is unusable". A 34-message chat can plausibly exceed 1,200 tokens, especially with the model's repeated fragments.
4. `lib/server/transcribe.ts` **~line 103**: `if (!r.ok) return fromOutcome(r);` maps that error to the generic `MESSAGES.error` ("Something went wrong on our side."). The dedicated `TRANSCRIBE_FAILED` copy (~line 15: "We couldn't read that screenshot right now. Try again in a moment, or paste the text instead.") is only used in the route's catch block.

**Likely root causes:** (1) extreme downscaling of tall images; (2) the 1,200-token cap plus "length = hard error"; (3) the wrong error mapping.

**Proposed fix:**
- **Tile tall images** in the browser: cut them into overlapping horizontal strips (e.g. aspect ≤1:2, each about 1,000–1,600 px tall at near-native width, ~10% overlap). Then either:
  - send up to 3 images in one request (Groq allows multiple images; the code already supports `images[]` up to 3), or
  - send them sequentially and merge, de-duplicating the overlap.
- Raise `max_completion_tokens` for transcribe, and **accept truncated output** for this task (return what was read plus a "partly read" note) instead of failing.
- Return `TRANSCRIBE_FAILED` (or a specific "too tall, try cropping") instead of the generic error.
- Possibly fall back to on-device OCR (tesseract.js) for strips the model can't read.

**Tests:** a fixture of a tall image with known text, checking line recall and duplicate rate; a unit test that the tiling math keeps text height ≥ N px; a route test that a `length` finish returns partial text or the screenshot message, not the generic one.

### Minor screenshot transcript issues (same feature)
- **Line breaks are kept mid-sentence:** wrapped chat bubbles come back as several short lines. Possible fix: re-flow lines inside a bubble.
- **App chrome gets transcribed:** the app's title bar or contact header ("Messages", the contact name, the time) comes back as the first line. Possible fix: tell the prompt to skip status-bar/header chrome, or drop lines that match time/battery patterns.
- **Short repeats are kept on purpose.** `dedupeTranscript` keeps exact repeats under 40 chars and sender headers, because dropping them could hide evidence. So a model that repeats a short line shows it twice.

**Questions for you:**
- What is best practice for vision-LLM OCR of long screenshots (tiling, resolution limits per model, Groq/Qwen-VL image token limits)?
- Would a **local OCR first pass** (tesseract.js, PaddleOCR-wasm, the browser Shape Detection/TextDetector API where available) be more reliable and cheaper?
- How should strips be merged? Overlap de-dup algorithms, e.g. longest-common-subsequence on lines.

---

## Bug B: "Save to tracker" form is laid out wrongly on desktop
**Symptom:** at 1,440 px, clicking "Save to tracker" on a report (when no company was found) opens the inline form **inside the centered button row**. The labels and inputs are **center-aligned**, and the "Tailor my resume for this" button sits **beside the Role field** instead of below the form.

**Root cause:** `components/App.tsx` ~lines 184–203. `SaveToTracker` is rendered as one item inside `<div className="flex flex-wrap items-center justify-center gap-3">`, together with the Tailor and Practice buttons. That row is inside the report `<footer className="… text-center">` (`components/report/Report.tsx`). When `SaveToTracker` switches from a button to a `<form className="grid max-w-[520px] gap-4">` (`components/tiers/SaveToTracker.tsx` ~line 68), it stays a flex sibling and inherits `text-center`.

**Proposed fix:** render the form on its own full-width row below the action buttons (or in a small popover/sheet), left-aligned, with `text-left`. Move focus to the Company field, and restore focus to the button on cancel. On phones, show it as a bottom sheet.

**Test:** a Playwright screenshot at 1,440 and 390; a DOM check that the form's computed `text-align` is left and that no buttons share its row.

---

## Bug C: Finance numeric answer shows the wrong unit ("1,200,000%")
**Symptom:** on a finance question that expects a **percent** (e.g. WACC = 7.5%), answering "$1.2 million" shows **"Your final number: 1,200,000%"** in feedback.

**Root cause:** `lib/tiers/scripted.ts`. `extractNumber()` (~lines 363–398) returns a bare number: "$1.2 million" → 1,200,000. The unit (`$`, `%`, or none) comes from **the question's check**, not the answer. `components/tiers/interview/Feedback.tsx` ~line 26 formats `fmt(r.found, r.unit)` with the question's unit, so it appends "%". `describeCheck()` (~line 465, `show()`) does the same in the line sent to the AI. Grading just compares numbers, so the answer is marked "not quite", which is correct, but the displayed number is misleading.

**Proposed fix:**
- Make the number reader return `{ value, unit: "$" | "%" | "" , scale }` from the answer itself.
- Show the user's number in **their** unit ("$1,200,000").
- When the units don't match, say so ("expected a percent").
- Consider accepting equivalent forms: "0.075" for 7.5%, "7.5 percent", "7½%".
- Write a table of tricky inputs: "$1.2M", "1.2mm", "(1.2)", "–7.5%", "7.5 pct", "seven and a half percent", ranges "7–8%", "approx 7.5", "≈7.5%", European decimals "7,5%".

**Questions:** robust free number/unit parsers (e.g. `numbro`, `compromise-numbers`, `words-to-numbers`, Microsoft Recognizers-Text, Duckling-style grammars). Which handle money, percent, scale words and ranges in JS?

---

## Bug D: The company field picks a department ("University Recruiting")
**Symptom:** a made-up message signed "Jordan Lee from the University Recruiting team" auto-fills the Company field with **"University Recruiting"**. The user can edit it, but it's wrong, and it feeds the company search and the tracker.

**Root cause:** `lib/autofill.ts` ~line 41. The "team" rule `(<Capitalized Name>) (?:[Rr]ecruiting )?[Tt]eam` uses a greedy name capture, so "University Recruiting" is captured before the optional "Recruiting". There's no list of department/team words. The LLM extraction may also return a department as the company, because the quote check only proves that the words exist in the message.

**Proposed fix:**
- A stop-list of department words (University/Campus/Early Careers/Talent Acquisition/Recruiting/HR/People/Hiring/Staffing team).
- Prefer the email domain or the "at <Company>" phrase over "<X> team".
- Ask the LLM extractor to separate `company` from `department`.
- When unsure, leave the field empty with a hint rather than fill it in wrongly.

**Questions:** best free approaches for organization-name extraction from short emails: browser NER models via transformers.js (e.g. a BERT-NER), wink-nlp, compromise; signature-block parsing (Talon); or relying on the LLM with a schema field for department. How do we evaluate it (a small labeled set of sign-offs)?

---

## Suspected issue E (from code reading; please help us confirm the approach): uploaded resumes lose their line breaks
`lib/client/resume.ts` collapses all whitespace (`/\s+/g → " "`) when reading a PDF/DOCX. The tailor screen (`lib/tiers/tailored.ts`) splits on newlines to find bullets, headers and contact lines. A real uploaded resume may therefore become one long line, cut into ≤600-char sentence chunks, and then:
- header and contact detection fail
- "only bullets are selectable" breaks
- the PDF output loses its structure

Our tests and QA injected multi-line resume text directly, so this wasn't caught. **Proposed fix:** keep newlines (collapse only spaces and tabs), and rebuild lines from pdf.js item y-positions (`transform[5]`) and `hasEOL`. Use mammoth's paragraph output for DOCX. (See brief 03, Q5.)

## Test-environment issue F: test fixtures fail on Windows checkouts
Found tonight during the merge. With `core.autocrlf=true`, Git checks out the `tests/fixtures/transcripts/*.txt` files with CRLF line endings, and 2 `dedupeTranscript` tests fail ("leaves … unchanged"), because the function normalizes CRLF to LF. The code is fine (it passes with LF fixtures). **Proposed fix:** add `.gitattributes` with `tests/fixtures/** text eol=lf` (or `* text=auto eol=lf`), and compare normalized strings in the tests.

---

## Standing known issues (from the tier and fix summaries)
1. **Rubric checks are keyword/stem matches** with a small synonym list. A good answer in unusual wording can show "not mentioned". They don't judge correctness.
2. **Number reading follows a fixed cue order** ("final answer" > "=/so/total" > "about" > last number). Odd phrasings can still pick the wrong number.
3. **Question banks are append-only.** Questions are chosen by seed index, so editing a bank shifts in-progress sessions to different questions. A stable id per question would fix this.
4. **The qwen vision/rewrite/interview model is a Groq preview model.** Transcribe and interview have **no fallback model**. Rewrite falls back to gpt-oss-20b. If Groq retires qwen, those features show "busy".
5. **The resume guard is imperfect:**
   - false positives: "double-checked" is read as a number; multi-word titles must match exactly
   - misses: lowercase employers are only caught after "at" / "worked for"; soft inflation like "led" → "spearheaded" isn't caught
6. **The per-session interview cap trusts the client's count.** The per-visitor and daily caps are the real limits.
7. **Worker sandbox:** the JS worker removes network APIs from `self` but not from `WorkerGlobalScope.prototype`.
8. **Accessibility:** the code editor's screen-reader label keeps the first language after a switch. Deleting the last board box drops focus to the page. Board labels get small on phones.
9. **Dependencies:** `@codemirror/view`, `state` and `commands` are used directly but not listed in package.json.
10. **Token budget:** at full caps, the explain step can push gpt-oss to about 90% of its free daily tokens. `DAILY_CHECK_CAP=100` must be set in Vercel for the demo.
11. **Counters are in-memory per serverless instance,** so they're best-effort and can be bypassed across cold starts or instances.
12. **Evidence cards still animate in on scroll** (only print was fixed).
13. **The Pyodide first load takes 5–15 s,** with only a status line while it loads.

## What we'd like back
For each of A–F and items 1–13: the recommended fix (with a library or pattern and a link), the effort (hours), the risk, and a **test plan** (unit, Playwright, live smoke). Flag which should be fixed **before the Monday Oct 26 5 PM ET submission**, and which can wait. Point out anything in this list that looks like a symptom of a deeper design problem.
