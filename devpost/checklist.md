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
- [x] `npx vitest run` on final tree: 86 files, 1,260 tests
- [x] `npm run build` on final tree
- [x] `npm run eval` on final tree: labeled 88/88; held-out 24/27
- [x] Browser QA at desktop and phone widths, light/dark, keyboard, and reduced motion
- [x] Check high/medium/low and skipped lookup flows; quick questions and changed-result explanation
- [x] Tailor PDF and DOCX export, preview, layout/length, accepted edit visibility, and PDF extraction warning
- [x] Practice coding, SQL, behavioral, fallback notice, early stop, refresh, and summary-to-Tracker
- [x] Tracker, Profile, cross-tool prefill, and clear-data flows
- [x] Bounded live smoke: fabricated extraction and interview feedback succeeded with source quotes; wrong Origin returned 403. Initial fabricated Tailor requests returned zero suggestions that passed the checks; after prompt refinement, a fabricated one-page PDF completed the real browser flow with three guarded suggestions and a downloaded PDF. Other live routes were not exercised.
- [x] Final documentation, source attribution, and full isolated-snapshot history/tree secret and private-path scan
- [x] Verified [submission fact sheet](submission-draft.md) and fabricated-data [demo storyboard](demo-storyboard.md) prepared for owner review
- [x] Captured a silent local demo draft with fictional inputs, live Check and Tailor API responses, and 6 of 6 runnable Practice tests

## Final Review

- [ ] Owner runs the current app and tries the Check → Tailor → Practice journey, awkward inputs, and the four screenshots; record what broke or confused them.
- [ ] Resolve owner feedback, rerun the affected checks, and have the owner retry changed behavior; record the outcome here.
- [ ] Owner explicitly confirms the proof of concept is ready for submission.

## Code Tour and App Map

- [x] Prepare the offline [app map](app-map.html) from the current Check journey; local links and phone layout verified.
- [ ] With the owner, follow Check input → pipeline and fixed score → report using the map, or record an equivalent learning activity they actually completed.
- [ ] Record any optional edit outcome and whether the optional reflection was answered, declined, or already covered; do not infer learning from the map alone.

## Build With AI: Basics submission

The [official rules](https://learn-ai-basics.devpost.com/rules) set a deadline of October 26, 2026 at 5:00 PM ET. A live deployment is optional; the public source and video are required.

- [ ] Publish only the isolated root snapshot in a public GitHub/GitLab/Bitbucket repository, without the older private-path history
- [ ] Confirm the public repository opens without authentication and contains the source, assets, run instructions, `scope.md`, `prd.md`, and `spec.md`
- [ ] Choose and add a visible open-source license if the owner agrees (recommended by the event rules)
- [ ] Owner reviews the local draft or final recording for private content and verifies the final video is under three minutes
- [ ] Upload the video publicly to YouTube or Vimeo and verify the link without authentication
- [ ] Owner writes the project name, short description, a short explanation of Devpost Learn Skill Pack use, other required fields, and exit-survey answers in their own words; owner answers the age-of-majority checkbox
- [ ] Put the public repository URL in Devpost's “Try it out” field and verify the submitted form retains it
- [ ] Submit on Devpost before the deadline and record the actual submission URL and date here

Public repository URL: **pending**. Public demo video URL: **pending**. Devpost submission URL and date: **pending**.

## Known limits to disclose

PDF cover-and-redraw is not redaction; DOCX wording is constrained by existing words; worker runtimes need public CDNs; “Most asked” is a historical-list proxy; held-out eval is 24/27 at last documented run. See `spec.md` for detail. Do not mark a video, repository, optional deployment, or submission complete without direct evidence.
