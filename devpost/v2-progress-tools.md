# v2 tools progress (read me first after a rotation)

## Done
- T0 baseline gates green (log written)
- T1 E + C + A1 (b25e959)
- T2 A2 tiling + groq env/fallback/429 (e8858d8)
- T3 interview core (commit "V2 tools 3")

- T4 TS + SQL runners, worker hardening (commit "V2 tools 4")
- T5 debugging round, presets, round cards (commit "V2 tools 5")

- T6 resume tailoring (commit "V2 tools 6"; gates + eval green; QA shots v2-shots/tools/11-*)

- T7 side-by-side diff, sticky "N changes" bar, PDF bold name/headers + name-based file name (commit "V2 tools 7"; Accept morph animation skipped, enter animation only)

- T8 Pyodide preload + slow-load text, board 14px labels/8px snap/24px dots, tracker empty states + compact cards + "…" menu + Delete/Undo (commit "V2 tools 8"; QA t8 shots 12-*)

- T9 final: reviewer pass, gates green, round shots 13-*, summary written (commit "V2 tools summary")

## Current
- Done. No dev server running.

## Next
- Nothing.

## Gotchas
- Shell: Bash tool works for `cd ... && cmd | tail`; `sed -i` needs approval, use Edit. PowerShell Select-String pipes blocked. Bash `;` chains with head/env need approval: one command per call.
- QA: `node qa/v2-tools-run.mjs <script.mjs> [arg] > qa/out-tools-run.txt 2>&1`; script output in qa/out-tools.txt (grep `^== `). Server: `node qa/serve.mjs start 3200` / `stop 3200`.
- `npm run eval` prints "README.md eval table updated" but leaves no diff; fine.
- Subagents may lack shell; orchestrator runs gates/commits.
- Per-phase reviewer folded into T9 (logged under Decisions).
- groq tasks: "interview" (questions/hints) vs "interviewFeedback". Transcribe accepts `image` or `images` (<= 2).
- tests/tiers/pdf.test.ts "returns PDF bytes" can time out in the full run under load; passes alone.
- Next dev shows a "Cache disabled" badge bottom-left in shots: dev-only, ignore.
