# v3 resume progress

Dev server: none; QA trees 45528/39380/48048 stopped after rounds (port 3100). Never use port 3000.

## Done
- R1: structure-preserving model + made-up fixtures; PDF/DOCX zero-edit byte identity, section/text/page round trips, PDF resource cleanup. Closed in 4665e74.
- Prior work preserved: 4c36675 (parser/render WIP), b1a42ca (handoff updates + shared edit checks WIP).
- R1 gates: lint 0 errors (2 existing QA warnings), tsc clean after stale suppression removed, 76 files / 1215 tests, build green, eval 88/88 and held-out 24/27.

## Current
- R2 implementation: resumePlan.ts + PlanPanel.tsx + 9 mocked tests pass. Required/preferred terms, confirmed facts, safe source links, capped/error fallback, cancellation. Needs R5 wiring + visual verification before item closure.
- R3 server/shared sub-item: mode=edits in rewriteEdits.ts; model output filtered server-side by checkedEdits; 28 new adversarial tests + 29 existing rewrite tests pass (57 total). Typecheck passed before last punctuation/fact tightening; rerun. Checkpoint b6e7289.
- R3 width validation + plan guidance now wired server/browser (resumeWidth.ts); route test proves too-wide suggestions dropped. Skill toggles reversible; extra suggestions respect combined budget. 31 focused tests pass. R4 row-fit fix now implemented; 17 parser/render tests pass incl. per-row widths + literal DOCX bullet preservation. Checkpoint cbc116c. UI wired: resumeEditor.ts + DocumentPreview/EditCard + replaced ResumeTailor.tsx. Real steps/cancel, accept/reject/edit, source panel, original bytes preview, download gating. Typecheck + scoped lint green; 52 related tests pass. Checkpoint 3056009. Quick Playwright flow passed at 1440/390 light; viewed both resume-review shots in QA_SHOTS. Current long task: qa/v3-resume-states.mjs + flow timing (no new quick shots), DOCX/cancel/fallback/manual guard/skill reversal pass. Timing regression fixed via persistent PDFWorker + atomic canvas swap: loading 210/214ms; accept-to-preview 118/50ms at 1440/390. Flow passes. Next full gates, close R2/R3 where proven; R4 DOCX pagination still not proven. Shared width/plan checkpoint ab0ef08.

## Next
- R2/R3 item closure waits for UI wiring and full gates; commits are WIP meanwhile.
- R4 finish render checks: variable PDF row widths, DOCX pagination limitation, export alternatives.
- R5 UI: components/resume/**, replace components/tiers/ResumeTailor.tsx; update old tier2 tests.
- R6 QA + screenshot matrix; R7 integration live-call instructions; summary only after all quality checks pass.

## Gotchas
- Personal vault intentionally not read (user instruction).
- Filesystem is read-only by default; authorized edits/tests/commits require escalated exec.
- Unicode literals in piped Python scripts become ?; use ASCII escapes (\u2014) or hyphen fixture bullets.
- rg unavailable; use Get-ChildItem / Select-String. Python file IO must specify encoding="utf-8".
- Gate runner: node qa/v3-gates.mjs; output qa/gates-out.txt. It records each exit but does not fail overall; inspect every gate.
- Expensive pdf.js initialization moved into beforeAll (30s); PDF parsing destroys its document in finally.
- PDF test standard-font warnings remain; assertions pass. PDF cover/redraw leaves old text layer.
- DOCX page count is stored metadata, not verified layout after editing; must not claim proven pagination.
- Profile resume holds text only (ResumeData {text,fileName}); upload bytes in /tailor to edit in place.
- Old UI: ResumeTailor.tsx (803 lines); tests/ui/v2-tools-tailor.test.tsx + uxPass reference it.
