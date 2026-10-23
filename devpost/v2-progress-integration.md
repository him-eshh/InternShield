# v2 integration progress

## Done
- I0: branch `v2` from v2-base 36ad123. Heads: v2-check fe84e11, v2-tools afb173d (both have summaries).
- I1.1/1.2 merges clean (no conflicts): 0ff… `V2 merge: check stream`, 484b1bf `V2 merge: tools stream`.
- I1.3: 53fd96e PDF test timeouts; 203bafb extras live level + onLine code + intro->Check; 2c8d468 caps/env.

## Current
- I2: reviewer (background agent) on git diff main...v2; me: seam checks (error codes per route, examples, ring).

## Next
- I2 fix reviewer blockers/should-fix -> gates -> commit
- I3 a11y/reduced motion pass (qa script qa/v2-integration-*.mjs), copy pass
- I4 live smoke (max 10 calls, log each in devpost/v2-integration-log.md)
- I5 screenshots + INDEX.md; I6 final + devpost/v2-summary.md

## Gotchas
- Vault Context-Card missing; ignore.
- Bash: don't `cd` before git; no `cat .env*`; no nested $(...); python heredoc blocked -> use Edit.
- PowerShell: Select-String -Context blocked; "$LASTEXITCODE" in strings blocked.
- Gates: vitest 73 files / 1191 tests; eval 88/88; lint 2 pre-existing warnings.
- Dev server PID 30468 (cmd.exe, port 3000, started in I2). Stop: node processes listening on 3000. Log: QA_SHOTS/dev-server.log.
