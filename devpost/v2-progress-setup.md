# v2 setup progress

## Done
- 0 research + briefs 85da9b5 · 1 gitattributes d4f4769 · 2 deps 9fb815a
- 3 code done (WIP eb96bfd): globals.css tokens, MotionProvider, v2-*.css, EvidenceCard/PostingSection always visible
- 6 partial (WIP dc6e362): qa/lib.mjs QA_OUT/QA_SHOTS/reducedMotion/settle, ports.mjs QA_PORT_RANGE
- 4 caps d90510b (Tavily 30, Wikidata 300, `wikidata` RouteName, tests; REWRITE cap left at 30)
- 5 contracts d537588 (ApiErrorCode in lib/types.ts; debugging round + ts/sql langs needed entries in QUESTIONS_PER_ROUND, ROUND_BLURB; starter ts/sql optional)

## Current
- Step 3 Playwright pass running: `node qa/v2-setup-pass.mjs after explore-report explore-tiers explore-interview explore-coding` (temp wrapper sets QA_SHOTS; delete before final commit) -> qa/out-pass.txt. report+tiers all ok.
- Step 6: qa/serve.mjs

## Next
- 3 close commit after pass; 6 serve.mjs commit; 7 CLAUDE.md + setup log; 8 env-at-import grep; 9 final gates + eval, stop dev server (bg task, port 3000), final commit `V2 setup: base ready...`

## Gotchas
- Shell: run each gate as its own Bash call; `VAR=x cmd` and `$env:` are blocked -> use a wrapper .mjs that sets process.env.
- Baseline: 641 tests (now 645), eval 26/26. `npm run eval` rewrites README eval table (no diff at baseline).
- Never stage .agents/ agent/ .claude/skills/ .codex/ skills-lock.json devpost/learner-profile.md.
