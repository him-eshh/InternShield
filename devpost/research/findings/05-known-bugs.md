# Findings 05: Known bugs, the fix to make for each, and how to test it

*Research for InternShield, topic 05 of 6. Written Thu Oct 22, 2026, 1:30 AM ET. I read the overview and brief 05 in full. The app source is not on the shared box, so code locations come from the brief. Live doc checks and runnable prototypes are in `findings/05-assets/`. No app code was modified.*
*Labels: **[verified]** means I checked it against official docs or ran it myself tonight. **[unverified]** means it's an inference or I couldn't confirm it. Everything listed is free. Anything that needs an account is flagged.*

---

## 0. TL;DR ranked fix list (severity × effort, 1 dev + AI agents, deadline Mon Oct 26 5 PM ET)

| Rank | Item | Severity | Effort | Before Mon? |
|---|---|---|---|---|
| 1 | **A1** Screenshot route: map errors properly, accept `finish_reason:"length"` as partial, set `reasoning_effort:"none"`, raise `max_completion_tokens` | High (feature fails on a demo-able input) | 1.5–2 h | **Yes, first** |
| 2 | **E** Resume upload keeps lines (pdf.js y-grouping + `hasEOL`; mammoth **HTML**, not raw text) | High (silently breaks tailoring on *every* real upload) | 3–4 h | **Yes** |
| 3 | **A2** Tile tall screenshots (2 strips per request, seam-cut on gaps, overlap merge) | High | 5–7 h | **Yes** |
| 4 | **C** Unit-aware number reader + unit-mismatch message (also fixes standing #2) | Med-High (wrong number on screen) | 3–4 h | **Yes** |
| 5 | **D** Company vs department (stoplist, domain/“at X” priority, LLM `department` field, leave empty when unsure) | Med-High (feeds search, tracker, scoring) | 3–4 h | **Yes** |
| 6 | **B** Save-to-tracker form on its own left-aligned row + focus management | Medium (visible on desktop review) | 1–2 h | **Yes** |
| 7 | **Std #10** Set `DAILY_CHECK_CAP=100` in Vercel, check qwen TPD math (see A) | High if forgotten | 0.25 h | **Yes** |
| 8 | **F** `.gitattributes` + renormalize + normalize in tests | Low (dev only) | 0.5 h | Yes (trivial) |
| 9 | **Std #9** Add `@codemirror/view/state/commands` to package.json | Low, but can break a clean install | 0.25 h | Yes |
| 10 | **A3** Transcript polish: one line per bubble, header/status bar split out (line protocol) | Medium | 2–3 h | Yes if time |
| 11 | **Std #7** Worker sandbox: CSP header on the worker script + prototype-level deletes | Medium (security) | 1–2 h | Yes |
| 12 | **Std #12** Evidence cards: no scroll-reveal under reduced motion, never hidden by default | Medium (a11y, screenshots) | 1 h | Yes |
| 13 | **Std #3** Stable question ids | Low-Med | 1–2 h | Yes (cheap) |
| 14 | **Std #13** Pyodide preload + staged progress | Medium (demo feel) | 1–2 h | Yes if time |
| 15 | **Std #8** A11y: CodeMirror label via Compartment, focus after delete, board label min size | Medium | 2 h | Yes if time |
| 16 | **Std #4** Model IDs via env + text-only fallback for interview; tesseract.js fallback for transcribe | Medium (risk) | 1 h (env) / 4–6 h (OCR) | env yes; OCR post |
| 17 | **Std #11** One Vercel WAF rate-limit rule (Hobby includes 1) | Low-Med | 0.5 h | Optional |
| 18 | **Std #5** Resume-guard false positives/negatives | Low-Med | 1–2 h partial | Partial |
| 19 | **Std #1** Rubric: LLM-judged rubric with quotes (keep stems as a floor) | Medium | 6+ h | **Post-hackathon** |
| 20 | **Std #6** Server-trusted session count (signed cookie) | Low | 2 h | Post-hackathon |

**Deeper design problems behind several bugs**
1. **No typed error contract.** In A, a specific failure becomes the generic error. Every route should return `{ code: "TRANSCRIBE_PARTIAL" | "TRANSCRIBE_FAILED" | "RATE_LIMITED" | "IMAGE_TOO_LARGE" | ... }`, and the UI should map those codes to copy. The generic message should only appear for a code nobody mapped.
2. **Values without types.** A number has no unit (C). A name has no role (D): it's the company or a department. A line has no source (A: bubble or app chrome). In each case the extractor throws away the information that would have prevented the bug. The fix is the same every time: return `{value, unit}`, `{company, department}` and `{kind, text}`.
3. **Normalization destroys structure.** `\s+ → " "` (E) and CRLF/LF assumptions (F) both come from normalizing too early. Normalize at the last possible step, and only what you need to.
4. **Tests inject idealized input, not the real ingestion path.** Bug E slipped through because tests fed multi-line text directly. Add a few "file → pipeline" tests that use real binary fixtures (a made-up PDF, DOCX, and tall PNG).
5. **One preview model with no fallback** handles screenshots, rewording and interviews, and all three share one 8K-TPM budget (see A).

---

## Bug A: Tall screenshots fail

### What the official docs say [verified tonight]
- **Groq vision, `qwen/qwen3.8-27b`:** max **3 images per request**. **Each image counts as 2,048 input tokens.** A request containing an image URL can be at most **20 MB**, and anything larger returns 400. Context is 131K, and **max output is 16,384 tokens**. Sources: [Groq Vision docs](https://console.groq.com/docs/vision), [model card](https://console.groq.com/docs/model/qwen/qwen3.8-27b).
- **Free-tier limits for qwen3.8-27b:** **30 RPM, 1K RPD, 8K TPM, 200K TPD**, applied to the whole organization. A 429 response carries `retry-after`, and the `x-ratelimit-remaining-tokens` header (TPM) is sent on every response. Source: [Groq Rate Limits](https://console.groq.com/docs/rate-limits). The page calls these "base limits for the Developer plan", but they match the free-tier numbers recorded in `hackathon/api-facts.md`. Check the org's Limits page to be sure.
- **Reasoning:** qwen3.8 accepts `reasoning_effort: "none" | "default" | "low" | "medium" | "high"`. Groq's [Reasoning docs](https://console.groq.com/docs/reasoning) say `default` "does not return reasoning tokens". The [model card](https://console.groq.com/docs/model/qwen/qwen3.8-27b), however, calls `default` *thinking mode* and recommends `none` (instruct mode) for general tasks. **Set `reasoning_effort: "none"` explicitly for OCR** so hidden thinking can't eat the output budget. The 1,200-token cap may well be what's being consumed.
- **Qwen-VL image tokenization:** Qwen3-VL uses 16-px patches merged 2×2, so **1 token ≈ 32×32 px**, and images are resized to fit a `max_pixels` budget. Source: [qwen-vl-utils `smart_resize`](https://github.com/QwenLM/Qwen3-VL/blob/main/qwen-vl-utils/src/qwen_vl_utils/vision_process.py) and the [Qwen3-VL README](https://github.com/QwenLM/Qwen3-VL/). Groq charges a flat 2,048 tokens per image. **Inference [unverified]:** Groq probably resizes each image to about 2,048 × 1,024 px² ≈ **2.1 MP**. A strip of about 780×2,600 is then read at near-native resolution, while the current 226×1,600 image (0.36 MP) is already so small that the text is lost before the model sees it. **How to verify (one call each):** send a 780×1,000 strip and a 780×2,600 strip, then compare `usage.prompt_tokens` and the transcription quality.
- **Vercel:** request and response bodies are limited to **4.5 MB**, and anything larger returns `413 FUNCTION_PAYLOAD_TOO_LARGE`. Hobby gets a **300 s** max duration with Fluid compute. Source: [Vercel Functions limits](https://vercel.com/docs/functions/limitations). Base64 adds about 33%.

### Root causes (they compound)
1. **Downscaling to 1,600 px on the long side** makes 30–40 px text about 9–12 px tall.
2. **The 1,200-token cap**, and possibly hidden reasoning tokens.
3. **`length` is treated as a hard error.**
4. **Wrong error mapping:** the user sees the generic message instead of `TRANSCRIBE_FAILED`.

### A1: quick, must-do fixes (1.5–2 h)
- In `lib/server/groq.ts`, add an `allowTruncated` option to the call. When `finish_reason === "length"`, the transcribe route returns `{ ok: true, text, partial: true }` and **drops the last line**, which is probably cut mid-word. Other callers that need complete JSON keep today's behaviour. `finish_reason` values (`stop`, `length`, `tool_calls`, …) follow the OpenAI-compatible schema described in the [Groq API reference](https://console.groq.com/docs/api-reference).
- Set `max_completion_tokens` to about **2,500** for one or two strips. That's roughly 34 messages × ~25–40 tokens plus headroom. The model allows up to 16,384, but every reserved token counts against TPM. Whether Groq counts the *reserved* `max_completion_tokens` toward TPM before generating is **[unverified]**. If it does, a large cap can itself trigger 429s, so keep the cap tight.
- Set `reasoning_effort: "none"` and `temperature: 0`. Do **not** use the model card's instruct preset `presence_penalty: 1.5` for OCR, because it penalizes repeated tokens and real chats repeat words. This is a judgment call, **[unverified]** by testing.
- Error mapping in `transcribe.ts`:
  - `length` → partial text, with UI copy along the lines of: *"We read the top part of this screenshot. Check the text below and paste anything that's missing."*
  - 429 → *"Screenshot reading is busy. Try again in N seconds."* (use `retry-after`)
  - 413/400 image errors → *"That screenshot is too large. Try cropping it, or paste the text."*
  - anything else → `TRANSCRIBE_FAILED`. **Never the generic `MESSAGES.error` on this route.**
- **Partial must never pass silently into scoring.** Show the transcript for the user to review, as the app already does, with the partial note. The report should state that the source was partly read.

### A2: tiling (5–7 h)
- **Client (`lib/tiers/image.ts`):** stop capping the long side at 1,600. Cap the **width** at about 1,080 px (phone screenshots are 720–1,290 wide), then cut **horizontal strips** of about 2.0 MP each. At 780 wide that's roughly 2,560 px per strip, assuming the ~2.1 MP budget above holds.
- **Budget math for the 8K TPM:** 2 images (4,096) + prompt (~400) + output (≤2,500) ≈ **7K tokens**, which fits in one request. Three images (6,144) plus output exceeds 8K TPM and will 429 on the free tier. So:
  - **≤ 2 strips per request.** The prototype `planTiles(780, 5516, {maxTiles: 2})` gives 2 strips of 2,564 px at scale 0.89, so 30 px text becomes about 27 px, which is fine.
  - If more than 2 strips are needed (e.g. a 12,000 px screenshot), either scale down so the text stays ≥ about 16 px, or send a second request after `x-ratelimit-reset-tokens`. Below that text height, ask the user to crop. Use a prompt like *"This screenshot is very long. Upload it in two parts or paste the text."*
  - ⚠️ **qwen's TPM is shared** with resume rewording and interviews. A single 2-strip transcription uses most of that minute's budget. Lower the site-wide daily transcription cap from 20 to about **12**: 12 × 7K ≈ 84K of qwen's 200K TPD, which leaves room for rewrites and interviews. Better still, count tokens using `usage.total_tokens`.
- **Cut on the gaps between bubbles, not through text.** For each row, compute the luminance variance from `getImageData`, sampling every 4th pixel. Within ±120 px of each target cut, move the cut to the middle of the longest "quiet" run of rows (uniform background). This is horizontal projection-profile segmentation, a classic document-layout technique. Chat screenshots have clear gaps between bubbles, so a bubble is rarely split.
- **Keep about 8% overlap anyway** (about 150–200 px, at least 2 text lines) as a safety net, and **merge with suffix/prefix overlap**, not global LCS. Compare the last k ≤ 8 lines of strip i with the first k lines of strip i+1. Normalize each line (lowercase, letters and digits only) and accept a Dice-bigram similarity ≥ 0.85. A partial match on a cut first or last line is allowed only when both lines are ≥ 12 characters. Keep the longer version of each duplicated line. **Global LCS or dedup is dangerous** because it can delete a legitimately repeated short line elsewhere, which is exactly why `dedupeTranscript` keeps repeats under 40 characters. The prototype is in `05-assets/tiles.mjs`, and running `node tiles.test.mjs` shows the cut-line merge working and a short-repeat case surviving. If you'd rather not hand-roll the matcher, [jsdiff `diffArrays`](https://github.com/kpdecker/jsdiff) works with a custom comparator.
- **Payload:** 2 JPEG strips at q 0.85, 780×2,560, are typically 300–700 KB each **[unverified, measure]**. Keep a guard so the total base64 is ≤ 3.5 MB, which stays under Vercel's 4.5 MB. Lower the quality per strip, not the resolution.
- **Order:** send strips in one request, in order, with the prompt *"Image 1 is the top, image 2 continues below it with a small overlap. Transcribe each message once."* Still run the merge afterwards, because the model may repeat lines from the overlap.

### A3: transcript polish (2–3 h)
- **Use a compact, truncation-safe line protocol instead of free text or strict JSON.** Strict JSON schema (which qwen supports per [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs)) is unparseable once truncated by `length`, and the JSON keys cost extra tokens. Ask for one line per item, for example:
  ```
  H|<app or contact header>        (0–2 lines, only at the very top)
  L|<sender if shown>|<full bubble text on ONE line>
  R|<full bubble text on ONE line>
  ```
  - **"One bubble = one line"** fixes the mid-sentence line breaks at the source.
  - **`H|` lines** separate app chrome: the contact name is kept as metadata ("Chat with: …"), because the sender name is evidence. Status-bar lines are dropped.
  - Parse leniently: if a line has no prefix, append it to the previous bubble.
- **Post-filter safety net (first 4 lines of the first strip only):** drop lines matching status-bar patterns, e.g. `^\d{1,2}:\d{2}(\s?[AP]M)?$`, `^\d{1,3}%$`, `^(LTE|5G|4G|Wi-?Fi)$`, carrier names, and "Messages" or "‹ Back". Keep everything else.
- **Reflow fallback** for when the model ignores the protocol: join line *n* with *n+1* when *n* doesn't end in `[.!?…:)"']`, *n+1* starts lowercase, and neither looks like a sender header or timestamp. This is a heuristic and **[unverified]** against real data, so add fixtures.

### Alternatives considered
| Option | Verdict | Source |
|---|---|---|
| **Tesseract.js** (Apache-2.0, v7, WASM, runs in a worker, language data cached in IndexedDB) | Good **fallback** when Groq returns 429 or "busy", and fully on-device (a privacy win). It's weak on dark mode: Tesseract 4+ wants dark text on light, so invert first. It also struggles with colored bubbles, emoji and small text, and gives **no bubble or sender structure**. Expect several MB of download on first use **[unverified size]**. Upscale so capital letters are about 20–30 px tall. **Post-hackathon** (4–6 h), unless Groq's limits bite during the demo. | [tesseract.js](https://github.com/naptha/tesseract.js), [FAQ](https://github.com/naptha/tesseract.js/blob/master/docs/faq.md), [Tesseract ImproveQuality](https://github.com/tesseract-ocr/tessdoc/blob/main/ImproveQuality.md) |
| Scribe.js (built on Tesseract, better models) | Heavier. Post-hackathon only. | [scribe.js](https://github.com/scribeocr/scribe.js) |
| **Shape Detection `TextDetector`** | **Not usable.** It's still behind `#enable-experimental-web-platform-features` in Chrome, and Chrome Status wrongly suggests it shipped. | [Chrome docs](https://developer.chrome.com/docs/capabilities/shape-detection), [web-features #3502](https://github.com/web-platform-dx/web-features/issues/3502) |
| PaddleOCR (WASM/ONNX in the browser) | Strong accuracy but heavy models and setup. Post-hackathon. **[unverified for browser bundle size]** | none checked |
| Client-side canvas slicing before upload | **Yes.** This is the A2 recommendation, and it keeps each request under 4.5 MB. | [Vercel limits](https://vercel.com/docs/functions/limitations) |

### Tests
- **Unit (Vitest):**
  - `planTiles` keeps `textScale × typicalTextPx ≥ 16` for 780×5,516, 1,170×2,532 and 1,170×12,000 (the last should ask the user to crop or send a second request), and never produces more than 2 strips per request.
  - `findSeam` lands inside a synthetic gap.
  - `mergeTiles` handles four cases: a cut line, an exact duplicate, a short repeat from different senders (must survive), and no overlap.
  - Line-protocol parser cases: missing prefix, a `|` inside the text, and a truncated last line.
- **Route test:** mock Groq. `finish_reason: "length"` should return 200 with `partial: true` and the last line dropped. 429 should give the busy copy with seconds. 413 should give the crop copy. A thrown error should give `TRANSCRIBE_FAILED`, and **never** `MESSAGES.error`.
- **Fixture eval:** render a **made-up** 34-message chat to PNG at 780×5,516 using an HTML template and Playwright `page.screenshot({fullPage:true})`, in light and dark mode. Keep the known text. Metrics: **line recall** ≥ 95% (fuzzy ≥ 0.85), **duplicate rate** ≤ 2%, and **header leakage** = 0.
- **Live smoke** (2 calls, so watch TPM): the tall fixture and one normal screenshot. Log `usage.prompt_tokens` to confirm the 2,048-per-image figure.

---

## Bug B: the Save-to-tracker form sits inside the centered button row (1–2 h)
**Fix:**
- Lift the open/closed state into the report footer. Render the buttons row, then *below it* a full-width block: `{open && <div className="mt-4 w-full text-left"><SaveToTrackerForm/></div>}`. The minimal patch, if lifting state is awkward, is to give the form wrapper `basis-full w-full text-left` so it breaks onto its own flex line. Lifting the state is cleaner because the Tailor and Practice buttons then stay put.
- Follow the [WAI-ARIA disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/): the trigger gets `aria-expanded` and `aria-controls`. On open, focus moves to the Company input. On Cancel or Escape, focus returns to the trigger. After saving, announce it with `role="status"`.
- **Phones (≤ 640 px):** show the form as a bottom sheet using a native [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) with `showModal()`, which provides the focus trap, Escape to close, and `::backdrop` for free. Make sure the on-screen keyboard doesn't cover the inputs ([WCAG 2.2, 2.4.11 Focus Not Obscured](https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum)).

**Tests:**
- Playwright at 1,440×900 and 390×844 with `expect(page).toHaveScreenshot()` ([visual comparisons](https://playwright.dev/docs/test-snapshots)). Mask dynamic text and run in one OS or browser, because the baselines are platform-specific.
- DOM checks with `expect(form).toHaveCSS('text-align','left')` ([locator assertions](https://playwright.dev/docs/api/class-locatorassertions)). The form's bounding box top should be greater than the Tailor button's bottom, and `toBeFocused()` should hold on the Company input after open and on the trigger after cancel.

---

## Bug C: '$1.2 million' to a percent question shows '1,200,000%' (3–4 h)
**I tested the candidate libraries tonight** on the brief's tricky-input table (`05-assets`):

| Library | Result | Verdict |
|---|---|---|
| **Microsoft Recognizers-Text** (`@microsoft/recognizers-text-suite` 1.3.1, MIT, repo active 2026) | Best coverage. It gets "$1.2 million", "$1.2M", "seven and a half percent", "7,5%" and "1.2 billion dollars" right, and returns typed results (`currency…Dollar`, `percentage`). It fails on "7½%" and ranges ("7–8%" → 8%). **About 1.44 MB minified, 358 KB gzipped**, too heavy for the client. | Use as a **dev-only test oracle**, or server-side post-hackathon. [repo](https://github.com/microsoft/Recognizers-Text) |
| **compromise** 14.19 (MIT) `.numbers()/.percentages()/.money()` | It gets scale words and spelled-out numbers. It **drops the minus sign** ("-7.5%" → 7.5), reads "7,5%" as 75, and misses "7½%" and "7–8%". `.money()` returned `null` values. About 152 KB gzipped. | Not reliable enough for grading. [repo](https://github.com/spencermountain/compromise) |
| **currency.js** | A money *arithmetic and format* library. "$1.2 million" → 1.2, "7–8%" → 78. | Wrong tool. |
| **numbro.unformat / numeral** | Locale formatting. "1.2mm" → 1.2e12, and many inputs return NaN. numeral was last published in 2017. | Wrong tool. |
| **dinero.js** | Money objects only, with no text parsing. | Wrong tool. |
| **@nlpjs** builtin/NER | Only 5.0.0-alpha builds since 2025. | Skip. |
| **`Intl.NumberFormat`** | **Formatting only, there's no parser.** Use [`formatToParts`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/formatToParts) to *display* the user's number in their own unit (`style:"currency"` or `"percent"`). | Use for display. |

**Recommendation: a ~60-line grammar of its own** (a tokenizer plus a regex for `[sign|(] [currency] number [range] [scale] [unit] [)]`). The prototype is `05-assets/parseAnswer.mjs`, and **`node test.mjs` passes 19/19** of the brief's cases: `$1.2M`, `1.2mm`, `(1.2)`, `–7.5%`, `7.5 pct`, "seven and a half percent", `7½%`, `7–8%` (as a range), `approx 7.5` (flagged approx), `≈7.5%`, `7,5%`, `0.075`, `12 bps` and others. The design:
- `extractNumber` returns **all** candidates as `{text, value, unit: "$"|"%"|"bps"|"x"|"", scale, range?, approx, index}`. The existing cue order then picks one (this also helps standing issue #2).
- **`checkUnit(candidate, expectedUnit)`:**
  - percent expected and a bare number with |v| < 1 → read as a fraction (0.075 → 7.5%), with the note *"We read 0.075 as 7.5%"*
  - bps → divide by 100
  - **any explicit unit mismatch** → not graded as correct, with the message *"This question expects a percent, but your answer looks like a dollar amount."*
- **Display the user's number in the user's unit** in `Feedback.tsx` and `describeCheck()`: "Your final number: $1,200,000 (expected a percent)". Never append the question's unit to the user's value.
- **Ranges:** grade as correct if the expected value falls within the range and the range width is within tolerance (e.g. ≤ 2× tolerance), or simply show "we used the midpoint".
- Known ambiguity: "1.2mm" could mean millimetres, but in finance context it means million. "1,200" with a comma is treated as thousands, and "7,50" as a European decimal.

**Tests:**
- A Vitest table test with the 19 cases plus ten more you add, e.g. "final answer: 7.5%, though WACC could be 8%", "1.2 M USD", "−$3.4bn", "7.5 per cent", "7.5x".
- Run MS Recognizers as an oracle in one dev-only test to catch regressions.
- Component test: `Feedback` renders "$1,200,000" and the mismatch note.
- Playwright: answer "$1.2 million" on the WACC question and assert the text contains `$1,200,000` and not `%`.

---

## Bug D: the company field takes the department 'University Recruiting' (3–4 h)
**Fix, cheapest first, in `lib/autofill.ts` plus the extractor:**
1. **A department stoplist and a "head noun" check.** Reject a candidate company whose last 1–3 words are department words: `Recruiting, Recruitment, Talent( Acquisition)?, HR, Human Resources, People( Ops| Operations)?, Hiring, Staffing, Campus, University( Relations| Recruiting)?, Early Careers?, Emerging Talent, Careers, Team, Department, Dept, Office, Group (when preceded by a department word)`. Use a lazy capture plus an explicit list instead of the greedy `(<Name>) (?:[Rr]ecruiting )?[Tt]eam`. For example: `/\b(?:from|with|on) the ((?:[A-Z][\w&.-]+ ){0,3}?)(?:(?:University|Campus|Early Careers?|Talent Acquisition|Recruiting|HR|People|Hiring|Staffing) )+[Tt]eam\b/` captures `""` for "from the University Recruiting team" (no company), `"Globex"` for "from the Globex Campus Hiring team" and `"Initech"` for "on the Initech Recruiting team" (I ran all three tonight). A department team on its own says nothing about the company.
2. **Priority order of sources:**
   1. the **registrable domain** of a non-free-mail sender address or signature link, via `tldts` (already in the stack), e.g. `northwind-labs.com` → "Northwind Labs" as a hint
   2. "at/with/from **X**" followed by an org suffix (Inc, LLC, Ltd, Corp, Labs, Technologies, Group, Bank, Capital, Partners, University only when not followed by a department word)
   3. signature-block lines (the last 6 lines after a sign-off token such as "Best", "Regards", "Thanks"; pattern credit: [mailgun/talon](https://github.com/mailgun/talon), Python, ideas only)
   4. the "X team" rule only after the stoplist check
   
   **When two sources disagree, show both or leave the field empty with a hint** ("We couldn't tell the company. Is it Northwind Labs?"), as the brief proposes.
3. **LLM extraction schema:** add separate fields: `company`, `company_quote`, `department`, `department_quote` and `company_source: "email_domain"|"signature"|"body"|"none"`. The prompt rule: *a team, department, or office name (e.g. "University Recruiting", "Talent Acquisition") goes in `department`, never `company`.* Server-side, run the same stoplist on the LLM's `company` and demote it if it fails. The quote check proves the words exist, and the stoplist proves the role. Groq strict structured outputs support both gpt-oss models ([Structured Outputs](https://console.groq.com/docs/structured-outputs)).
4. **Optional second signal:** `compromise` `.organizations()`, tested tonight. It caught "Northwind Labs", "Contoso Ltd" and "Globex Corporation's" (strip the 's), and returned nothing for "the Early Careers team", so it never proposed the department. It **missed a suffix-less "Initech"**, so use it only as a tiebreaker. A browser BERT-NER via [transformers.js](https://huggingface.co/Xenova/bert-base-NER) is **about 108 MB** even int8-quantized (checked on Hugging Face), so it's **not worth it** for a hackathon. wink-nlp's lite model doesn't tag ORG **[unverified]**.

**Eval:** add 30–40 **made-up** sign-offs and intros to the test fixtures, labeled `{company, department}`. Include department-only, subsidiary ("AWS, an Amazon company"), free-mail senders, an "X University" company, lowercase names, and scam look-alikes ("Amazon-careers-hr.net"). Metrics: company exact-match precision (target ≥ 95%) and **wrong-fill rate**, where leaving the field empty counts as better than a wrong answer (target ≤ 2%). Add the "University Recruiting" message as a regression test in both the autofill unit test and a Playwright check that the Company field is empty or shows the hint.

---

## Suspected issue E: uploaded resumes lose their line breaks (confirmed; 3–4 h)
**I confirmed the mechanism tonight** on a local resume PDF (contents not copied anywhere) with pdfjs-dist 5.6.205. Joining items and collapsing `\s+` produced **0 newlines in one 5,300-character line**. Rebuilding lines from item positions produced **58 lines, 20 of them bullet lines**. 57 items had `hasEOL: true`.
- **pdf.js facts [verified in pdfjs-dist 5.6.205 types and source]:** `TextItem` has `str`, `dir`, `transform` (6-element matrix: `[4]` = x, `[5]` = baseline y), `width`, `height`, `fontName` and **`hasEOL`** ("followed by a line-break"). pdf.js also emits empty `str:""` items carrying `hasEOL:true`. Sources: [`api.js` (TextItem typedef)](https://github.com/mozilla/pdf.js/blob/master/src/display/api.js), [PDFPageProxy docs](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html).
- **Fix for PDF** (prototype in `05-assets/pdfLines.mjs`):
  1. Group items into rows by baseline `transform[5]`, within a tolerance of 0.4 × font height (`|transform[3]|`).
  2. Sort rows top to bottom (PDF y grows upward) and items left to right by `transform[4]`.
  3. Insert a space when the gap is more than 0.25 × font height.
  4. Collapse only `[ \t\u00a0]+`, never `\n`.
  
  Use `hasEOL` as a tiebreak or for simple single-column PDFs. **Two-column resumes:** detect a large, consistent x-gap and emit the left column before the right column. That's a post-hackathon refinement, so for now just make sure it doesn't crash.
- **Fix for DOCX [verified in mammoth 1.13.0 source]:** `extractRawText` follows each paragraph with `\n\n`, but it **drops list bullets**, because Word bullets live in numbering properties, not in the text. It also **drops soft line breaks** (`w:br`). Its raw-text converter emits nothing for `break` elements. Use **`mammoth.convertToHtml`** instead. Its default style map turns list paragraphs into `ul/ol > li` and line breaks into `<br>`. Then walk the HTML with `DOMParser`: `li` → `"• " + text`, `h1–h6`/`p` → their own line, `br` → newline. Sources: [mammoth.js README](https://github.com/mwilliamson/mammoth.js) ("Each paragraph is followed by two newlines"), `lib/raw-text.js` and `lib/options-reader.js` default style map.
- **Guard:** if the result has fewer than 5 newlines per 1,000 characters, show *"We couldn't keep this resume's layout. Paste the text instead for best results."*

**Tests:** commit **made-up** `resume-simple.pdf`, `resume-two-column.pdf` and `resume-bullets.docx` (generate them with pdf-lib and a docx template). Assert ≥ N lines, the expected bullet count, the header and contact lines detected, and that "only bullets are selectable" works end to end through `lib/tiers/tailored.ts`. Add a Playwright upload test using `setInputFiles`.

---

## Test-environment issue F: CRLF fixtures (0.5 h)
- Add `.gitattributes`:
  ```
  * text=auto eol=lf
  tests/fixtures/** text eol=lf
  *.png -text
  *.pdf -text
  *.docx -text
  ```
  Then run `git add --renormalize .` and commit. This is the documented procedure in [gitattributes, "End-of-line conversion"](https://git-scm.com/docs/gitattributes). The docs also note that when `text` is set but no `eol` is given, Windows defaults to CRLF, hence the explicit `eol=lf`. Use `-text` instead of `eol=lf` for any fixture that must be byte-exact, such as a CRLF test input you *want* to keep.
- Existing Windows clones only pick up the change on re-checkout. Ask before running anything destructive, and prefer `git checkout -- tests/fixtures` after committing.
- **Belt and braces:**
  - In the tests, read fixtures through a `readFixture()` helper that does `.replace(/\r\n?/g, "\n")`.
  - Add **one deliberate CRLF test** that builds the CRLF string in code, so the normalization path stays covered.
  - Add [EditorConfig](https://editorconfig.org) `end_of_line = lf` and Prettier [`endOfLine: "lf"`](https://prettier.io/docs/options#end-of-line), which is already Prettier's default.
- **Test:** run CI on `windows-latest` as well as `ubuntu-latest` (free for public repos; private repos use free minutes, **[verify plan minutes]**), or at least run `git config core.autocrlf true && git checkout .` locally once.

---

## Standing known issues 1–13
| # | Fix (source) | Effort | Risk | Test | When |
|---|---|---|---|---|---|
| 1 Rubric = keyword stems | Keep stems as a floor. Add an LLM judge that returns `{criterion, met, quote}` per rubric item, with the quote checked word for word (the same pattern as the scam extractor). Until then, change the copy from "not mentioned" to "we didn't spot this; it may be worded differently". **Symptom of a deeper issue:** string matching standing in for judgment. | 0.5 h (copy) / 6+ h (judge) | Judge adds token cost on the shared qwen TPM | 20 paraphrased good answers should have ≥ 80% marked met | Copy now, judge post |
| 2 Number cue order | Use the C parser's candidate list. Pick the "final answer" cue, else the last candidate **with the expected unit**, else the last. Show "We read your final number as X. Not right? Edit." | 1 h (with C) | Low | Table tests with distractors | **Now (with C)** |
| 3 Append-only banks | Give every question a stable `id`. Sessions store ids, not indexes, and seeded selection picks from the id list. Fall back to the index for old sessions. | 1–2 h | Low | Insert a question mid-bank and check that an old session still resolves the same ids | Now |
| 4 Preview model, no fallback | Put model IDs in env (`VISION_MODEL`, `INTERVIEW_MODEL`) so a swap needs no code. Interview falls back to `openai/gpt-oss-20b` (text only). Transcribe falls back to Tesseract.js (post) or a clear "paste the text" message. Watch [Groq deprecations](https://console.groq.com/docs/deprecations). | 1 h / 4–6 h | Medium | Mock a 404 "model not found" and check the fallback path | Env and interview fallback now, OCR post |
| 5 Resume guard | Number regex should require a digit token: `(?<![\w-])\d[\d,.]*%?(?![\w-])`, so "double-checked" no longer reads as a number. Titles: compare normalized token sets (Jaccard ≥ 0.8) instead of exact strings. Employers: also check against capitalized org names from the original resume. Soft inflation ("led" → "spearheaded"): a small verb-strength map, warn-only. | 1–2 h partial | False negatives remain | Table tests | Partial now |
| 6 Client-trusted session cap | HMAC-signed cookie `{sessionId, count, exp}` checked server-side, stateless. The per-visitor and daily caps remain the real limit. | 2 h | Low | Tamper test | Post |
| 7 Worker sandbox | Workers **don't inherit the page's CSP** unless they're blob/data URLs. Set a `Content-Security-Policy: default-src 'none'; script-src 'self' 'wasm-unsafe-eval'` header on the worker script's own response via Next `headers()` ([MDN: CSP and workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers), [worker-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/worker-src)). With `connect-src` falling back to `'none'`, fetch, XHR and WebSocket are blocked by the browser even if a prototype method survives. Also delete from `WorkerGlobalScope.prototype` / `Object.getPrototypeOf(self)` (fetch, XMLHttpRequest, WebSocket, EventSource, importScripts, indexedDB, caches, BroadcastChannel) as defence in depth. If the JS worker is a blob URL, switch to a same-origin file so the header applies. | 1–2 h | Medium: Pyodide needs `'wasm-unsafe-eval'` and its CDN or self-hosted files in `script-src`/`connect-src`, so give it a separate policy | A worker test that tries `fetch`, `Object.getPrototypeOf(self).fetch.call(self, …)`, `importScripts` and `new WebSocket`, and expects each to be blocked | Now |
| 8 A11y | CodeMirror: put `EditorView.contentAttributes.of({"aria-label": …})` in a `Compartment` and `reconfigure` it on language switch ([CodeMirror ref](https://codemirror.net/docs/ref/#view.EditorView^contentAttributes)). Board: after deleting a box, focus the previous box, else the "Add box" button. Labels: min 12 px / `0.75rem`, never scaled below that. | 2 h | Low | Playwright `toHaveAttribute('aria-label', /Java/)` after switch; `toBeFocused()` after delete | Now if time |
| 9 Undeclared deps | `npm i @codemirror/view @codemirror/state @codemirror/commands` at the versions already resolved in the lockfile | 0.25 h | Low | Clean install with `npm ci` in CI | **Now** |
| 10 Token budget | Set `DAILY_CHECK_CAP=100` in Vercel (Production). Use `reasoning_effort:"low"` for gpt-oss on explain, and cap explain at about 400 output tokens. Optionally use an in-memory LRU on the message hash for repeat demo checks (no persistence). | 0.25 h | High if forgotten | Read `x-ratelimit-remaining-tokens` after 5 checks | **Now** |
| 11 In-memory counters | Free option: **one Vercel WAF rate-limit rule**. Hobby includes 1 rate-limit rule (IP key, fixed window 10 s–10 min) and 1M allowed requests ([Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)). Apply it to `/api/*`. Alternative: Upstash Redis free tier (**needs an account**; [pricing](https://upstash.com/pricing); I didn't check whether a card is required). | 0.5 h | Low | Burst 30 requests and expect a 429 | Optional now |
| 12 Evidence scroll animation | Content must be visible by default, so there's no `opacity:0` before JS. Under `prefers-reduced-motion: reduce` ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)) render statically. With Motion, use `useReducedMotion` or `MotionConfig reducedMotion="user"` ([Motion accessibility](https://motion.dev/docs/react-accessibility)). Animate once on mount, not on every scroll. | 1 h | Low | Playwright `emulateMedia({reducedMotion:'reduce'})` and check all cards are visible immediately; full-page screenshot | Now |
| 13 Pyodide 5–15 s load | Start `loadPyodide()` in the worker as soon as the user picks a coding round on the setup screen (or on `requestIdleCallback`). Show staged progress ("Downloading Python… Starting… Ready"). Pre-load only the packages you need. Make sure the files are served with long-cache headers so the second load is fast ([Pyodide JS API](https://pyodide.org/en/stable/usage/api/js-api.html)). | 1–2 h | Low | Playwright: the Run button is enabled within X s on a warm cache; check the status text sequence | Now if time |

---

## Suggested order for Thu–Mon (ET)
- **Thu after the 3 PM review:** A1, standing #10, #9, F (about 3 h total, all low-risk).
- **Fri:** E (PDF + DOCX + fixtures), then C (parser + display + tests).
- **Sat:** A2 tiling + merge + fixture eval, then A3 line protocol.
- **Sun:** D, B, standing #7, #12, #3, then #13 and #8 if time.
- **Mon morning:** live smoke (2 screenshot calls, 3 checks, 1 interview), Playwright visual baselines, freeze by noon.

## Unverified items to check quickly
- Whether Groq resizes images to about 2.1 MP (the 2,048-token budget), and whether `max_completion_tokens` is reserved against TPM. Verify with `usage` and the response headers on 2 calls.
- JPEG strip sizes, the Tesseract.js first-load size, wink-nlp ORG support, and PaddleOCR's browser bundle size.
- GitHub Actions Windows-runner minutes on the repo's plan, and whether Upstash's free tier needs a card.
