# v3 interview progress

## Done
- I1 bank: `data/question-bank/{bank.json (1130 q, 300KB), build.mjs, SOURCES.md}`, `lib/tiers/bank.ts`, `tests/tiers/v3-bank.test.ts` (WIP commit; full gates not yet run)

## Current
- I4 engine design (see Gotchas), then I2 intel, I3 setup UI

## Next
1. `lib/tiers/session.ts` (pure engine: plan, advance, follow-ups, adaptive, persistence) + tests
2. server: add `ask:"review"` (feedback + followUp for ONE turn) in `lib/server/interview.ts` + types; session cap 30
3. UI in `components/interview/*` (Setup, Runner, Summary, IntelCard, History); PracticePage switches home/run/summary
4. QA `qa/v3-interview-*.mjs`, final shots, summary file

## Gotchas
- Dev server: no ports yet started (none running). Start only hidden (see launcher prompt); record Id here.
- Bash tool refuses `cd`, brace expansion, `&&` after mkdir etc.; write scripts with Write then `node file`. `curl` works for GitHub API.
- Bank data has no company-wise difficulty in CSV; difficulty/tags come from newfacade/LeetCodeDataset (both MIT). Only 1130 problems have metadata.
- Design: new engine reuses `InterviewSession` as an "inner" session for runnable panels (CodingRound/SqlRound take RoundPanelProps; their `ask(...,"feedback")` is intercepted by the runner). Text rounds use textarea. Old `Interview.tsx` stays (tests) but PracticePage no longer renders it.
- Vault Context-Card missing at claude_brain path: continued without it.
