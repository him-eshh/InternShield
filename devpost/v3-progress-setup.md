# v3 setup progress

## Done
- Step 0 briefs + baseline: 49d3ec8
- Step 1 dependencies: 00fae26
- Step 2 theme tokens: 2b85603
- Step 3 app shell (code in WIP 500b8c3 + next WIP): closing commit `V3 setup 3`
- Step 4 contracts + company intel: `V3 setup 4`
- Step 5 CLAUDE.md v3 section: `V3 setup: done`
- Final gates: lint 0 errors, tsc clean, vitest 75 files / 1200 tests, build ok, eval 88/88, held-out 24/27.

## Current
- Setup finished. No dev server running.

## Next
- (none: resume / interview / shell streams start from v3-base)

## Gotchas
- Gates: `node qa/v3-gates.mjs [lint,tsc,vitest,build,eval]` -> `qa/gates-out.txt` (~10 min).
- Contrast + no-hex: `tests/shared/v3-theme.test.ts`; `node qa/v3-contrast.mjs` for ratios.
- Dev server: Start-Process hidden on own port; stop with `node qa/serve.mjs stop <port>`.
- QA: `node qa/v3-run.mjs qa/<script>.mjs`; waitUntil "load", not networkidle.
- Shell: one command per PowerShell call; script blocks `{}` and pipes need approval.
