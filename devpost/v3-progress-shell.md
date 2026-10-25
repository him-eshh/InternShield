# v3 shell progress

## Done
- S1 implementation preserved in 8bbf788; validation pending.
- Inherited Home/Profile work and launcher brief updates preserved in 04d2016.

## Current
- S1/S2 validation; S3 navigation polish next. Home and guided Profile are implemented but not yet QA-proven or item-closed.
- Reviewing inherited profile save behavior and Home returning-state links.

## Next
- S3 Nav avatar/completeness, animated active indicator, mobile touch targets.
- S4 Profile save/progress QA; S7 Tracker restyle.
- S8 responsive/a11y/reduced motion; S9 mocked QA matrix; summary only when all complete.

## Gotchas
- Branch v3-shell; do not read personal vault or touch report-owned files.
- No server started. Use hidden 3300 only; stop after screenshots.
- QA_SHOTS=C:\my_projects\projects\InternShield\.git\internshield-relay\v3-shots\shell
- Gates: node qa/v3-gates.mjs; results qa/gates-out.txt.
- rg unavailable; use Select-String/Get-ChildItem. Next docs are .md, not .mdx.
- Profile remains {field,level,skills}; optional target prefs stored as is:prefs.
