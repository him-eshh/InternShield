# InternShield v2 check log

Branch `v2-check` from `v2-base` 36ad123. Brief: `devpost/v2-brief-check.md`.

## Baseline (Oct 22, C0)
- lint clean, tsc clean, vitest 39 files / 645 tests, build OK, eval 26/26.

## Checklist
### C0 Start
- [x] baseline gates, this log
### C1 Extraction and lookups
- [ ] Bug D company vs department (stoplist, "the ___ team", legal suffix, email domain, "at X"/signature, AI `department`, empty when unsure), ~20 table tests
- [ ] Wikidata official website before Tavily (`lib/server/wikidata.ts`)
- [ ] Bug B Save-to-tracker form row + focus
- [ ] Typed error codes in routes + `lib/client/errorCopy.ts`
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

## Decisions

## Assertions changed (test, old, new, why)

## Needs integration

## Pending Himesh
