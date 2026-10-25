# v3 setup progress

## Done
- (none committed yet)

## Current
- Step 0: baseline gates running (`node qa/v3-gates.mjs` -> `qa/gates-out.txt`). Lint/tsc/vitest green (1191 tests).
- Step 2 drafted early: `app/theme.css`, `qa/v3-contrast.mjs` (all pairs pass), `tests/shared/v3-theme.test.ts`. Not wired into globals.css yet.

## Next
1. Commit step 0 (briefs + setup log + qa/v3-gates.mjs).
2. Step 1 deps: lucide-react 1.61.0 ISC, diff 9.0.0 BSD-3 (own types), jszip 3.10.2 already transitive via mammoth (MIT OR GPL-3.0; use under MIT). Re-check @emnapi lockfile entries after install.
3. Step 2: globals.css imports theme.css, fonts (Bricolage + Inter) in layout, Board.tsx "#888" fallback -> "gray".
4. Step 3 shell, step 4 contracts, step 5 CLAUDE.md.

## Gotchas
- Shell: one command per PowerShell call (`;` chains need approval). Bash `cd &&` blocked. Use `node -e` for file deletes.
- Gates: `node qa/v3-gates.mjs [lint,tsc,vitest,build,eval]` (run in background, ~10+ min total; lint alone is slow).
- Contrast: `node qa/v3-contrast.mjs` -> `qa/contrast-out.txt`.
- Dev server: Start-Process hidden (see launcher prompt), port 3400, log in QA_SHOTS/dev-server.log.
- Undefined v2 vars (--text, --card, --muted, --bg-soft) are now aliased in theme.css.
