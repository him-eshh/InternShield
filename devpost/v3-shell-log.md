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

## Pending Himesh
- None.
