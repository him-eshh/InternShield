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

## Assertions changed (test, old, new, why)
- `tests/api/transcribe.test.ts` "rejects a body over 3 MB" -> over 3.6 MB. Why: body cap raised for two-strip tall screenshots.
