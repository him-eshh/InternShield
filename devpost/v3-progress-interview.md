# v3 interview progress

## Done
- I1 bank: d341e03 (1130 metadata-only questions, MIT sources); full gates pending.
- Inherited engine/API + launcher brief changes preserved: 0a353b0.
- I4 engine regression tests/fixes: 695900e (15 bank/engine tests pass).

## Current
- I2-I6 implementation in components/interview/{Setup,IntelCard,Runner,Summary}.tsx and PracticePage.tsx.
- Intel adapter: lib/tiers/sessionIntel.ts. API review now rejects reviews of earlier turns.
- Validate focused tests + TypeScript, then full gates. No item closed yet.

## Next
1. Fix typing/lint/test failures, commit setup/runner sub-items as WIP.
2. Browser QA: qa/v3-interview-*.mjs, mocked intel/interview, real local Python/TS/SQL runners.
3. Inspect shots 1440/390 both themes; fix usability and persistence gaps.
4. Close items only with full green gates; write summary only after ALL quality checks pass.

## Gotchas
- No dev servers started. Allowed ports 3200-3299 hidden only; never touch 3000.
- No personal vault, keys or live API calls. rg unavailable; use Select-String.
- Writes/commits/tests require require_escalated (read-only sandbox); approved so far.
- Vitest has no jsdom; engine persistence tests stub localStorage (no dependency added).
- Runnable panels reuse InterviewSession; Runner intercepts feedback. Old Interview stays for tests.
- First tsc passed on inherited engine; newer UI tsc is being checked.
