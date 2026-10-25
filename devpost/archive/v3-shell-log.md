# v3 shell log

## Implementation
- Navigation switches to the full desktop bar at 1024px; tablets retain bottom tabs. Theme controls and profile avatar have 44px targets.
- Profile target roles/companies/location/remote/graduation use `is:prefs`; `lib/types.ts` unchanged. About you retains field/level/skills for Check scoring.
- Tracker retains move/notes/undo behavior. Added illustration, status chips and risk icons; toast wraps on mobile.
- No theme value changes.

## Needs integration
- Tailor and Practice must consume `is:prefs` target roles/companies/preferences (shell cannot edit their owned routes/components).
- Use shell illustrations in tool empty states when merging other streams.
- Report stream owns any remaining profile loops in components/App.tsx.

## Pending owner review
- None.

## Validation (Oct 25, Codex continuation)
- Final gates all green: lint (2 existing warnings in qa/v2-check-heldout-lint.mjs), tsc, 76 test files / 1204 tests, build, eval 88/88 (held-out 24/27, zero low false positives).
- Mocked browser QA: 132 route/state checks plus 16 accessibility/profile checks; every API intercepted, no live API calls.
- Reviewed 29 shell screenshots across six routes, 1440/390 light/dark, completed Profile, returning Home, filled Tracker, reduced-motion 320/768 Home.
- Fixed findings: missing Tailwind on-ink alias (use token directly), Home animation hydration mismatch (start controls after hydration), mobile control sizes and wrapping undo toast.
- Hidden server on 3300 stopped by verified process tree. No listener remains on 3300.
- Updated stream briefs/report brief were inherited launcher work, preserved in 04d2016; no report-owned source edits.
