# v2 integration log

## I0
- Heads: v2-base 36ad123, v2-check fe84e11, v2-tools afb173d. Both streams have summaries.
- Baseline (v2-base): lint 0 errors, tsc clean, vitest 39 files / 645, build OK, eval 26/26.

## I1 merge
- `V2 merge: check stream`: no conflicts. Gates: vitest 58 / 966, eval 88/88.
- `V2 merge: tools stream`: no conflicts (README/CLAUDE.md/uxPass/fixTiers merged cleanly). Gates: vitest 73 / 1190, eval 88/88.
- Flake: `tests/tiers/v2-resumeLines.test.ts` PDF case (and known `pdf.test.ts`) time out under full-suite load; passes alone. Describe-level `timeout: 20_000` added to both.

## I1 needs integration
- App `onLine` passes `code` -> Checklist "resting for today" on DAILY_CAP.
- Report/ReportFooter `extras` accepts `(level) => ReactNode`; App gates Tailor/Practice on the live level, saves the tracker card with the live level. CSS `data-level` workaround removed.
- Intro "Get started" -> Check (profile asked lazily: header "Add profile" pill when no profile; Couldn't-check already says "Add your profile to add this check"). Profile cancel returns to report/check.
- guard: `MAX_IMAGE_BODY_BYTES` 3 MiB -> 3.6 MiB, `TRANSCRIBE_DAILY_CAP` default 20 -> 12; `MAX_IMAGE_DATA_URL` 3.0M -> 3.5M (findings A2). `.env.example`: cap 12 + optional VISION/INTERVIEW/REWRITE_MODEL.
- CSP (`next.config.ts`): all three workers load only from jsDelivr; header value already allows them (runtime check in I5).
- Not done (optional): moving sql/debugging rounds into App's maps (they work inside Interview.tsx); checking screen inside the report layout.

## I2 seams (qa/v2-integration-seams.mjs, mocked)
- Intro "Get started" -> Check, "Add profile" pill shown. Scam example: Risk 100 "Strong signs of a scam", no Tailor/Practice, Save present. Real example: Risk 0 "No red flags found", Tailor/Practice/Save present. Overflow 0.
- Quick answer "Deposit a check" on the real example: 0 -> 85 high, Tailor/Practice disappear (live level).
- Practice from the report: Company=Stripe, Role=Software Engineering Intern (Summer 2027) prefilled. Tailor without resume asks for one.
- TS + SQL runners work under the pinned worker CSP (qa/v2-tools-t4.mjs via qa/v2-integration-run.mjs).

## I2 reviewer (Opus, read-only): no blockers
- Fixed: errorCopy for TRANSCRIBE_FAILED/PARTIAL; tier client network failure carries `code: "UNKNOWN"`; worker CSP pinned to the three package folders; types comment "Not sure".
- Accepted: the rewrite no-invented-facts guard runs in the browser only (every option shown in the UI passes `guardRewrite`; a raw API caller only gets text about their own resume). `@codemirror/*`, `sql.js`, `motion` came from the approved V2 setup 2 commit. `motion-safe:animate-pulse` on "Thinking" stays (CSS, reduced-motion gated). Header chip Tailor/Practice still use the first report level (in-report buttons use the live one).

## I3 a11y, reduced motion, brand, copy (qa/v2-integration-a11y.mjs, mocked, 1440 light+dark)
- 8 screens (intro, check, both reports, tracker, tailor, interview setup, profile): 0 text below 4.5:1 (rendered colors), every Tab stop has a visible ring, 0 console errors. Only "unnamed" hit is the aria-hidden file input behind "Upload a screenshot" (by design).
- Profile menu: Escape closes, focus returns to its button. Reduced motion: no running animations on the report, nothing left at opacity 0 (shot 70-reduced-motion-report-instant-1440-*).
- Logo/icon/apple icon/OG done by check C9 (`app/apple-icon.tsx` is code-made, kept).
- Copy: medium label "Some warning signs, double check before you reply" -> "Some warning signs" (the action line under it says what to do; matches the brief's terms; prd.md wording differs). Tracker empty state cut to one sentence.

## I4 live smoke (qa/v2-integration-live.mjs, next dev :3000, made-up content). 9 live calls of 10.
| # | Call | Result | Latency |
|---|---|---|---|
| 1 | Check: scam example (UI) | pass: Risk 100 "Strong signs of a scam", 2 critical; company null; explain AI | 8.2 s |
| 2 | Check: real example (Stripe) | pass: Risk 0 "No red flags found", posting found on stripe.com, 13/14 checks; company 307 ms (Wikidata, no Tavily latency); explain = fallback by design (0 flags) | 7.3 s |
| 3 | Check: made-up link scam (stripe-careers-onboarding.com, gmail) | pass: Risk 95 high, "A link copies the company's website" High, private-details Critical | 6.7 s |
| 4 | Transcribe: multi-paragraph email | pass: 11 lines, 0 dupes | 1.4 s |
| 5 | Transcribe: tall 34-message chat (right after #4) | 429 RATE_LIMITED from Groq (retryAfter 8); UI: "Screenshot reading is busy. Try again in 8 seconds." | 1.1 s |
| - | retry 10 s later | local per-IP limiter 429 in 32 ms (no upstream call, not counted) | - |
| 6 | Transcribe: tall chat, 65 s later | pass: 2 strips, 1946 chars, 29 lines (35 expected), 0 dupes. ~6 lines missing; full text wasn't logged -> known issue | 3.0 s |
| 7 | Rewrite count 3 | partial: 200, but the 3 texts were identical, deduped to 1 option; heldBack SQL/Tableau/present findings (correct) | 1.0 s |
| 8 | Interview question (behavioral) | pass | 0.5 s |
| 9 | Interview feedback | pass: summary + STAR items with quote | 1.0 s |
- Fix (mock + test, no live re-run): multi-rewrite prompt now requires the 3 texts to differ from each other and the original; `tests/api/v2-tools-rewrite.test.ts` asserts it.
- Known: the explainer sometimes quotes a flag title as if it were message text (call 3). Transcribe tall chat drops a few lines (call 6).

## Assertions changed (test, old, new, why)
- `tests/api/transcribe.test.ts` "rejects a body over 3 MB" -> over 3.6 MB. Why: body cap raised for two-strip tall screenshots.
