# Build log

- 2026-10-21 01:13 Phase 1 (setup) started. Vault profile files (claude_brain) unreachable; continued without them.
- 2026-10-21 01:24 Phase 1: Next.js 16.4.2 + Tailwind 4 scaffolded, deps installed, contracts/fixtures/stubs written, gates green.
- 2026-10-21 01:26 Slice 1 committed (05063ee). Phase 2 (parallel workers) starting: engine, api, ui in worktrees.
- 2026-10-21 01:35 Worktree workers had no shell (permission prompts auto-denied). Stopped them; relaunched engine/api/ui/chores in the main tree with disjoint ownership. Orchestrator runs gates + commits. Stale worktree dir `.claude/worktrees/agent-a2502dab67038db31` couldn't be deleted (Permission denied); `git worktree prune` at the end.
- 2026-10-21 01:58 Phase 3 done: each slice reviewed (no API blockers; 2 UI mobile-overflow blockers fixed; 3 engine false-positive blockers fixed), gates green (172 tests, tsc, lint, build, eval 26/26). Committed d5110d9 (engine), 3b5b566 (api), 19c9ef8 (ui). Phase 4 (live integration) starting.
- 2026-10-21 02:05 Phase 4 done (2457dd5): 7 live runs, both examples land correctly; fixed RDAP 403, company/posting pickers, explanation filter. Phase 5 (final review) starting.
- 2026-10-21 02:15 Phase 5 done: final review (1 blocker: auto-fill source double-count) and should-fixes applied; 175 tests, eval 26/26, lint, tsc, build green; 9 live runs total. Phase 6 (polish) skipped beyond review fixes: browser-only checks need Himesh. Summary in devpost/build-summary.md.

## Tiers

- 2026-10-21 06:10 Tier 2 session started (no tier2 branch existed; previous session's lockfile regeneration had been reverted). Vault profile unreachable; continued without it.
- 2026-10-21 06:20 Lockfile fixed on main (bb58163): npm prunes the @emnapi entries on Windows, so they were added by hand; npm ci --dry-run OK. A real npm ci was blocked by a locked next-swc .node file (EPERM) and partially emptied node_modules; restored with npm install.
- 2026-10-21 06:25 Phase A: tier2-spec.md, lib/tiers contracts, guard/groq/storage changes, pdf-lib 1.17.1 (MIT), slices 7-10 added.
- 2026-10-21 06:37 Slice 7 committed (67440a4) after review (tidyExplanation rewritten to drop whole repeat sentences; chip confirm focus; fixed table layout).
- 2026-10-21 06:38 Live call 1/4 (Tier 2): /api/transcribe on the app's own share image -> 200, qwen/qwen3.8-27b read the text; 836 prompt + 23 completion tokens. Vision path usable; tesseract.js not needed.
- 2026-10-21 06:41 Live call 2/4 (Tier 2): /api/rewrite with a made-up bullet + made-up posting -> 200 on qwen, honest rewording (did not add the posting's SQL/Tableau); 155 prompt + 15 completion tokens.
