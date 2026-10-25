# v3 resume progress

## Status
- COMPLETE: the commit containing this file has subject V3 resume summary.
- Branch v3-resume, worktree InternShield-v3-resume. No push/merge/deploy.
- No owned QA server or Word process remains. Port 3000 was never used or stopped.

## Done
- R1 4665e74: structure-preserving PDF/DOCX/text model, made-up fixtures, round trips and resource cleanup.
- R2/R3 84ad3f9: cited company/role plan, required/preferred terms, capped fallback, shared/API guards and <=6 existing bullet edits.
- R5/R6/R7 9918713: cancellable progress, edit review, exact-byte preview/download, responsive QA and integration live-check recipes (zero live calls here).
- R4 d732ae1: original-format exports; per-row PDF widths, <=5% shrink, +3% total budget; conservative Word whole-word deletions enforced shared/API/export.
- Actual Word fixture measured 1 page -> 1 page with three edits present and text inside original margins. Both page images inspected. No runtime Word dependency.
- Final follow-ups: 320 bounded-input wrapping/landmark (481e6db), accepted manual subset budget (fcdf11d), restored-line rejection glow (0fe0d07), PDF glyph integrity (675a8dd), Unicode AI-tell variants (8344aac).
- Final gates ALL GREEN: lint (2 existing QA warnings), tsc, 81 files / 1267 tests, build, eval 88/88 (0 low false positives), held-out 24/27.
- All 36 current PNG artifacts viewed: 32 matrix states at 1440/390 light/dark, 2 mobile zoom, 2 actual Word pages. Affected replacements were re-inspected.
- Final four-variant performance: loading 210-220ms; first Accept 58-69ms, second Accept/Reject <200ms. Later rejection-glow checks: 63/66ms Accept, 221/250ms loading. Reduced-motion and manual-budget checks pass.
- qa/v3-resume-responsive.mjs: Tailor content fits 320/768 including long bounded company/role; shared header issue logged below.

## Handoff
- Full summary + quality checklist + all artifact paths: devpost/v3-resume-summary.md.
- Decisions/live-call recipes: devpost/v3-resume-log.md.
- NEEDS INTEGRATION: at 768 shared Nav/ThemeToggle overflows 105px; Tailor itself fits. Shell owns that fix.
- NEEDS INTEGRATION: replace allowed FilePenLine fallback with TailorIllustration when shell supplies it; retain original-byte upload vs text-only Profile distinction; coordinate CSS import location.
- Word deliberately only removes existing whole words in order; PDF supports broader wording. PDF cover/redraw keeps old text underneath, uses white covers and closest standard fonts; unencodable text is rejected. Plain-text export available.

## Working commands / constraints
- Gates: node qa/v3-gates.mjs -> qa/gates-out.txt. Inspect all exits; runner itself can exit 0 on red gates.
- Browser QA: qa/v3-resume-flow.mjs, states.mjs, responsive.mjs, budget.mjs. All APIs mocked.
- Actual Word QA: npx tsx qa/v3-resume-word.ts (optional Windows/existing Word); COM needs [ref] arguments and .NET string paths. Cold startup can be slow.
- QA_BASE=http://localhost:3100; QA_SHOTS=C:\my_projects\projects\InternShield\.git\internshield-relay\v3-shots\resume; QA_OUT=qa/v3-resume-*-out.txt.
- Prepared PDF previews cache valid <=64 subset PNGs paired with exact output bytes during layout checking; toggles stay local. Cancellation/invalidation are tested.
- Default filesystem read-only; authorized writes/tests/commits used escalated exec. rg absent; use Select-String/Get-ChildItem. Python IO needs UTF-8; use escapes for Unicode in piped scripts.
- No personal vault or .env.local read, no secrets printed, no forbidden paths or learner profile changed. Original eval cases unchanged.
