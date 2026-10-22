# v2 check progress (read first after a rotation)

## Done
- C0 baseline: all gates green (645 tests, eval 26/26). Log: `devpost/v2-check-log.md`.
- C1 (Bug D 989718c, Wikidata 8633079, Bug B + error codes in the "V2 check 1" commit). 688 tests.

## Current
- C2 scoring rules (brief C2 items 1-7), owner engine-builder. Not started.

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
