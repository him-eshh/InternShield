# v2 check progress (read first after a rotation)

## Done
- C0 baseline: all gates green (645 tests, eval 26/26). Log: `devpost/v2-check-log.md`.
- C1 (Bug D 989718c, Wikidata 8633079, Bug B + error codes in the "V2 check 1" commit). 688 tests.
- C2 "V2 check 2" 98bf9f5 (rules 1-4, 6, flag info, confidence + review fixes).
- WIP 8cb5e17 (session 6): CompanyChip data-company-edit + tokens, Couldn't check above questions.
- C3/C4 code: 7ca2901, d007189, 2d3e634 (+ session 6 fixes below). links.ts wired in 60d1136 (C5 link part).

- C3 "V2 check 3" a9f20d1, C4 "V2 check 4" 34a5cb4 (reviewer: no blockers; fixes in).

## Current (session 6) — 3 background workers (if rotated, they're gone: check files and finish by hand)
- C5 engine-builder: rules 7-10 in lib/scoring/**, tests/scoring/v2-rules7-10.test.ts, eval/messages/v2-*.json (new).
  My uncommitted score.ts/rules.ts edit (off_platform soft only when applied first; phoneCountry removed) rides in the C5 commit.
- C6 ui-builder: components/report/AnnotatedMessage.tsx (new), Report.tsx wiring, EvidenceList/Card ids `ev-<id>`, marks `mk-<id>`,
  app/v2-check.css, tests/ui/v2-check-annotate.test.tsx.
- C7 engine-builder: ~45 new eval/messages/c7-*.json (originals untouched).
- After each: gates, QA shots (C6: annotated desktop+mobile, light/dark, reduced motion), commit "V2 check 5/6/7".

## Next
- C7 README eval table (npm run eval updates it), C8 verify vs brief (form validate-on-click, Add context, checking state),
  C9 intro/logo, C10 final (reviewer, full shots, summary).

## Gotchas
- Shell: chained/compound bash commands and `sh script` need approval; run gates one per call:
  `cd /c/my_projects/projects/InternShield-v2-check && npm run lint 2>&1 | tail -n 5` (same for `npx tsc --noEmit`,
  `npx vitest run --reporter=dot 2>&1 | grep -E 'FAIL|Test Files|Tests '`, `npm run build 2>&1 | grep -iE 'error|compiled|failed'`, `npm run eval 2>&1 | tail -n 3`).
  `$(...)` in bash is rejected. PowerShell rejects `$()`, `(...)`, script blocks and `$env:X=` assignments.
- tests/tiers/pdf.test.ts flaky under full-suite load (passes alone); not ours.
- QA: `node qa/serve.mjs start 3100` / `stop 3100` (PowerShell). QA scripts: `import "./v2-check-env.mjs"` first, then
  `await import("./lib.mjs")`. Run `node qa/v2-check-x.mjs; Get-Content qa/out-v2-check.txt -Tail 8` (keep output short).
  Mocked explain returns 503 by default (console error is expected, pre-existing).
- To get the tracker form: paste a message with no company (see `qa/v2-check-tracker.mjs`).
- `App.tsx` is frozen: work around via component props/wrappers/CSS, log "Needs integration". App already hides
  Tailor/Practice on the first report's high level.
- App wraps in strict LazyMotion -> use `m.*` not `motion.*` (workers forget).
- links.ts: lookalike + brand-careers on one link = count once; don't double count with existing domain flags.
