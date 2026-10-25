# V3 report decisions
- Check form uses coral tokens and a lucide message icon. Report surfaces and controls use neutral ink.
- Preserve the existing evidence/annotation/recovery behavior; make the result header a raised surface.
- Answer diffs include added, removed and reweighted signals. Unchanged scores confirm the supplied detail with score and level.
- Keep the report body mounted during rechecks so answers, editing controls and the score ring survive.
- Add a sender/message/screenshot from the report. Combined text is capped explicitly rather than silently dropping new evidence.
- Explicit sender input takes priority over extraction for sender lookup; no scoring rules changed.
- Persist updated report/input/answers and resolved explanation; never serialize the pending explanation promise.
- Pending Himesh: none. All routine choices followed the approved brief.

## Needs integration
- Shell may replace the form lucide placeholder with CheckIllustration as planned.
- At 768px the shared desktop nav + theme control overflows by 95px (theme control right edge ~873px). Report content fits; 320/390/1440 have no overflow. Shell owns the breakpoint/layout fix.

## Verification in progress
- First mocked flow passed changed/unchanged answers, company/message impact, live high-risk actions, 320px overflow.
- First gates: tsc/build/eval passed; lint found two JSX apostrophes; old question assertions need the approved collapsed-answer behavior. Fixes applied; rerun pending.

## Final QA evidence
- Four variants passed: 1440/390, light/dark; 56 screenshot files listed in v3-report-qa.json.
- Every final shot inspected. Component crops hide the sticky shell only for capture, so it cannot obscure the evidence.
- Checking captures wait for entry motion and retain a real pending extraction. Pending labels use full-opacity muted text.
- Mobile standalone controls are at least 44px (browser assertion); inline annotated text marks remain inline.
- The report fits 320/768; the entire page fits 320/390/1440. Shared shell 768 overflow remains the integration item above.
- Actual score samples show reveal 0 -> intermediate values -> 100 and answer update 0 -> intermediate values -> 85.
- Under reduced motion reveal samples are [100]; answer update samples are [0,85], with no intermediate values.
- Refresh keeps updated score and answered questions. Both company and sender/message/screenshot additions stay in the report.
- Save confirmation remains inline; Copy is absent on low, Tailor/Practice absent on live high, one primary even while company editing.
