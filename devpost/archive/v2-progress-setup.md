# v2 setup progress

## Done (all steps 0-9)
- 0 research + briefs 85da9b5 · 1 gitattributes d4f4769 · 2 deps 9fb815a
- 3 tokens/motion/cards visible eb96bfd (WIP) + Playwright pass verified (see log)
- 4 caps d90510b · 5 contracts d537588 · 6 QA harness dc6e362 + abc0112
- 7 CLAUDE.md, 8 env-at-import (none), 9 final gates: in the `V2 setup: base ready...` commit

## Final gates (v2-base)
- lint clean, tsc clean, vitest 39 files / 645 tests, build OK, eval 26/26 (README unchanged). Ports 3000-3099 free.

## Current
- Nothing. Session finished; launcher creates the worktrees.

## Gotchas
- Shell: run each gate as its own Bash call; `VAR=x cmd` and `$env:` are blocked -> use a wrapper .mjs that sets process.env, or `node qa/serve.mjs start|stop <port>`.
- Never stage .agents/ agent/ .claude/skills/ .codex/ skills-lock.json devpost/learner-profile.md.
