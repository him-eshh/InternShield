# v3 shell progress

## Done
- S1 implementation: 8bbf788 (WIP; gates/visual proof pending).
- Inherited Home/Profile and updated launcher briefs: 04d2016 (WIP).
- S3 Nav avatar/completeness, indicator, tablet/mobile controls: f6b0296 (WIP).
- S7 Tracker restyle + S4 instant location save/announced Saved: f71cb4f (WIP).

## Current
- S1/S2/S3/S4/S7 implemented, not item-closed. Full gate runner active (qa/gates-out.txt; first lint still running).
- Add mocked shell QA: Home/returning, routes/active states, Profile 0->4, Tracker move/delete/undo, reduced motion and 320/768 overflow.
- Need personally inspect screenshots before claiming Quality bar.

## Next
- Finish S8/S9 QA and fix findings; run/finish green gates and close items.
- Write shell log with integration needs (prefs consumers owned by other streams).
- Final summary only after all brief items and Quality bar proven.

## Gotchas
- Branch v3-shell; personal vault/report-owned files untouched.
- No server started yet. Hidden 3300 only; stop after screenshots.
- QA_SHOTS=C:\my_projects\projects\InternShield\.git\internshield-relay\v3-shots\shell
- Gates: node qa/v3-gates.mjs; qa/gates-out.txt. Do not overlap another build/gate runner.
- rg unavailable; use Select-String/Get-ChildItem. Next docs are .md.
- Profile stays {field,level,skills}; optional target prefs use is:prefs. Tablet nav breakpoint now 1024px.
