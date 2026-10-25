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
- Existing shared shell/nav still has the setup appearance; report does not edit shell-owned components.

## Verification in progress
- First mocked flow passed changed/unchanged answers, company/message impact, live high-risk actions, 320px overflow.
- First gates: tsc/build/eval passed; lint found two JSX apostrophes; old question assertions need the approved collapsed-answer behavior. Fixes applied; rerun pending.
