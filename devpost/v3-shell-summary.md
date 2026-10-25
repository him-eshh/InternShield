# V3 shell summary

Shell items closed in `38f9768`, after all five gates passed. Codex continued the paused Claude shell stream; inherited work was preserved before edits.

## Shipped

| Item | Result |
| --- | --- |
| S1 | Done: five hand-made SVG illustrations, lucide wrappers, tri-arc logo/favicon/apple/share images, shared UI primitives. |
| S2 | Done: mesh hero, one primary Check action, three illustrated tool cards, how-it-works strip, saved-report/resume/practice/profile continuation rows. |
| S3 | Done: desktop tabs with animated active indicator, tablet/mobile bottom tabs, theme controls, profile initials/completeness ring. |
| S4 | Done: optional four-step Profile, PDF/DOCX or pasted text, name/sections preview, role/company chips, existing field/level/skills plus optional preferences, instant saves and inline Saved, editable later. |
| S7 | Done: illustrated Tracker empty state, company/role/status cards, risk icons, quick moves, notes, delete/undo. |
| S8 | Done: mobile targets and keyboard focus, 320/390/768/1440 layouts, reduced-motion final states, hydration-safe Home reveals, token contrast. |
| S9 | Done: mocked route/state and accessibility scripts, preference storage regressions, screenshot matrix personally reviewed. |

## Quality bar evidence

- Navigation and Home return: `qa/v3-shell-qa.mjs` checks all six routes at 1440/390 in light/dark. Tool active colors visible in the route screenshots; logo returns Home, including keyboard Enter.
- Tool clarity and one-click entry: Home card-link assertions plus `shell-home-new-{1440,390}-{light,dark}.png`.
- Profile progress/save/optional flow: 0/4 -> 4/4, all four Saved confirmations, reload persistence and editable saved steps tested. `shell-profile-complete-390-light.png` shows completion, Saved and avatar initials.
- Tool colors and risk separation: Home/route matrix reviewed; risk labels carry icons, dark canvas remains ink navy. Existing theme tests verify contrast and no hex literals in components.
- Motion: Home mount stagger and route transitions use motion/react; reduced motion never hides cards. `shell-home-reduced-{320,768}-light.png` plus final-opacity checks. Hydration warnings are QA failures.
- Responsive/a11y: no overflow at 320/768 on owned screens, 390/1440 on every route; measured 44px controls, visible keyboard focus and profile progress/save announcements.
- Ownership: no report-owned source edits; no scoring/eval case changes. Inherited launcher brief updates preserved in `04d2016`.

## Validation

- `npm run lint`: pass; two existing warnings in `qa/v2-check-heldout-lint.mjs`.
- `npx tsc --noEmit`: pass.
- `npx vitest run`: 76 files, 1204 tests passed.
- `npm run build`: pass.
- `npm run eval`: 88/88; held-out 24/27; zero low-risk false positives.
- Browser: 132 route/state checks plus 16 accessibility/profile checks, all passed; every API mocked, no live calls.
- Earlier PDF test timeout under concurrent compilation passed both isolated and in the final full run.
- 29 screenshots: [complete index](v3-shell-screenshots.md). Base matrix covers Home/Check/Tailor/Practice/Tracker/Profile at 1440 and 390, light and dark; additional shots show returning Home, completed Profile, filled Tracker, and reduced-motion 320/768 Home.
- No `app/theme.css` value changes. No screenshots tracked. Hidden port-3300 server stopped; no listener remains.

## Needs integration

- Tailor/Practice consume `is:prefs` target roles, companies, location, remote and graduation preferences. Existing profile/resume context remains available through AppStateProvider; shared Profile type is unchanged.
- Other streams adopt shell illustrations in their tool empty states and shared UI primitives where needed.
- Report stream/integration audits any remaining profile loops in report-owned `components/App.tsx`; shell did not edit it.
- Nav was tested against the setup versions of Check/Tailor/Practice; repeat seam QA after merging their streams.

## Known issues

No known shell-blocking failures. Cross-stream consumers and final merged-app QA remain integration work above. Profile data remains local and optional; storage restrictions retain the existing best-effort persistence behavior.
