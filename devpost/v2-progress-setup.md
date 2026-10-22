# v2 setup progress

## Done
- 0 research + briefs 85da9b5 · 1 gitattributes d4f4769 · 2 deps 9fb815a
- 3 code done (WIP commit): globals.css tokens, MotionProvider, v2-*.css, EvidenceCard/PostingSection always visible

## Current
- Step 3 Playwright pass (dev server :3000, shots to QA_SHOTS); also verify js-runner still runs under its new CSP (next.config)

## Next
- 4 caps/error codes, 5 contracts, 6 QA harness, 7 CLAUDE.md, 8 env-at-import check, 9 final gates

## Gotchas
- Shell: run each gate as its own Bash call (compound/group commands, `cat >`, redirects get blocked).
- Baseline: 641 tests, eval 26/26. `npm run eval` rewrites README eval table (no diff at baseline).
- Never stage .agents/ agent/ .claude/skills/ .codex/ skills-lock.json devpost/learner-profile.md.
