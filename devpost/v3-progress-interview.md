# v3 interview progress

## Done
- Bank metadata: d341e03 (1130 questions, MIT sources); item-closing gates pending.
- Preserved inherited handoff: 0a353b0; engine regressions: 695900e.
- Setup/intel WIP: f433eee; runner/summary/review API WIP: de68963.
- First full gates: tsc/build green, 1225 tests green, eval 88/88 + held-out 24/27. Lint initially failed; focused lint fixed since.
- Desktop QA: 5 answered, real Python + SQL, follow-ups, refresh recovery, auto-summary/history, early stop. Setup + summary shots inspected.

## Current
- Hardened filters (never relax selected constraints), custom wording, storage recovery and variable-length scorecards. 71 focused tests + tsc green.
- New active state field is activeQuestion (avoids React compiler ref inference). No public session migration needed: only this WIP stream used it.
- components/interview/{Setup,IntelCard,Runner,Summary}.tsx, PracticePage.tsx. QA: qa/v3-interview-session.mjs.
- About to run final screenshot matrix + extra edge/TypeScript browser checks, then full gates.

## Next
1. Commit current sub-item; add edge QA for TypeScript, rounds mode, custom questions, hints, cap and intel fallback.
2. Hidden 3200 server; run matrix 1440/390 light/dark, inspect EVERY shot, stop own server.
3. Fix any failures; run full gates before item-closing commits I1-I7.
4. Summary only when every quality line is proven; no final summary signal yet.

## Gotchas
- No server currently running from this task. Verified own next PID 37600 + children stopped after desktop QA.
- Windows Get-NetTCPConnection omitted own listener; use CIM worktree command line to identify only own next dev -p 3200 process and taskkill /PID <verified> /T /F.
- Server launcher hidden, exact command from user; screenshots under authorized .git/internshield-relay/v3-shots/interview.
- Never touch 3000, main tree, secrets, personal vault, prohibited agent files. rg unavailable.
- No jsdom installed; tests stub localStorage. New writes use UTF-8 explicitly.
- Strict LazyMotion requires m from motion/react-m, not motion components.
- React event timestamps use module-level clock wrapper (same as SqlRound).
- Runnable language prop keeps old panel defaults intact; v3 offers Python/TypeScript execution and JS discussion only.
- Needs integration: shell supplies Practice illustration and cross-tool clear-data/continue links (shared files out of scope).
