# v2 tools progress (read me first after a rotation)

## Done
- T0 baseline gates green (log written)
- T1 E + C + A1 (b25e959)
- T2 A2 tiling + groq env/fallback/429 (commit "V2 tools 2")

## Current
- T3 interview core: code done + tests green (lib/tiers/scorecard.ts, Feedback.tsx, CodingRound.tsx split pane, CodeEditor.tsx highlight + label Compartment, app/v2-tools.css code colors, flag `scorecard` on). Left: build, shots 05-coding-*, 06-scorecard-*, log tick, commit `V2 tools 3`.

## Next
- T3 gates + shots (05-coding-*, 06-scorecard-*) + commit `V2 tools 3: ...`
- T4 TS + SQL runners, worker hardening
- T5 debugging round, presets, round cards

## Gotchas
- Shell: Bash tool works for `cd ... && cmd | tail`; `sed -i` needs approval, use Edit. PowerShell Select-String pipes blocked.
- QA: `node qa/v2-tools-run.mjs <script.mjs> [arg] > qa/out-tools-run.txt 2>&1`; script output in qa/out-tools.txt (grep `^== `). Server: `node qa/serve.mjs start 3200` / `stop 3200`.
- `npm run eval` prints "README.md eval table updated" but leaves no diff; fine.
- Subagents may lack shell; orchestrator runs gates/commits.
- Per-phase reviewer folded into T9 (logged under Decisions).
- groq tasks: "interview" (questions/hints) vs "interviewFeedback". Transcribe accepts `image` or `images` (<= 2).
