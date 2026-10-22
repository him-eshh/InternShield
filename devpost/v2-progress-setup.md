# v2 setup progress

## Done
- 0 research + briefs, eslint ignores devpost (commit: see git log "V2 setup 0")

## Current
- Step 1: .gitattributes, renormalize, readFixture helper

## Next
- 2 deps, 3 tokens/motion, 4 caps/error codes, 5 contracts, 6 QA harness

## Gotchas
- Shell: run each gate as its own Bash call (compound/group commands, `cat >`, redirects get blocked).
- Baseline: 641 tests, eval 26/26. `npm run eval` rewrites README eval table (no diff at baseline).
- Never stage .agents/ agent/ .claude/skills/ .codex/ skills-lock.json devpost/learner-profile.md.
