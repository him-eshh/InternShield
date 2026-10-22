# v2 check progress (read first after a rotation)

## Done
- C0 baseline: all gates green (645 tests, eval 26/26). Log: `devpost/v2-check-log.md`.

## Current
- C1 starting: Bug D, Wikidata, Bug B, error codes.

## Next
- C2 scoring rules, C3 report redesign, C4 questions/recovery/chip, C7 eval (parallel during C4-C6)

## Gotchas
- Shell: chained/compound bash commands and `sh script` need approval; run gates one per call:
  `npm run lint 2>&1 | tail -n 5`, `npx tsc --noEmit 2>&1 | tail -n 5`,
  `npx vitest run --reporter=dot 2>&1 | grep -E 'Test Files|Tests '`, `npm run build 2>&1 | grep -iE 'error|compiled|failed'`, `npm run eval 2>&1 | tail -n 3`.
  `cd <dir> && cmd | tail` works. PowerShell rejects `$()` and `(...)` subexpressions.
- QA env vars are not visible via printenv (needs approval); set QA_BASE/QA_SHOTS/QA_PORT_RANGE inline when running qa scripts. Ports 3100-3199.
