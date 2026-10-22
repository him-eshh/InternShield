# v2 check progress (read first after a rotation)

## Done
- C0 baseline: all gates green (645 tests, eval 26/26). Log: `devpost/v2-check-log.md`.
- C1 (Bug D 989718c, Wikidata 8633079, Bug B + error codes in the "V2 check 1" commit). 688 tests.
- C2 "V2 check 2" 98bf9f5 (rules 1-4, 6, flag info, confidence + review fixes).
- WIP 8cb5e17 (session 6): CompanyChip data-company-edit + tokens, Couldn't check above questions.
- C3/C4 code: 7ca2901, d007189, 2d3e634 (+ session 6 fixes below). links.ts wired in 60d1136 (C5 link part).

## Current (session 6)
- C3+C4 verification. QA shots done: 11-report-*, 30-33 questions, 20-22 chip/recovery (all overflow 0, no new console errors).
- Session 6 fixes (uncommitted -> commit with C3/C4): footer `data-level` + `app/v2-check.css` hides Tailor/Practice when an
  answer raises to high; thanks copy "Thanks. <change>" (assertion logged); chip refocus via useEffect after remount
  (`Report.tsx`), `qa/v2-check-chip.mjs` focus print.
- Reviewer (read-only) running on C3/C4 diff -> fix blockers -> gates -> commit "V2 check 3" + "V2 check 4" (can be one
  commit each: C3 files already committed in WIP, so "V2 check 3" may be an empty-diff marker: use the fix commit for C3, then C4).

## Next
- C5: rules 7-10 (secrecy, impersonation, paperwork, platforms/reply YES), check report.links filled; eval cases each.
- C6 annotated view (annotate.ts exists, view not built), C7 eval to ~90 (heldout exists, 27 cases), C8 verify, C9 intro/logo, C10.

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
