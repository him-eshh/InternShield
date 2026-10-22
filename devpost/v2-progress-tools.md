# v2 tools progress (read me first after a rotation)

## Done
- T0 baseline gates green (log written)
- T1 E + C + A1 (b25e959)
- T2 A2 tiling + groq env/fallback/429 (e8858d8)
- T3 interview core (commit "V2 tools 3")

- T4 TS + SQL runners, worker hardening (commit "V2 tools 4")

## Current
- T5 debugging round: start with 04 section 4; new lib/tiers/debugging.ts (programs + reference fixes + tests), DebugRound panel rendered in Interview.tsx like SqlRound (V2_ROUNDS + v2RoundOn already include "debugging").

## Next
- T5 debugging round, presets, round cards
- T6 resume tailoring
- T7 diff, T8 polish, T9 final

## Gotchas
- Shell: Bash tool works for `cd ... && cmd | tail`; `sed -i` needs approval, use Edit. PowerShell Select-String pipes blocked. Bash `;` chains with head/env need approval: one command per call.
- QA: `node qa/v2-tools-run.mjs <script.mjs> [arg] > qa/out-tools-run.txt 2>&1`; script output in qa/out-tools.txt (grep `^== `). Server: `node qa/serve.mjs start 3200` / `stop 3200`.
- `npm run eval` prints "README.md eval table updated" but leaves no diff; fine.
- Subagents may lack shell; orchestrator runs gates/commits.
- Per-phase reviewer folded into T9 (logged under Decisions).
- groq tasks: "interview" (questions/hints) vs "interviewFeedback". Transcribe accepts `image` or `images` (<= 2).
- Next dev shows a "Cache disabled" badge bottom-left in shots: dev-only, ignore.
