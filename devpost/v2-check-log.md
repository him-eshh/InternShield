# InternShield v2 check log

Branch `v2-check` from `v2-base` 36ad123. Brief: `devpost/v2-brief-check.md`.

## Baseline (Oct 22, C0)
- lint clean, tsc clean, vitest 39 files / 645 tests, build OK, eval 26/26.

## Checklist
### C0 Start
- [x] baseline gates, this log
### C1 Extraction and lookups
- [x] Bug D company vs department (stoplist, "the ___ team", legal suffix, email domain, "at X"/signature, AI `department`, empty when unsure), ~20 table tests (989718c)
- [x] Wikidata official website before Tavily (`lib/server/wikidata.ts`); capped posting says "Not checked: today's search limit was reached." (8633079)
- [x] Bug B Save-to-tracker form row + focus (C1 commit)
- [x] Typed error codes in routes + `lib/client/errorCopy.ts` (C1 commit)
### C2 Scoring rules
- [x] Unicode cleanup (rule 4) + index map (soft hyphen/LRM/RLM/U+034F stripped but not counted)
- [x] Reimbursement trap (rule 1)
- [x] Money the wrong way (rule 2) (bare "mobile deposit"/"e-check" only with money going back out or equipment)
- [x] Split run-code (rule 3) ("driver's license" no longer a driver install; `.exe` without a word before it)
- [x] Task-scam vocabulary (rule 6) ("complete N tasks" needs N >= 20; mentor only near task/payout talk, or "personal coach")
- [x] severity / action / learnMore on every flag
- [x] confidence ("How sure")
- Near-miss tests: `tests/scoring/v2-rules.test.ts`, `tests/scoring/v2-nearmiss.test.ts`; 10 eval cases `eval/messages/v2-*.json`.
### C3 Report redesign
- [ ] Ring v2 (number, 14 ticks, score-0 state, reveal <1.2 s, delta chip + aria-live)
- [ ] Order: ring, verdict, action line, top 3 reasons, explanation, severity list, questions, recovery, posting, footer
- [ ] Quotes in mark style, not color-only
- [ ] Footer: one primary + compact secondary row; level rules
- [ ] Evidence always visible (reduced motion + full-page shot)
### C4 Quick questions + recovery + company chip
- [ ] Question picking (could change level/critical/advice; max 3; drop after answer; stable ids)
- [ ] New question set; delete outside_us; "Not sure"
- [ ] UI: hint line, "Make this check more accurate · Optional", +N more, confirmation below
- [ ] Recovery card (FTC order)
- [ ] Editable company chip (re-runs company + posting only)
### C5 Link checks + rules 7-10
- [ ] Local link checks, `report.links`
- [ ] Rule 7 secrecy / 8 impersonation / 9 paperwork / 10 platforms + reply YES
### C6 Annotated message view
- [ ] `lib/client/annotate.ts` + view, two-way links, a11y, Show all, mobile
### C7 Eval
- [ ] ~90 cases (original 26 byte-identical)
- [ ] held-out set (separate subagent)
- [ ] confusion matrix + FP rate, README
### C8 Check form + checking screen
- [ ] validate on click, Add context, Add details, checking state, errorCopy
### C9 Intro + logo
- [ ] intro hero, ring logo, icons, OG
### C10 Final
- [ ] reviewer, screenshot pass, gates, summary

## Bugs
- **Bug B** (05): Save-to-tracker form rendered inside the centered footer button row. Cause: the form was a child of the same flex row. Fix (`App.tsx` frozen, so no state lift): SaveToTracker root is `display: contents`; the trigger stays in the row with `aria-expanded`/`aria-controls`; form + confirmation take `order-last basis-full mr-auto text-left`, so they sit on their own left-aligned line below all buttons. Focus moves to Company on open; Cancel/Escape returns it to the trigger. Phone bottom-sheet `<dialog>` skipped (inline row works at 390, verified). Test: `tests/ui/v2-check-saveToTracker.test.tsx`; QA `qa/v2-check-tracker.mjs` (opened, focus in/back, form below trigger, overflow 0 at 1440/390 light/dark). Shots `01-tracker-form-*`.

## Decisions
- Error codes: `lib/server/http.ts` `failed()` always sends `code`, derived by `codeFor()` from reason/status/message (explicit `code` wins), so every route (and guard.ts, frozen) gets typed codes without per-route edits. Client `call()` passes `code` into `StepResult` (additive `code?` in `lib/types.ts`). `lib/client/errorCopy.ts`: `errorCopy(code, reason)` and `stepNote(code, reason)`; generic only for unmapped. Checklist uses `stepNote`.
- QA env: shell can't set env vars inline, so `qa/v2-check-env.mjs` sets QA_BASE/QA_SHOTS/QA_PORT_RANGE/QA_OUT defaults; scripts `import "./v2-check-env.mjs"` then `await import("./lib.mjs")`. Output in `qa/out-v2-check.txt` (never commit).

## Assertions changed (test, old, new, why)
- `tests/ui/pipeline.test.ts` 3 `toEqual` on failed steps: added `code` (`TIMEOUT`, `RATE_LIMITED`, `UNKNOWN`). Why: failed StepResults now carry the typed code.
- C4 question set v2 (findings 02 > 3.2, 4.1; `source`/`outside_us`/`had_interview` ids are gone):
  - `tests/scoring/score.test.ts` "asks where the message came from" -> "asks what they've asked you to do" (ticking deposit_check -> high); "I don't know" test -> "Not sure" on `asked_to_do`; "outside the US" test -> never asked, `who_first: yes` softens the WhatsApp move; "asks about an interview" -> `talked_live` not shown (0 -> 20 stays low, so no level flip) but `not_yet` still adds no_interview +20; "never asks when the source is known" (`[]`) -> only `["asked_to_do"]` (a ticked ask can switch on a critical).
  - `tests/scoring/questionsReal.test.ts`: source tests -> channel/who_first; "asks about the interview" -> answer still adds no_interview (not shown: no level flip).
  - `tests/ui/quickQuestionsReal.test.tsx` "renders every question" -> top question open + "+N more" (brief C4 UI); escape `"` too.

## Needs integration
- `components/App.tsx` line ~103 `onLine`: pass the code too: `setLines((l) => ({ ...l, [key]: { state, reason, code: r && r.status === "failed" ? r.code : undefined } }))`. Why: Checklist can then say "resting for today" for DAILY_CAP (today it falls back on reason).
- `components/App.tsx` `reportExtras`: Tailor/Practice are gated on `target.risk` (the first level). If a quick-question answer
  raises the report to high, they stay. Fix: let `Report` pass its live level to a render-prop `extras={(level) => ...}`.
- Bug B: if `App.tsx` lifts the tracker open state into the footer later, the `contents` wrapper in SaveToTracker can go.

## Pending Himesh
