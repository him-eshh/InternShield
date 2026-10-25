# InternShield v3 report summary

> This is a stream handoff snapshot. Current Check behavior, scoring, and final verification are in `prd.md`, `spec.md`, and `checklist.md`; the integration tasks and screenshots below describe the state at the time of this stream.

Branch: `v3-report`. Item-closing commit: `d57555b`.

## Shipped against the brief

| Item | Status | Result |
|---|---|---|
| P1 Check form and checking | ✓ | Coral identity, helpful empty state, examples, progressive details, screenshot upload, enabled submit with useful errors. Real step outcomes; 200ms spinner delay; explanation completes only when its result exists. |
| P2 Report | ✓ | Neutral raised verdict surface, risk icons/words, coverage ticks, animated count-up, top reasons, evidence, annotations, recovery, company editing, one primary action. Low hides Copy; live high hides Tailor/Practice; tracker confirmation remains inline. |
| P3 Answer impact | ✓ | Before/after diffs for added, removed and reweighted signals; score/level changes or meaningful unchanged-score confirmation. Confirmations stay below answers; answered questions collapse and can be changed. Company/sender/message/screenshot additions stay in the report. Updated report and answers survive refresh. |
| P4 Tests and QA | ✓ | 12 report tests, updated behavior assertions, mocked browser matrix, motion sampling, 56 reviewed screenshots. |

## Quality-bar evidence

| Requirement | Evidence |
|---|---|
| Every addition has visible impact; questions do not restart | `tests/report/impact.test.ts`, `report-rules.test.tsx`; `qa/v3-report-flow.mjs` and matrix answer/company/message/sender/screenshot captures. Named signals appear on separate readable lines. |
| Ring counts up and animates changes; reduced motion is instant | `qa/v3-report-motion.mjs`: reveal has intermediate values between 0 and 100; answer update has intermediate values between 0 and 85. Reduced reveal is [100]; reduced update only [0,85]. Four reduced-motion screenshots. |
| Risk colors reserved; form coral; ink-navy dark; AA text | Theme contrast tests pass (194 token pairs), strong coral text tokens on the form, neutral report scope; every light/dark shot inspected. |
| Existing report/scoring behavior | Full tests and eval green; no scoring rules or original eval cases changed. Browser assertions verify low/high actions and one primary, including company editing. |
| Responsive layout and touch controls | Browser asserts 320px page fit, 768px report-content fit, and >=44px standalone report controls. Both 390/1440 themes reviewed. Inline annotated text links remain in flowing text. Shared-shell tablet issue is listed below. |

## Validation

- `npm run lint`: passed; two existing warnings in `qa/v2-check-heldout-lint.mjs`.
- `npx tsc --noEmit`: passed.
- `npx vitest run`: **77 files, 1,212 tests passed**.
- `npm run build`: passed.
- `npm run eval`: **88/88**, 0/35 false positives on low.
- Held-out: **24/27**, 0/9 false positives on low; baseline misses ho-11, ho-15, ho-16 unchanged.
- Browser: `qa/v3-report-flow.mjs`, `qa/v3-report-matrix.mjs`, `qa/v3-report-checking.mjs`, `qa/v3-report-motion.mjs` passed with mocked APIs. No live API calls.
- QA server on port 3600 stopped after screenshots. No use of port 3000, push, merge or deploy.

## Needs integration and known issues

- **Shell-owned tablet header:** at 768px, the desktop nav plus theme control overflows the page by about 95px. The report itself fits; the entire page fits 320/390/1440. Integration should adjust the shell header breakpoint/layout. No shell-owned files were edited.
- Shell may replace the approved lucide message placeholder with `CheckIllustration`.
- No known remaining issue in report-owned behavior. The held-out baseline misses above remain outside this stream's scoring scope.

## Screenshot list

All **56 final screenshots were opened and visually reviewed**, including the four corrected checking captures. Full manifest and variant results: `devpost/v3-report-qa.json`.

Artifact directory: `.git/internshield-relay/v3-shots/report/` (local, untracked QA output).
Component crops hide only the sticky shell during capture to prevent it covering the component; full-page captures include the shell.

### 1440-light

- `v3-report-empty-1440-light.png`
- `v3-report-filled-1440-light.png`
- `v3-report-checking-1440-light.png`
- `v3-report-low-1440-light.png`
- `v3-report-answer-confirmed-1440-light.png`
- `v3-report-answer-changed-1440-light.png`
- `v3-report-medium-1440-light.png`
- `v3-report-high-1440-light.png`
- `v3-report-company-impact-1440-light.png`
- `v3-report-message-impact-1440-light.png`
- `v3-report-sender-impact-1440-light.png`
- `v3-report-screenshot-impact-1440-light.png`
- `v3-report-link-scam-1440-light.png`
- `v3-report-reduced-motion-1440-light.png`

### 1440-dark

- `v3-report-empty-1440-dark.png`
- `v3-report-filled-1440-dark.png`
- `v3-report-checking-1440-dark.png`
- `v3-report-low-1440-dark.png`
- `v3-report-answer-confirmed-1440-dark.png`
- `v3-report-answer-changed-1440-dark.png`
- `v3-report-medium-1440-dark.png`
- `v3-report-high-1440-dark.png`
- `v3-report-company-impact-1440-dark.png`
- `v3-report-message-impact-1440-dark.png`
- `v3-report-sender-impact-1440-dark.png`
- `v3-report-screenshot-impact-1440-dark.png`
- `v3-report-link-scam-1440-dark.png`
- `v3-report-reduced-motion-1440-dark.png`

### 390-light

- `v3-report-empty-390-light.png`
- `v3-report-filled-390-light.png`
- `v3-report-checking-390-light.png`
- `v3-report-low-390-light.png`
- `v3-report-answer-confirmed-390-light.png`
- `v3-report-answer-changed-390-light.png`
- `v3-report-medium-390-light.png`
- `v3-report-high-390-light.png`
- `v3-report-company-impact-390-light.png`
- `v3-report-message-impact-390-light.png`
- `v3-report-sender-impact-390-light.png`
- `v3-report-screenshot-impact-390-light.png`
- `v3-report-link-scam-390-light.png`
- `v3-report-reduced-motion-390-light.png`

### 390-dark

- `v3-report-empty-390-dark.png`
- `v3-report-filled-390-dark.png`
- `v3-report-checking-390-dark.png`
- `v3-report-low-390-dark.png`
- `v3-report-answer-confirmed-390-dark.png`
- `v3-report-answer-changed-390-dark.png`
- `v3-report-medium-390-dark.png`
- `v3-report-high-390-dark.png`
- `v3-report-company-impact-390-dark.png`
- `v3-report-message-impact-390-dark.png`
- `v3-report-sender-impact-390-dark.png`
- `v3-report-screenshot-impact-390-dark.png`
- `v3-report-link-scam-390-dark.png`
- `v3-report-reduced-motion-390-dark.png`

