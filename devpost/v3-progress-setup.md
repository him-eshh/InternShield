# v3 setup progress

## Done
- Step 0 briefs + baseline: 49d3ec8
- Step 1 dependencies: 00fae26
- Step 2 theme: wired (theme.css imported by globals.css, fonts in layout, v3-*.css stubs imported, code tokens moved out of v2-tools.css, Board.tsx hex removed). Gates running; commit `V3 setup 2: theme tokens` when green.

- Step 2 commit: 2b85603. Step 3 code WIP: 500b8c3 (routes, provider, Nav, PageTransition, pages, qa/v3-lib.mjs; tsc green).

## Current
- Step 3: QA `qa/v3-setup-shell.mjs` ALL OK (shots in QA_SHOTS setup-*). Added `--nav-bottom` var (globals.css) so Tailor sticky bar / Tracker toast sit above mobile tab bar. Dev server stopped. Gates running -> commit `V3 setup 3: app shell, routes, nav, shared state`.
- Meanwhile drafting step 4 contracts.

## Next
1. Step 3 shell: routes, AppStateProvider, Nav, PageTransition, no forced gating, qa/v3-lib.mjs, screenshots 1440/390 light/dark.
2. Step 4 contracts (lib/impact.ts, tiers types, resume types, companyIntel + /api/intel + tests).
3. Step 5 CLAUDE.md v3 section, commit `V3 setup: done`.

## Gotchas
- Shell: one command per PowerShell call (`;` chains need approval sometimes; script blocks `{}` blocked). Bash `cd /c/... && node -e` works for file edits.
- Gates: `node qa/v3-gates.mjs [lint,tsc,vitest,build,eval]` (run in background, ~10+ min total; lint alone is slow) -> `qa/gates-out.txt`.
- Contrast: `node qa/v3-contrast.mjs` -> `qa/contrast-out.txt` (194 pairs pass).
- Dev server: Start-Process hidden (see launcher prompt), port 3400, log in QA_SHOTS/dev-server.log. Warm with `node qa/v3-warm.mjs 3400` (Bash tool). Stop: `node qa/serve.mjs stop 3400`.
- QA env can't be set in shell: `node qa/v3-run.mjs qa/<script>.mjs` (defaults QA_BASE/QA_SHOTS). Use waitUntil "load", not networkidle (flakes).
- If PowerShell says "pwsh timed out ... malformed syntax", use the Bash tool.
- Undefined v2 vars (--text, --card, --muted, --bg-soft) are aliased in theme.css.
- `npm ci --dry-run` ok; full npm ci skipped (Windows EPERM). @emnapi entries present.
