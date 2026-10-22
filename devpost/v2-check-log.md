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
- [ ] Unicode cleanup (rule 4) + index map
- [ ] Reimbursement trap (rule 1)
- [ ] Money the wrong way (rule 2)
- [ ] Split run-code (rule 3)
- [ ] Task-scam vocabulary (rule 6)
- [ ] severity / action / learnMore on every flag
- [ ] confidence ("How sure")
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

## Needs integration
- `components/App.tsx` line ~103 `onLine`: pass the code too: `setLines((l) => ({ ...l, [key]: { state, reason, code: r && r.status === "failed" ? r.code : undefined } }))`. Why: Checklist can then say "resting for today" for DAILY_CAP (today it falls back on reason).
- Bug B: if `App.tsx` lifts the tracker open state into the footer later, the `contents` wrapper in SaveToTracker can go.

## Pending Himesh
