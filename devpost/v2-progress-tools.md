# v2 tools progress (read me first after a rotation)

## Done
- T0 baseline gates green (log written)
- T1 E + C + A1, gates green, QA 01/02/03 shots ok (commit "V2 tools 1")

## Current
- T2: A2 tiles.ts/prepareStrips + image.ts done (committed in WIP 2c78729). Next: wire tiles into ScreenshotUpload (2 strips/request, merge), tall PNG tests; groq.ts env ids/fallback/429.

## Next
- T2 gates + 04-screenshot-tall shots + commit `V2 tools 2: ...`
- T3 interview core (dup "6 of 6", wide coding layout, scorecard)
- T4 TS + SQL runners, worker hardening

## Gotchas
- Shell: Bash tool works for `cd ... && cmd | tail`; `sed -i` needs approval, use Edit. PowerShell Select-String pipes blocked.
- QA: `node qa/v2-tools-run.mjs <script.mjs> [arg]` sets env; output in qa/out-tools.txt (grep it). Server: `node qa/serve.mjs start 3200` / `stop 3200`.
- `npm run eval` prints "README.md eval table updated" but leaves no diff; fine.
- Subagents may lack shell; orchestrator runs gates/commits.
- Per-phase reviewer folded into T9 (logged under Decisions).
