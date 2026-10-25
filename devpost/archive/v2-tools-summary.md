# v2 tools summary

Branch `v2-tools` (from `v2-base`). Brief: `devpost/v2-brief-tools.md`. Log: `devpost/v2-tools-log.md`.

## Gates (final)
lint clean, `tsc --noEmit` clean, vitest 54 files / 869 tests pass, build OK, eval 26/26. Baseline was 39 files / 645 tests.
Guard eval: 40-pair resume-guard eval in `tests/tiers/v2-guard-eval.test.ts`, passing.
Reviewer (read-only, Opus) pass on the full diff: no blockers; findings below.

## Phases vs brief
| Phase | Status | Notes |
|---|---|---|
| T1 resume line breaks, unit-aware numbers, screenshot error codes | ✓ | Bugs E, C (19-case table), A1 |
| T2 tall screenshot tiling, model env ids, 429/404 handling | ✓ | A2 tiling; A3 line protocol ✗ (optional) |
| T3 wide coding layout, dark code theme, 4-area scorecard | ✓ | `scorecard` on |
| T4 TS + SQL runners, worker hardening | ✓ | `tsRunner`, `sqlRound` on |
| T5 debugging round, company-style presets, round cards | ✓ | `debugRound`, `presets` on |
| T6 resume tailoring (gap panel, 3 options, guard v2, presets) | ✓ | `keywordGap`, `rewriteOptions` on; ask-for-the-number slots ✗ (optional) |
| T7 side-by-side diff, sticky changes bar, PDF polish | ✓ | Accept "morph" animation ✗ (enter animation only) |
| T8 Pyodide preload, board and tracker polish | ✓ | |
| T9 final | ✓ | reviewer pass, gates, screenshots, this file |

## Flags flipped (`lib/tiers/flags.ts`)
`tsRunner`, `sqlRound`, `debugRound`, `presets`, `scorecard`, `keywordGap`, `rewriteOptions` all true.

## Screenshots
`[project root]\.git\internshield-relay\v2-shots\tools\` (not in repo). Index by prefix:
01 resume PDF/DOCX preview, 02 screenshot error codes, 03 finance feedback ("$1.2 million"), 04 screenshot short/tall/paragraphs/too-long, 05 coding, 06 scorecard, 07 TS run + timeout, 08 SQL, 09 setup cards + Amazon-style, 10 debugging, 11 tailor (gap, options, three, accepted, blocked), 12 tracker (empty, filled, menu, undo), 13 recruiter / behavioral / design board / case / portfolio / timed challenge first screens.
All at 1440 + 390, light + dark; reduced-motion shots for 03, 06 and 13. Overflow 0 everywhere checked. Scripts: `qa/v2-tools-t*.mjs`.
Not re-shot at T9: interview rounds beyond their first screen for screen/behavioral/case/portfolio/challenge (answer and feedback states use the shared scorecard shots 03 and 06).

## Needs integration
- `.env.example`: optional `VISION_MODEL`, `INTERVIEW_MODEL`, `REWRITE_MODEL` (defaults in `lib/server/groq.ts`).
- `lib/server/guard.ts`: optionally raise `MAX_IMAGE_BODY_BYTES` to 3.6 MB (two-strip tall screenshots) and lower the transcribe daily cap 20 -> 12. Confirm at integration that tall images don't return `TOO_LARGE`.
- `components/App.tsx`: `sql` and `debugging` rounds are gated by `v2RoundOn()` and rendered inside `Interview.tsx`; optionally move them into App's maps.
- `next.config.ts` already carries the worker CSP header; verify its value allows the sql.js wasm and the Pyodide/TypeScript CDN loads.

## Pending owner review
- Review the screenshots above (design board canvas is intentionally dark in both themes; check you like it in light).
- Decide on the optional items left out: ask-for-the-number slots, Accept morph animation, A3 line protocol.
- Live Groq checks (no `.env.local` in this worktree, every API call was mocked): tall screenshot tiling, interview fallback and 429 retry.

## Known issues
- `tests/tiers/pdf.test.ts` "returns PDF bytes" can time out in a loaded full run; passes alone.
- Next dev shows a "Cache disabled" badge in shots (dev-only).
- Reviewer nit: confirm `sql-runner.js` and `py-runner.js` output caps match `js-runner.js` `OUTPUT_CAP`.
