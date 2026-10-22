# v2 check progress (read first after a rotation)

## Done
- C0 baseline: all gates green (645 tests, eval 26/26). Log: `devpost/v2-check-log.md`.
- C1 (Bug D 989718c, Wikidata 8633079, Bug B + error codes in the "V2 check 1" commit). 688 tests.
- WIP 3d3d104 reportView/recovery/rerunWithCompany; 9d65c5a eval matrix + annotate.ts + lib/scoring/links.ts (not wired);
  ea8f1b2 held-out (23/27); 7ca2901 C3+C8 worker output; d007189 C2 scoring code (unicode, reimbursement, wrong-way money,
  run-code split, task vocab, flagInfo severity/action/learnMore, confidence) + RecoveryCard/CompanyChip (C4 partial).
  Gates at d007189: tsc ok, 750/751 tests (tests/tiers/pdf.test.ts flaky under load, passes alone), eval 26/26.

## Current (session 4)
- engine-builder (background): tests/scoring/v2-rules.test.ts + eval/messages/v2-*.json (C2 tests/eval). No lib edits.
- Me: wire links.ts into score.ts (C5), then C2 gates + commit "V2 check 2", reviewer pass C3/C8, "V2 check 3"/"8".

## Next
- C4 finish: question picking + new question set (check what's in lib/scoring/questions*), hint line, wire RecoveryCard/CompanyChip.
- C5 rules 7-10, C6 annotated view (annotate.ts exists), C7 grow eval to ~90, C9 intro/logo, C10 final.

## Gotchas
- Shell: chained/compound bash commands and `sh script` need approval; run gates one per call:
  `cd /c/my_projects/projects/InternShield-v2-check && npm run lint 2>&1 | tail -n 5` (same for `npx tsc --noEmit`,
  `npx vitest run --reporter=dot 2>&1 | grep -E 'FAIL|Test Files|Tests '`, `npm run build 2>&1 | grep -iE 'error|compiled|failed'`, `npm run eval 2>&1 | tail -n 3`).
  `$(...)` in bash is rejected. PowerShell rejects `$()`, `(...)`, script blocks and `$env:X=` assignments.
- QA: `node qa/serve.mjs start 3100` / `stop 3100` (PowerShell). QA scripts: `import "./v2-check-env.mjs"` first, then
  `await import("./lib.mjs")` (sets QA_BASE/QA_SHOTS defaults). Run `node qa/v2-check-x.mjs; Get-Content qa/out-v2-check.txt`.
  Mocked explain returns 503 by default (console error is expected, pre-existing).
- To get the tracker form: paste a message with no company (see `qa/v2-check-tracker.mjs`).
- `App.tsx` is frozen: work around via component props/wrappers, log "Needs integration".
- App wraps in strict LazyMotion -> use `m.*` not `motion.*` (workers forget).
- links.ts: lookalike + brand-careers on one link = count once; don't double count with existing domain flags.
