# Tier 2 summary (slices 7-10)

**Status: merged to main** (`27a8fc8 Tier 2: core polish, tailored resume PDF, tracker, screenshot upload`), Oct 21 2026 ~06:50 ET. Branch `tier2` kept. Nothing pushed.

## What's built
- **Lockfile fix (main, `bb58163`).** `npm ci` on Linux wanted top-level `@emnapi/runtime` and `@emnapi/core` 1.11.3. Windows npm prunes them on every `npm install`, so they were added by hand (`npm ci --dry-run` passes). **If anyone runs `npm install` on Windows again, re-check that both entries are still in `package-lock.json`.**
- **7 Core polish.** The resume step says what it read ("Read N words. Skills we spotted: ..."). Source and stage are marked optional, with a "Paste a message to check it." hint: in code the button only ever needed text, and the engine already asks the source as a quick question. The explanation is capped at 2 paragraphs and each quote appears once (`tidyExplanation`). Match rows stack at 320px. Clear my data now has an inline confirm. Quick questions are proven for a realistic made-up message with no source (engine and render tests). `questions.ts` is unchanged.
- **8 Tailored resume PDF.** Opened from the profile chip ("Tailor my resume") or a report ("Tailor my resume for this", hidden on high-risk reports). You pick one resume line and `/api/rewrite` (qwen, guarded, 40/day site-wide, 15/day per visitor) suggests wording. `resumeGuard` rejects any added numbers (including spelled-out ones), names, employers, titles or tools. A before/after diff has to be accepted before anything changes. The PDF is built with pdf-lib. Only the chosen line is sent to the AI, and the copy says so.
- **9 Tracker.** Saved / Applied / Interviewing board, kept in `is:tracker`. Cards come from "Save to tracker" on a report or are added by hand. Cards move by buttons or arrow keys, with notes and delete-with-confirm. Clear my data wipes it.
- **10 Screenshot upload.** The browser downscales the image to 1600px JPEG, then `/api/transcribe` (qwen vision, 3 MB body cap, 30/day site-wide, 6/day per visitor) copies the text into the message box, tagged "from screenshot, check it". The image is never stored, cached or logged, and the Intro privacy line says so. tesseract.js wasn't needed.

## Tests and gates (main, after merge)
lint ✓ · tsc ✓ · vitest **290/290** (was 175) · build ✓ · eval **26/26** · `git diff core-v1 -- lib/scoring eval/messages` empty. A new `tests/tiers/examples.test.ts` shows both "Try an example" flows land in high and low from saved results with every route failing.

## Live calls: 2 of 4
1. `/api/transcribe` on the app's own share image: qwen read it, 836 + 23 tokens.
2. `/api/rewrite` with a made-up bullet and posting: honest rewording that didn't pull in the posting's tools, 155 + 15 tokens.

## Needs Himesh's hands-on check (morning)
- The UI hasn't been looked at in a browser this session. Please check:
  - the resume confirmation line;
  - the posting match at 320px;
  - the Clear-my-data confirm with the keyboard;
  - the tailor flow (pick a line, ask for something invented like "add Kubernetes", see it refused, download the PDF);
  - the tracker (save the real example, arrow-key it to Interviewing, reload);
  - a phone screenshot upload of a made-up text.
- Both example flows in the real browser.

## Known issues
- **Token budget:** at worst, the core's own explain cap (2× checks) can push the gpt-oss pair to about 90% of its free tokens. Setting `DAILY_CHECK_CAP=100` for the demo restores the 25% headroom. Tier 2 runs only on qwen (about 58% of its budget at full caps), and rewrite has no gpt-oss fallback.
- **qwen is a Preview model.** If Groq drops it, rewrite and transcribe show the calm "busy" message, and the core is unaffected.
- **Resume guard heuristics:** "double-checked" is flagged as a number. A multi-word title has to appear as the same phrase in the resume. Lowercase employers are only caught after "at" / "worked for".
- **"Save to tracker" placeholders:** when the report had no company or role, the card saves "Unknown company" / "Role not listed".
- A real `npm ci` on this machine failed with EPERM because the Next SWC binary was locked by a running process. node_modules was restored with `npm install`.
