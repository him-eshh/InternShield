# v3 resume progress

Dev server: none. All owned 3100 QA trees stopped (last 46024). Never use port 3000.

## Done
- R1: 4665e74; PDF/DOCX/text model, fixtures, zero-edit byte/text/order/page round trips, PDF cleanup.
- R2 + R3 core: 84ad3f9; cited company/role plan, required/preferred keywords, intel fallback; <=6 bullet edits, shared/API fact/tell/style/length guards, PDF width checks. DOCX width proof remains in R4 below.
- R5/R6/R7: closed in 9918713. Real cancellable steps; source panel; accept/reject/manual edit + diffs; reversible confirmed skills; exact-byte PDF/DOCX preview and gated download; PDF zoom. R7 live-call recipes in devpost/v3-resume-log.md (zero live calls here).
- Latest full gates ALL GREEN: lint (2 existing warnings), tsc, 80 files / 1251 tests, build, eval 88/88; held-out 24/27.
- QA: qa/v3-resume-flow.mjs --full passed 1440/390 light/dark; all 32 matrix shots viewed. Targeted fixes also passed; all 18 replacement/zoom shots viewed. Final loading 210-220ms; first Accept 58-69ms; second Accept and Reject <200ms (completed preview version, not an early highlight).
- qa/v3-resume-states.mjs passed DOCX preview/download, cancellation, capped intel, unsafe manual wording, reversible skill, active-link stripping with contact text preserved.
- Checkpoints: b1a42ca initial work preserved; 3056009 UI; ab0ef08 widths; 9729ab5 mobile fixes; bfbeff6 prepared previews + cache-safety tests.

## Current
- R4 current: conservative Word constraint implemented at shared/API/export boundaries (only remove whole existing words in order; no new glyphs/expanding whitespace). UI explains PDF for broader wording. Focused 38 tests and tsc pass. Word deletion-only QA running; next DOCX browser states and 2 R4 shots, then gates. Next: actual Word QA with deletion-only edits + updated DOCX browser states, then full gates.
- Word retry succeeded after warm startup + COM [ref] arguments. Actual fixture QA: original 1 page -> edited 1 page, all 3 changes present, text inside original margins. Correct optional qa/v3-resume-word.ts + .ps1 restored; rerun now with deletion-only edits. Own Word instances closed; no server running.
- R3 typography follow-up: 8344aac, 24 focused tests pass; six new Unicode phrase cases. R5/R6/R7 closed 9918713.

## Next
- Finish R4 DOCX layout/overflow guarantee; consider a conservative deterministic layout constraint rather than metadata assertions. PDF per-row fitter and total +3% budget already tested.
- Refresh gates only after code changes justify it; commit each sub-item, item closure requires all gates green.
- Write devpost/v3-resume-summary.md and exact V3 resume summary commit ONLY after every item + Quality bar is truly done.

## Gotchas
- Personal vault intentionally not read; .env.local/keys never read. No pushes/merges/deploys.
- Default filesystem read-only; authorized edits/tests/commits need escalated exec. No approvals rejected so far.
- rg unavailable; Get-ChildItem/Select-String. Python IO needs encoding="utf-8"; Unicode in piped scripts becomes ?, so use ASCII escapes.
- Gates: node qa/v3-gates.mjs -> qa/gates-out.txt; runner exits 0 even if individual gates fail, inspect every exit.
- QA env: QA_BASE=http://localhost:3100; QA_SHOTS=C:\my_projects\projects\InternShield\.git\internshield-relay\v3-shots\resume; QA_OUT=qa/v3-resume-*-out.txt.
- Prepared PDF previews enumerate <=64 valid subsets while layout-check step runs, one worker; each cached PNG is tied to exactly its downloadable bytes. Cache-safety tests prove matching/invalidation/cancel. Manual wording prepares new variants and applies immediately.
- PDF cover/redraw leaves old text layer (known brief limit); white cover; plain-text export offered. PDF standard-font warnings in tests remain.
- Profile stores text only; upload original bytes to preserve layout. No illustrations directory here; allowed FilePenLine fallback (integration note).
