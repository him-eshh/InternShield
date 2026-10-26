---
doc: checklist
status: current-v3
---

# InternShield final checklist

This file tracks the final integrated v3 tree. Earlier slice-by-slice build checklists and approvals are process history in `devpost/archive/`. Check off an item only with final-tree evidence; stream branch results do not count as final submission evidence.

## Product

- [x] Check, Tailor, Practice, Tracker, and optional Profile are implemented and linked.
- [x] Check uses quote-backed extraction, deterministic scoring, unavailable-check reporting, quick questions, and add-information recalculation.
- [x] Tailor accepts PDF/DOCX originals, guarded edits, preview, and download.
- [x] Practice supports multi-question sessions, browser code/SQL execution, type-specific review, resume after refresh, summary, and local fallback.
- [x] Local tracker and profile connect to the main tools.
- [x] Example messages and QA fixtures are fabricated; no real recruiter message belongs in the repo.

## Final verification

- [x] `npm run lint` on final tree
- [x] `npx tsc --noEmit` on final tree
- [x] `npx vitest run` on final tree: 86 files, 1,259 tests
- [x] `npm run build` on final tree
- [x] `npm run eval` on final tree: labeled 88/88; held-out 24/27
- [x] Browser QA at desktop and phone widths, light/dark, keyboard, and reduced motion
- [x] Check high/medium/low and skipped lookup flows; quick questions and changed-result explanation
- [x] Tailor PDF and DOCX export, preview, layout/length, accepted edit visibility, and PDF extraction warning
- [x] Practice coding, SQL, behavioral, fallback notice, early stop, refresh, and summary-to-Tracker
- [x] Tracker, Profile, cross-tool prefill, and clear-data flows
- [x] Bounded live smoke: fabricated extraction and interview feedback succeeded with source quotes; wrong Origin returned 403. Initial fabricated Tailor requests returned zero safe suggestions; after prompt refinement, a fabricated one-page PDF completed the real browser flow with three guarded suggestions and a downloaded PDF. Other live routes were not exercised.
- [x] Final documentation, source attribution, and full isolated-snapshot history/tree secret and private-path scan
- [x] Truthful [submission draft](submission-draft.md) and fabricated-data [demo storyboard](demo-storyboard.md) prepared for owner review
- [ ] Owner review of final screenshots, demo, deployment, and Devpost submission materials

## Known limits to disclose

PDF cover-and-redraw is not redaction; DOCX wording is constrained by existing words; worker runtimes need public CDNs; “Most asked” is a historical-list proxy; held-out eval is 24/27 at last documented run. See `spec.md` for detail. Do not mark deployment, a demo recording, or submission complete without direct evidence.
