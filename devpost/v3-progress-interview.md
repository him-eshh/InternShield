# v3 interview progress

## Done
- I1 bank: d341e03 (1130 metadata-only questions, MIT sources); full gates pending.
- Preserved inherited engine/API + launcher brief changes: 0a353b0 (WIP).

## Current
- I4 engine validation: lib/tiers/session.ts, sessionPools.ts and tests/tiers/v3-session.test.ts.
- Inherited engine repeats runnable problems because completed turns lose problem IDs; fix before UI.
- API review combines feedback + follow-up; needs route tests before closing I6.

## Next
1. Test/fix engine: no repeats, chosen filters, follow-up limit, adaptive difficulty, persistence.
2. I2 intel adapter/card, I3 setup, I4 runner in components/interview; wire PracticePage.
3. I5 summary/history + I6 API caps, then full gates for closing items.
4. I7 mocked browser QA + inspected theme/mobile shots; summary only after all quality checks.

## Gotchas
- No dev servers started; never touch port 3000. Allowed 3200-3299, hidden, stop after shots.
- No personal vault read (explicit user instruction). No keys/live API calls.
- rg unavailable; use Select-String/Get-ChildItem.
- Use require_escalated for writes/commits/tests (read-only sandbox); preservation commit approved.
- Runnable panels reuse InterviewSession; intercept feedback in runner. Keep old Interview for tests.
- Current tsc passed. No item marked complete yet; final summary commit is NOT authorized until all done.
