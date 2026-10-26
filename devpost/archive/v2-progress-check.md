# v2 check progress (read first after a rotation)

## Done
- C0 baseline: all gates green (645 tests, eval 26/26). Log: `devpost/v2-check-log.md`.
- C1 5538676, C2 98bf9f5, C3 a9f20d1, C4 34a5cb4.
- C5 b199e25 (rules 7-10 all in + review fixes), C6 1568b56 (annotated message), C7 399ad7d (88/88, FP 0/35; heldout 24/27).
- C8 "V2 check 8" (form + checking screen; code was already in, QA verified). 965 tests.

## Current (session 7)
- C9 intro + ring logo (P3, first to drop). Files: components/Intro.tsx, components/Logo.tsx, app/icon.svg,
  app/apple-icon.png, app/opengraph-image.tsx. Check what exists before building.

## Next
- C10 final: reviewer (read-only) on `git diff v2-base...v2-check`, fixes, full screenshot pass (brief C10 list),
  gates, stop servers, `devpost/v2-check-summary.md`, commit "V2 check summary".

## Gotchas
- Shell: chained/compound bash commands and `sh script` may need approval; run gates one per call:
  `npm run lint` (same for `npx tsc --noEmit`,
  `npx vitest run --reporter=dot 2>&1 | grep -E 'FAIL|Test Files|Tests '`, `npm run build 2>&1 | grep -iE 'error|compiled|failed'`,
  `npm run eval 2>&1 | grep -E "MISS|Main set|Held-out"`).
  PowerShell rejects `$()`, script blocks, Select-String in pipes.
- Workers (subagents) can't run shell: they write files, I run eval/gates.
- tests/tiers/pdf.test.ts flaky under full-suite load (passes alone); not ours.
- QA: `node qa/serve.mjs start 3100` / `stop 3100` (PowerShell). QA scripts: `import "./v2-check-env.mjs"` first, then
  `await import("./lib.mjs")`. Run `node qa/v2-check-x.mjs; Get-Content qa/out-v2-check.txt -Tail 8`.
  Mocked explain returns 503 by default (console error is expected, pre-existing). Scripts: report, questions, chip,
  tracker, form, annotate.
- `App.tsx` is frozen: work around via component props/wrappers/CSS, log "Needs integration".
- App wraps in strict LazyMotion -> use `m.*` not `motion.*`.
