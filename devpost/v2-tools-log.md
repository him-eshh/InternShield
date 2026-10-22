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
- [ ] Bug A2 tiling (planTiles, findSeam, mergeTiles, 2 strips/request, <= 3.5 MB)
- [ ] groq.ts env model ids, interview fallback 20b, 429 retry-after one retry, RATE_LIMITED, 404 test
### T3 Interview core
- [ ] duplicated "6 of 6 hidden tests passed"
- [ ] wide coding layout, dark code theme (no purple), CodeMirror aria-label Compartment
- [ ] 4-area scorecard + feedback screen, flip `scorecard`
### T4 Runners
- [ ] TypeScript runner, flip `tsRunner`
- [ ] SQL round (sql.js worker, multiset grader, 6 questions), flip `sqlRound`
- [ ] worker hardening (prototype deletes, timeout, output cap) + tests
### T5 Debugging + presets + round cards
- [ ] debugging round (5 programs), flip `debugRound`
- [ ] company-style presets + Amazon STAR signals, flip `presets`
- [ ] round cards on setup
### T6 Resume tailoring
- [ ] keyword-gap panel, flip `keywordGap`
- [ ] 3 rewrite options + heldBack, flip `rewriteOptions`
- [ ] guard v2 + 40-pair eval
- [ ] more options + one-line summary
### T7 Resume diff
- [ ] side-by-side diff, accept, sticky bar
### T8 Polish
- [ ] Pyodide preload + staged text; board 14 px labels, 8 px snap, dot grid; tracker empty states, compact cards, undo
### T9 Final
- [ ] reviewer pass, screenshot pass, gates, summary

## Bugs
- E: pdf text joined with spaces, DOCX raw text, early whitespace collapse -> y-grouped lines + hasEOL, mammoth HTML -> lines, normalize last. Tests: tests/tiers/v2-resumeLines.test.ts. QA 01-resume-*.
- C: answer reader took first number, no units -> "1,200,000%". lib/tiers/numbers.ts {value, unit}, final cue, unit-mismatch note, editable read. Tests: numbers.test.ts (19-case table), interview-numbers.test.tsx. QA 03-finance-*.
- A1: generic error on truncation -> typed codes, `length` = partial, ScreenshotUpload copy per code. Tests: tests/api/transcribe.test.ts. QA 02-screenshot-*.

## Decisions
- Per-phase reviewer passes folded into the T9 full reviewer pass to save usage (orchestrator self-reviews each phase diff).

## Needs integration

## Pending Himesh
