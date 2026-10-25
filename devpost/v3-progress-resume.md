# v3 resume progress

Dev server: none running (start only hidden, port 3100; note the Id here).

## Done
- (nothing yet)

## Current
- R1: parse model (lib/tiers/resumeModel.ts, resumeDocx.ts, resumePdf.ts) + fixtures (tests/fixtures/resume/)

## Next
- R3 shared edit checks (lib/tiers/resumeTells.ts, resumeEdits.ts), server edits mode in lib/server/rewrite*
- R4 render: DOCX in-place (jszip), PDF cover+redraw (pdf-lib), length check
- R2 plan (lib/tiers/tailorPlan.ts + /api/intel client)
- R5 UI: components/resume/**, rewrite components/tiers/ResumeTailor.tsx; remove old tier2 UI tests
- R6 tests + qa/v3-resume-*.mjs; summary

## Gotchas
- Vault (claude_brain) unreachable: no Context-Card; continue without.
- Bash tool rejects `for` loops/variables; use plain commands. PowerShell rejects script blocks.
- Old UI: components/tiers/ResumeTailor.tsx (803 lines, tier2); tests/ui/v2-tools-tailor.test.tsx + uxPass reference it.
- Profile resume holds text only (ResumeData {text,fileName}); file bytes must be uploaded in /tailor to edit in place.
- PDF cover-and-redraw leaves old text in the text layer (known limit, log in summary).
