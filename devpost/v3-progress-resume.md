# v3 resume progress

Dev server: none. All owned 3100 QA trees stopped (last 21948). Never use port 3000.

## Done
- R1: 4665e74; PDF/DOCX/text model, fixtures, zero-edit byte/text/order/page round trips, PDF cleanup.
- R2 + R3 core: 84ad3f9; cited company/role plan, required/preferred keywords, intel fallback; <=6 bullet edits, shared/API fact/tell/style/length guards, PDF width checks. DOCX width proof remains in R4 below.
- R5/R6/R7: closed in 9918713. Real cancellable steps; source panel; accept/reject/manual edit + diffs; reversible confirmed skills; exact-byte PDF/DOCX preview and gated download; PDF zoom. R7 live-call recipes in devpost/v3-resume-log.md (zero live calls here).
- Latest full gates ALL GREEN: lint (2 existing warnings), tsc, 81 files / 1265 tests, build, eval 88/88; held-out 24/27.
- QA: qa/v3-resume-flow.mjs --full passed 1440/390 light/dark; all 32 matrix shots viewed. Targeted fixes also passed; all 18 replacement/zoom shots viewed. Final loading 210-220ms; first Accept 58-69ms; second Accept and Reject <200ms (completed preview version, not an early highlight).
- qa/v3-resume-states.mjs passed DOCX preview/download, cancellation, capped intel, unsafe manual wording, reversible skill, active-link stripping with contact text preserved.
- Checkpoints: b1a42ca initial work preserved; 3056009 UI; ab0ef08 widths; 9729ab5 mobile fixes; bfbeff6 prepared previews + cache-safety tests.

## Current
- R4 complete with conservative Word edits: only whole-word deletion, surviving order/run/paragraph formatting preserved. Enforced shared/API/export; PDF used for broader wording. Actual Word QA: 1 page -> 1 page, 3 supported edits present, within original margins; before/after images viewed. Closing commit contains this update.
- Latest gates ALL GREEN: lint/tsc, 81 files / 1265 tests, build, eval 88/88; held-out 24/27. Typography follow-up included.
- All Word instances and owned 3100 QA servers closed. Optional actual-Word QA: npx tsx qa/v3-resume-word.ts (Windows, existing Word; cold start can be slow; COM needs [ref] + .NET string paths).
- R4 closed d732ae1. Final responsive check found unbroken company/role overflow at 320; fixed with overflow-wrap:anywhere in owned CSS. qa/v3-resume-responsive.mjs tests 320/768 empty/review/preview. 320 fix passes. At 768 Tailor root fits 768/768; shared Nav/ThemeToggle overflows 105px outside our ownership (Needs integration log). 320/768 Tailor empty/review/preview checks now pass, with shared 768 header issue explicitly logged for integration. Nested main landmark also corrected to a named section. All QA servers stopped. CSS/markup follow-up gates passed (81/1265). Last small fix: manual blur must check the actually accepted subset budget, not rely on pending shortenings. qa/v3-resume-budget.mjs regression passed; manual over-budget wording remains a draft. Budget checkpoint fcdf11d. One remaining feedback fix: restored line must glow briefly on Reject; added transient line highlight and explicit QA assertion. Typecheck and no-shot flow/reduced-motion checks passed: first Accept 63/66ms, loading 221/250ms; Reject glow asserted. Last integrity fix: PDF must reject unencodable characters, never convert them to question marks. 26 focused tests and tsc pass. Accept/Reject glow (including restored text) and reduced motion passed browser checks; latest first Accept 63/66ms. Commit follow-ups, final gates, summary; no more planned product changes.

## Next
- Final summary: brief/quality checklist, 1265 tests, screenshot index, integration seams + exact live-call recipes, conservative Word restriction and PDF old text layer.
- No push/merge/deploy. Final V3 resume summary commit only after summary is written and all remaining checks complete.

## Gotchas
- Personal vault intentionally not read; .env.local/keys never read. No pushes/merges/deploys.
- Default filesystem read-only; authorized edits/tests/commits need escalated exec. No approvals rejected so far.
- rg unavailable; Get-ChildItem/Select-String. Python IO needs encoding="utf-8"; Unicode in piped scripts becomes ?, so use ASCII escapes.
- Gates: node qa/v3-gates.mjs -> qa/gates-out.txt; runner exits 0 even if individual gates fail, inspect every exit.
- QA env: QA_BASE=http://localhost:3100; QA_SHOTS=C:\my_projects\projects\InternShield\.git\internshield-relay\v3-shots\resume; QA_OUT=qa/v3-resume-*-out.txt.
- Prepared PDF previews enumerate <=64 valid subsets while layout-check step runs, one worker; each cached PNG is tied to exactly its downloadable bytes. Cache-safety tests prove matching/invalidation/cancel. Manual wording prepares new variants and applies immediately.
- PDF cover/redraw leaves old text layer (known brief limit); white cover; plain-text export offered. PDF standard-font warnings in tests remain.
- Profile stores text only; upload original bytes to preserve layout. No illustrations directory here; allowed FilePenLine fallback (integration note).
