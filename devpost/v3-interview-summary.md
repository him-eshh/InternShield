# V3 interview summary

> This is a stream handoff snapshot, not final integrated status. The Practice clear-data, Home Continue, report/profile prefill, illustration, and summary-to-Tracker seams listed under “Needs integration” were subsequently merged. The finance round, design challenge, whiteboard, and single-round flow were retired. See `prd.md`, `spec.md`, and `checklist.md` for the current product and verification state.

Interview stream complete on `v3-interview`. Application source: `c710ba0`. All seven items and all Quality bar checks are complete; evidence is in [v3-interview-qa.md](v3-interview-qa.md).

## Shipped

| Item | Status | Result | Closing commit |
|---|---|---|---|
| I1 | ✓ | 1,130 real metadata-only questions; lazy bank and company/role/difficulty/topic filters | `dc735de` |
| I2 | ✓ | Cited company card shapes stages and STAR themes; clear preset fallback | `8d6d9a2` |
| I3 | ✓ | Eight round types, topics/custom questions, difficulty/company/role/language, question or round count, existing target prefill | `809d672` |
| I4 | ✓ | Continuous runnable/discussion flow, 0-2 follow-ups, adaptive Mixed, no repeats, hints/skip/early stop, refresh and draft recovery | `1aca116` |
| I5 | ✓ | Round progress, overall/per-round scorecards, local SQL correctness, unique next drills, recaps/links, weak-topic retry and history | `99ec74f` |
| I6 | ✓ | One compact review per answer combines feedback/follow-up; 30-call session cap, existing daily guard, offline continuation | `91c0b11` |
| I7 | ✓ | Full gates, real browser runners, mocked flows, all 36 captures inspected | `1f33d89` |

Normal celebration lasts 0.6 seconds and reaches its final state within the 1.2-second browser check. Reduced motion shows final states immediately.

## Bank sources

`data/question-bank/bank.json`: 1,130 entries, about 300 KB, metadata only. No problem statements, solutions or source tests are copied. Full attribution and rebuild instructions: [SOURCES.md](../data/question-bank/SOURCES.md).

| Public GitHub dataset | License | Pinned commit | Retrieved |
|---|---|---|---|
| [hxu296/leetcode-company-wise-problems-2022](https://github.com/hxu296/leetcode-company-wise-problems-2022) | MIT | `33f44cb62594b13f7b3e0ec12e8f811b40fddd0d` | 2026-10-25 |
| [newfacade/LeetCodeDataset](https://github.com/newfacade/LeetCodeDataset) | MIT | `182cd19fd53161efd70a1ef074fe1056b659bfa3` | 2026-10-25 |

Company tags reflect historical May 2022 lists. Current company research uses the shared cached/capped intel endpoint.

## Validation and Quality bar

- Lint, TypeScript, full Vitest, production build and eval are green. **78 files / 1,232 tests passed; eval 88/88; held-out 24/27**, with zero low-risk false positives. Two existing unrelated lint warnings remain.
- Four browser variants each complete exactly five unique questions across coding, behavioral and SQL with follow-ups, refresh recovery, automatic end, summary/history and early stop.
- Edge QA proves real TypeScript execution, chosen language, hint accounting, unfinished code/approach recovery, two rounds ending at six questions, verbatim custom questions, limited-intel fallback and completion at the 30-call cap.
- Python and SQL use their real browser workers in the matrix. Existing runner tests remain green. Failed SQL cannot receive a strong correctness grade just because model feedback is positive.
- Generated-plan/filter/license/adaptive/follow-up/persistence tests cover the remaining Quality bar lines. No API keys or live model/intel calls were used.

## Screenshots

All **36** final captures personally inspected, including phone and desktop in both themes. Root:

`[project root]\.git\internshield-relay\v3-shots\interview`

Names: `v3-interview-<state>-<variant>.png`.

- States: `setup`, `intel`, `coding`, `feedback`, `followup`, `progress`, `end-confirm`, `summary`, `history`.
- Variants for every state: `1440-light`, `1440-dark`, `390-light`, `390-dark`.
- Full evidence/index and replay commands: [v3-interview-qa.md](v3-interview-qa.md). Feedback and follow-up are two captures of the combined feedback/follow-up screen.
- Review sheets: `review-<state>.jpg`. Dev-only overlays are hidden during capture; product code is unchanged by that helper.

All interview dev servers started in this session were hidden on port 3200 and are stopped. Port 3000 was not used or stopped.

## Needs integration

Shared files were left to their owners:

1. Add `is:practice-active` and `is:practice-history` to shared clear-data handling and clear any mounted Practice state.
2. Wire Home Continue to the v3 active key. Legacy `is:interviews` remains for compatibility/tests.
3. Use shell's hand-made Practice illustration when available; this base has no illustration module, so Practice currently uses a lucide header icon.
4. Preserve expanded-profile company/role targets through the shared app-state seam. The base target company/role and profile/resume context already work.
5. Integration owns the cross-tool Practice-summary-to-Tracker seam.

The existing uncommitted engine/API and launcher brief updates were preserved in `0a353b0`. No work was discarded. Details and decisions: [v3-interview-log.md](v3-interview-log.md).

## Integration live smoke check (maximum four calls)

1. One `/api/intel` interview lookup; verify cited stages/values or the explicit fallback.
2. One coding review with local test results; verify feedback honors those results.
3. One behavioral review; verify the exact answer quote and conservative, question-type follow-up. Model-written STAR ratings are not used in the final server review.
4. One review of that follow-up; verify it grades the last turn and respects the remaining follow-up budget.

## Known limitations

- Live provider response quality is unverified here; all model/intel QA is mocked as required.
- Finite app pools and historical bank coverage can exhaust a chosen mix. Unmatched bank filters show an explicit skip/end path rather than unrelated substitute questions.
- Runtime assets use the existing free public CDNs; first Python/compiler/SQL loads need network or a cached asset.
- Baseline held-out misses ho-11, ho-15 and ho-16 are unchanged. Scoring/eval fixtures were not edited.

No push, merge or deployment was performed.
