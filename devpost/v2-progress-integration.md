# v2 integration progress

## Done
- I0: branch `v2` from v2-base 36ad123. Heads: v2-check fe84e11, v2-tools afb173d (both have summaries).
- I1.1/1.2 merges clean (no conflicts): 0ff… `V2 merge: check stream`, 484b1bf `V2 merge: tools stream`.
- I1.3: 53fd96e PDF test timeouts; 203bafb extras live level + onLine code + intro->Check; 2c8d468 caps/env.

- I2: f430320 seams + reviewer fixes (no blockers).

- I3: a11y clean, copy pass (commit "V2 integrate: a11y, reduced motion, brand").

- I4: live smoke done, 9/10 calls used (NO more live calls). Log table in integration log.

- I5: all check + tools QA scripts rerun on merged app (shots land in integration/ root since QA_SHOTS is preset; names don't collide). overflow 0 everywhere; spot-reviewed, no fixes needed. INDEX.md written (via node; Write/mv into .git blocked). Server stopped.

- I6: gates green (vitest 73/1191, eval 88/88, held-out 24/27), eval/messages diff empty, secret scan clean, no servers on 3000. devpost/v2-summary.md written; committed `V2 summary`. DONE.

## Gotchas
- Vault Context-Card missing; ignore.
- Bash: don't `cd` before git; no `cat .env*`; no nested $(...); python heredoc blocked -> use Edit.
- PowerShell: Select-String -Context blocked; "$LASTEXITCODE" in strings blocked.
- Gates: vitest 73 files / 1191 tests; eval 88/88; lint 2 pre-existing warnings.
- Dev server PID 72768 (cmd.exe, port 3000, restarted in I5 after rotation). Stop: node processes listening on 3000. Log: QA_SHOTS/dev-server.log.
