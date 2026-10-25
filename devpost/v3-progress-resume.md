# v3 resume progress

Dev server: none; QA trees 45528/39380/48048/19440 stopped after rounds (3100). Never use port 3000.

## Done
- R2/R3: cited company/role plan, required/preferred keywords, capped/error fallback; guarded edits API + client, <=6 bullets, fact/tell/style/+3% checks, PDF row widths, confirmed posting skills only. Closed in 84ad3f9.
- Latest gates: lint/tsc/build/eval green; 79 files / 1248 tests; eval 88/88, held-out 24/27.
- R1: structure-preserving model + made-up fixtures; PDF/DOCX zero-edit byte identity, section/text/page round trips, PDF resource cleanup. Closed in 4665e74.
- Prior work preserved: 4c36675 (parser/render WIP), b1a42ca (handoff updates + shared edit checks WIP).
- R1 gates: lint 0 errors (2 existing QA warnings), tsc clean after stale suppression removed, 76 files / 1215 tests, build green, eval 88/88 and held-out 24/27.

## Current
- R4/R5/R6 finish: guarded editor/preview wired (3056009), width checks (ab0ef08), PDF worker optimization + DOCX/cancel tests (324acf0).
- Quick review shots at 1440/390 light viewed; mocked PDF flow and DOCX/cancel/skill reversal pass. Loading 210/214ms, first accept 118/50ms before final bytes/highlight snapshot pairing fix. Rerun timing now that pairing is corrected.
- Final matrix passed and all 32 shots viewed. Loading 212-232ms; byte-matched PDF accept 100-133ms. Found mobile progress below fold; adding auto-scroll + nearby Cancel and PDF zoom. Next rerun affected shots with --full --fix-shots; inspect them, then gates.

## Next
- R4: DOCX pagination remains unproven (stored page metadata only); no local soffice. Need conservative handling/explicit limitation; do not claim full quality bar.
- R5/R6: final 1440/390 light/dark matrix + too-long/glow/download states; cancellation/DOCX QA in qa/v3-resume-states.mjs. Add tests for unsafe DOCX preview HTML, preserve hyperlink text.
- R7: document integration live-call recipes (no calls here); integration needs illustration replacement when shell supplies it.
- Final summary commit ONLY if every brief item and Quality bar actually complete.

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
- Legacy Tailor UI assertions replaced; unrelated uxPass tests retained.
