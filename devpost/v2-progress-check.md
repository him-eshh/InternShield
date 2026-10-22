# v2 check progress (read first after a rotation)

## Done
- C0 baseline: all gates green (645 tests, eval 26/26). Log: `devpost/v2-check-log.md`.
- C1 (Bug D 989718c, Wikidata 8633079, Bug B + error codes in the "V2 check 1" commit). 688 tests.

## Current
- WIP 3d3d104: lib/reportView.ts, lib/recovery.ts, rerunWithCompany in pipeline.ts (+ chip test) from the killed workers.
- Session 3 relaunched the same 3 workers (C2/C3/C7 below); me: eval/run.ts heldout + confusion matrix.
- Workers (uncommitted output may be in the tree after a rotation; review + commit as WIP):
  - engine-builder C2: lib/scoring/**, tests/scoring/v2-*, new eval/messages, lib/server/extract*.ts, lib/quotes.ts, lib/explainFallback.ts, lib/types.ts (additive)
  - ui-builder C3: components/report/**, app/v2-check.css, lib/reportView.ts, tests/ui/v2-check-report*/ring*
  - general-purpose C7 held-out: eval/heldout/*.json (blind to lib/scoring). eval/run.ts support for heldout + confusion matrix is still TODO (mine).
- Dev server running on 3100 (`node qa/serve.mjs stop 3100` when done).

## Next
- C3 report redesign, C4 questions/recovery/chip, C5 links + rules 7-10, C6 annotated view, C7 eval (parallel during C4-C6)

## Gotchas
- Shell: chained/compound bash commands and `sh script` need approval; run gates one per call:
  `cd /c/my_projects/projects/InternShield-v2-check && npm run lint 2>&1 | tail -n 5` (same for `npx tsc --noEmit`,
  `npx vitest run --reporter=dot 2>&1 | grep -E 'FAIL|Test Files|Tests '`, `npm run build 2>&1 | grep -iE 'error|compiled|failed'`, `npm run eval 2>&1 | tail -n 3`).
  PowerShell rejects `$()`, `(...)`, script blocks and `$env:X=` assignments; Bash `VAR=x cmd` needs approval.
- QA: `node qa/serve.mjs start 3100` / `stop 3100` (PowerShell). QA scripts: `import "./v2-check-env.mjs"` first, then
  `await import("./lib.mjs")` (sets QA_BASE/QA_SHOTS defaults). Run `node qa/v2-check-x.mjs; Get-Content qa/out-v2-check.txt`.
  Mocked explain returns 503 by default (console error is expected, pre-existing).
- To get the tracker form: paste a message with no company (see `qa/v2-check-tracker.mjs`).
- `App.tsx` is frozen: work around via component props/wrappers, log "Needs integration".
