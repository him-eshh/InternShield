# Tier 4 summary: interview rounds for other fields

## What's built and merged
Merged to main as `cb65b55` (`git merge --no-ff tier4`). The interview round picker now offers rounds based on the profile's field:
- **Slice 14, Business (case interview).** Four made-up cases, three questions each: structure (rubric), one calculation (final number checked in code), recommendation (rubric). Questions are local, so a session makes one AI call (feedback).
- **Slice 15, Finance (technical questions).** 13 made-up accounting/valuation questions (6 numeric, checked in code; the rest by rubric). Each session gets 4 distinct questions and makes one AI call.
- **Slice 16, Design (portfolio walkthrough + design challenge).** Portfolio: optional links (http(s) only, up to 5) are shown but never fetched, then up to 3 AI follow-ups. Challenge: a 20-minute timed sketch on the Tier 3 board using Screen boxes, with 2 AI follow-ups. Feedback is told whether time ran out.
- Feedback has a "Checked by code" row for each scripted answer. It stays even when the AI skips that answer.
- The route rejects any round whose flag is off, so hidden rounds can't be reached by a direct POST.

There is no new route, cap, dependency or storage key.

## Process
This session picked up the unreviewed Phase B drafts. The per-slice review found no blockers; its should-fixes went into the slice commits:
- Slice 14: `ca07bff`
- Slice 15: `c3ddd70`
- Slice 16: `fc50871`

The merge-gate review also found no blockers. Its 2 should-fixes and the nits are in `54e8187`.

## Test results (tier4 and main after merge)
- `npm run lint`, `npx tsc --noEmit` and `npm run build` all pass.
- 519 tests pass (430 before this tier).
- Eval: 26/26.
- `git diff core-v1 -- lib/scoring eval/messages` is empty.
- The examples test (saved results) passes.
- `next start` smoke test: `/` returns 200, and an interview POST from another origin returns 403.

## Live calls
0 of 2. Mocked route tests cover the prompts, checks and link handling.

## Pending owner review (morning), hands-on
- Business profile: run a case and answer the calculation in words, e.g. "so about 4,000 cups".
- Finance profile: answer a numeric question as "$1.2 million" and check it's read right.
- Design profile: add two made-up portfolio links and answer a follow-up. Draw a 3-screen flow in the challenge and watch the timer.
- One live feedback call for a scripted round, to confirm qwen doesn't re-grade the "Check:" lines.

## Known issues / limits
- Rubric checks are keyword matches. A good answer in unusual wording can show "– missing"; the AI feedback sits next to it.
- `scriptFor` picks questions by seed index. The banks must only be appended to (a comment in the code says so), otherwise in-progress sessions move to different questions.
- Number reading takes the last number in the answer. Shorthand such as "b/c" is ignored, but other trailing numbers can still be picked up instead of the final answer.
