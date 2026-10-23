# InternShield v2 tools log

Branch `v2-tools` from `v2-base` 36ad123. Brief: `devpost/v2-brief-tools.md`. Progress: `devpost/v2-progress-tools.md`.

## Baseline (Oct 22, before any change)
- lint clean, tsc clean, vitest 39 files / 645 tests, build OK, eval 26/26.

## Checklist
### T0 Start
- [x] baseline gates
### T1 Data bugs
- [x] Bug E resume line breaks (pdf rows, mammoth HTML, parse preview, PDF/DOCX fixture tests)
- [x] Bug C unit-aware number reader (19-case table + extras, unit mismatch copy, "We read your final number as X")
- [x] Bug A1 screenshot route codes, partial on `length`, reasoning_effort none, 2,500 tokens, UI copy per code
### T2 Tall screenshots + model resilience
- [x] Bug A2 tiling (planTiles, findSeam, mergeTiles, 2 strips/request, <= 3 MB, see Decisions)
- [x] groq.ts env model ids, interview fallback 20b, 429 retry-after one retry, RATE_LIMITED, 404 test
### T3 Interview core
- [x] duplicated "6 of 6 hidden tests passed"
- [x] wide coding layout, dark code theme (no purple), CodeMirror aria-label Compartment
- [x] 4-area scorecard + feedback screen, flip `scorecard` (QA 05-coding-*, 06-scorecard-*, qa/v2-tools-t3.mjs)
### T4 Runners
- [x] TypeScript runner (CDN typescript.js in js-runner, transpile only, load cap 30 s then 3 s run cap), flip `tsRunner` (QA 07-ts-*: run, endless loop -> timeout -> editor reruns, syntax error line)
- [x] SQL round (sql.js worker, multiset grader, 6 questions, reference queries in vitest), `SqlRound.tsx`, flip `sqlRound` (QA 08-sql-*)
- [x] worker hardening (prototype deletes incl. Worker/SharedWorker/WebTransport, import() refused, output/log/row caps, kill on timeout) + tests (tests/tiers/v2-workers.test.ts). CSP header already in next.config.ts from setup.
### T5 Debugging + presets + round cards
- [x] debugging round (5 programs Py/JS/TS, lib/tiers/debugging.ts, reuses CodingRound with "Fix"/"What was the bug?" copy; JS reference fixes + TS-transpile parity in tests/tiers/v2-debugging.test.ts), flip `debugRound` (QA 10-debug-*)
- [x] company-style presets (lib/tiers/presets.ts: Google/Meta/Amazon/McKinsey/Goldman "-style", official 04 §1a links only, "Practice only; not affiliated"), context.preset -> server style line; Amazon LP bank (8 made-up prompts, LP tag shown on the question), scorecard: I/we + numbers (existing) + "Leadership Principles: ..." line. Flip `presets` (QA 09-setup-amazon-*, 09-amazon-question-*)
- [x] round cards on setup (title, ~min, blurb, "Feedback: ..."; ✓ on selected, not color-only); company/role still pre-filled from target (QA 09-setup-cards-*)
### T6 Resume tailoring
- [x] keyword-gap panel, flip `keywordGap` (QA 11-tailor-gap-*)
- [x] 3 rewrite options + heldBack, flip `rewriteOptions` (QA 11-tailor-three-*, 11-tailor-blocked-*)
- [x] guard v2 + 40-pair eval (tests/tiers/v2-guard-eval.test.ts)
- [x] more options + one-line summary + saved presets
- [ ] ask-for-the-number slots (item 5, optional): not built
### T7 Resume diff
- [x] side-by-side Before / options (md+), word marks not color-only, sticky "N changes" + Download PDF bar, PDF bold name/section titles, name-based file name (QA 11-tailor-three-*, 11-tailor-accepted-*)
- [ ] Accept "morph" animation: not built (enter animation only)
### T8 Polish
- [x] Pyodide preload when Python is selected + slow-load message after 6 s; board 14 px labels, 8 px drag snap, 24 px dot grid; tracker designed empty states, compact cards (one "Move to X" + "…" menu), Delete with Undo (QA 12-tracker-*)
### T9 Final
- [x] reviewer pass (no blockers; see Decisions), gates + eval 26/26, summary
- [ ] full re-shoot of every screen: not redone; per-phase shots from T1-T8 stand. Not shot: design board, case, portfolio, timed challenge, recruiter/behavioral, reduced-motion variants

## Bugs
- E: pdf text joined with spaces, DOCX raw text, early whitespace collapse -> y-grouped lines + hasEOL, mammoth HTML -> lines, normalize last. Tests: tests/tiers/v2-resumeLines.test.ts. QA 01-resume-*.
- C: answer reader took first number, no units -> "1,200,000%". lib/tiers/numbers.ts {value, unit}, final cue, unit-mismatch note, editable read. Tests: numbers.test.ts (19-case table), interview-numbers.test.tsx. QA 03-finance-*.
- A2: tall screenshots squashed to 1600 px long side -> unreadable. prepareStrips (width-capped, seam-cut, <= 2 strips, JPEG quality fit), one request with both strips + `=== IMAGE 2 ===` marker, server mergeTiles. planTiles text estimate = width/24 (phone) so 1x chats aren't over-shrunk; too tall -> "Upload it in two parts". Tests: v2-tiles.test.ts, v2-tools-groq.test.ts. QA 04-screenshot-* (qa/v2-tools-t2.mjs checks strips sent).
- groq: model ids from env (VISION_MODEL, INTERVIEW_MODEL, REWRITE_MODEL), questions on 20b -> interview model, feedback on interview model -> 120b -> 20b, retry-after <= 5 s retried once in place, interview limit -> RATE_LIMITED/DAILY_CAP codes. Tests: v2-tools-groq.test.ts (404, 429 short/long, env).
- A1: generic error on truncation -> typed codes, `length` = partial, ScreenshotUpload copy per code. Tests: tests/api/transcribe.test.ts. QA 02-screenshot-*.

## Decisions
- Per-phase reviewer passes folded into the T9 full reviewer pass to save usage (orchestrator self-reviews each phase diff).

- Transcribe payload cap 3,000,000 chars (not findings' 3.5 MB): guard.ts caps transcribe bodies at 3 MiB and is frozen.
- Interview question cap raised 150 -> 400 tokens: gpt-oss counts reasoning in max_completion_tokens.
- T5: client canCall/buildRequest now use CODE_ROUNDS (coding, debugging, sql), matching the server; before, SQL could request an AI "question" the route rejects. Python debugging fixes aren't executed in vitest (no Pyodide in node); the Python starters mirror the JS bugs.
- T5: Google preset source is the official how-we-hire page (JS-rendered; Research verified it via the official video). Stripe "Bug Squash" not a preset (self-reported only).

## Needs integration
- `components/App.tsx`: v2 rounds (sql, debugging) are enabled by `v2RoundOn()` and rendered inside `Interview.tsx` (App's `roundsEnabled`/`renderRound` don't know them). Optional: move them into App's maps at integration.
- `.env.example`: add optional `VISION_MODEL=qwen/qwen3.8-27b`, `INTERVIEW_MODEL=qwen/qwen3.8-27b`, `REWRITE_MODEL=qwen/qwen3.8-27b` (lib/server/groq.ts reads them; defaults shown).
- `lib/server/guard.ts`: optionally raise MAX_IMAGE_BODY_BYTES to 3.6 MB (findings A2 allow 3.5 MB of strips) and lower TRANSCRIBE_DAILY_CAP default 20 -> 12 (findings A2: 2-strip calls share qwen TPD). Not required for correctness.

## Pending Himesh
