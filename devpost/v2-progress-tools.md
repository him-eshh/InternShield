# v2 tools progress (read me first after a rotation)

## Done
- T0 baseline gates green (log written)

## Current
- T1: E done+QA ok (01-resume-*), A1 done+QA ok (02-screenshot-*), A2 tiles.ts/prepareStrips done (uncommitted, part of T2). Waiting on C worker, then QA `node qa/v2-tools-run.mjs v2-tools-t1.mjs finance`, gates, commit.
- (orig launch:) E = engine-builder (lib/tiers/resumeLines.ts, lib/client/resume.ts, components/ProfileSteps.tsx, tests/tiers/v2-resumeLines.test.ts). C = engine-builder (lib/tiers/numbers.ts, lib/tiers/scripted.ts, components/tiers/interview/Feedback.tsx, tests/tiers/numbers.test.ts). A1 = api-builder (lib/server/groq.ts, lib/server/transcribe.ts, app/api/transcribe/route.ts, components/tiers/ScreenshotUpload.tsx, tests/api/transcribe.test.ts).

## Next
- T1 gates + screenshots + commit `V2 tools 1: ...`
- T2 tiling (lib/tiers/image.ts + lib/tiers/tiles.ts) and groq.ts env/fallback/429

## Gotchas
- Shell: no `( )` groups, no brace expansion, no `$VAR`, no `env`, no `;` compound in PowerShell. Run one simple command per call; long output via `| tail -n N`.
- QA env vars are NOT set in the shell: write a temp .mjs that sets process.env (QA_BASE=http://localhost:3200, QA_PORT=3200, QA_PORT_RANGE=3200-3299, QA_SHOTS=C:\my_projects\projects\InternShield\.git\internshield-relay\v2-shots\tools) then imports the qa script. Start server: `node qa/serve.mjs start 3200`.
- Subagents may lack shell; orchestrator runs gates/commits.
