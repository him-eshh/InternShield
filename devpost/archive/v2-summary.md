# InternShield v2 summary

Branch `v2` (from `v2-base` 36ad123), merging `v2-check` (fe84e11) and `v2-tools` (afb173d) plus integration fixes. Details: `devpost/v2-integration-log.md`, `v2-check-summary.md`, `v2-tools-summary.md`.

## 1. Approved plan
| Item | Status | Note |
|---|---|---|
| Bug A tall screenshots | ✓ | Tiled into strips; body cap 3.6 MiB; over-long image asks for two parts. A3 line protocol (optional) not built |
| Bug B tracker form at 1440 | ✓ | Opens below the button, focus in/out correct |
| Bug C "$1.2 million" -> 1,200,000% | ✓ | Unit-aware numbers, 19-case table |
| Bug D company = department | ✓ | Extraction separates them |
| Bug E resume line breaks | ✓ | PDF + DOCX previews |
| Bug F CRLF fixtures | ✓ | `tests/shared/readFixture.ts` (setup) |
| Tavily cap ~30/day + Wikidata first | ✓ | Live: Stripe lookup 307 ms via Wikidata, no Tavily |
| Design groundwork (tokens, dark mode, motion reducedMotion=user, always-visible cards) | ✓ | a11y pass: 0 text under 4.5:1 |
| Scoring rules 1-4 + 6 | ✓ | Reimbursement, wrong-way money, run-code split, Unicode cleanup, task vocab |
| Rules 5, 7-10 | ✓ all | 5 link checks; 7 secrecy, 8 impersonation, 9 paperwork, 10 platforms + reply YES |
| Eval ~90 cases | ✓ | 88 main, original 26 untouched; 27 held-out |
| Report redesign | ✓ | Ring with ticks + score 0, action line, top 3 reasons, one severity list, one primary footer button, Tailor/Practice hidden on high (live level) |
| Quick questions v2 | ✓ | Max 3, only if an answer can change the result, "Not sure", recovery card, editable company chip |
| Local link checks | ✓ | No fetch of the link itself |
| Annotated message view | ✓ | Numbered passages jump to their flag |
| Tailoring | ✓ | Keyword gap, 3 options, guard v2, presets. Ask-for-the-number slots (optional) not built |
| Interview | ✓ | 4-area scorecard, TS + SQL in browser, debugging round, company-style presets, wide coding layout, dark code theme, duplicate "hidden tests passed" fixed |
| Logo / favicon / OG | ✓ | Ring logo, icon, apple icon (code-made), OG |
| a11y + reduced motion | ✓ | Focus rings, Escape handling, no animation under reduced motion |
| Screenshots | ✓ | Every feature, 1440 + 390, light + dark, reduced-motion shots |

## 2. Dropped
Nothing from the drop order (intro, resume diff, logo, tracker polish): all four shipped. Small optional bits left out: A3 line protocol, ask-for-the-number slots, Accept "morph" animation (enter animation only), moving sql/debugging rounds into App's maps (they work inside Interview), checking screen inside the report layout.

## 3. Numbers
- Tests: vitest 73 files / 1191 passing (v2-base had 39 / 645).
- Eval main: 88/88, false positives on low 0/35. Held-out (not gating): 24/27, FP 0/9; misses `ho-11-whatsapp-only` and `ho-15-telegram-interview` (medium->low), `ho-16-urgent-text-vague` (medium->high).
- Live API calls: 9 of 10 (I4). 8 passed. Rewrite came back with 3 identical texts, so the prompt was fixed and covered by a mock test, with no live re-run. One transcribe hit Groq 429 and the UI showed the retry copy correctly.
- Gates: lint 0 errors (2 warnings in a QA script), tsc clean, build OK.

## 4. Screenshots
Index: `.git/internshield-relay/v2-shots/integration/INDEX.md` (outside git). Top 10:
1. `11-report-scam-1440-light.png`: redesigned report, high risk
2. `11-report-real-390-dark.png`: low risk on phone, dark
3. `60-level-linkscam-390-dark.png`: link-scam evidence + annotated message
4. `20-annotated-1440-light-jump.png`: passage -> flag jump
5. `32-ring-after-answer-1440-light.png`: quick question changes the score
6. `00-seam-answer-raises-high-1440-light.png`: Tailor/Practice hide when the level goes high
7. `11-tailor-three-1440-light.png`: tailoring options with warnings + held-back option
8. `09-setup-cards-1440-dark.png`: interview round cards
9. `06-scorecard-1440-light.png`: 4-area scorecard
10. `80-live-check-link-scam-1440-light.png`: live check of a lookalike careers URL

## 5. Check by hand before merging
- Paste one real recruiter message of your own (don't save it in the repo) and read the report wording.
- Upload a tall phone screenshot of a chat. Live, it dropped about 6 of 35 lines.
- Tailor: run one live rewrite and confirm the 3 options now differ.
- Design board canvas is dark in both themes: check it looks right in light.
- Confirm the C7 relabels (`c7-mid-high-pay-no-experience` medium->high; `c7-mid-new-domain-interview`, `c7-mid-pressure-two-hours`, `c7-mid-unpaid-trial-project` medium->low) and whether to tune for the 3 held-out misses.
- Medium label is now "Some warning signs" (prd.md says the longer form).

## 6. Pending owner review
- Merge `v2` into `main` with `--no-ff` (needs your OK).
- Push: Coder handles it after a secret scan.
- Deploy (needs your OK): set `DAILY_CHECK_CAP=100`, confirm `TAVILY_DAILY_CAP=30` in Vercel, and check that the Stripe posting in the real example is still live.
- New optional env vars for Vercel: `VISION_MODEL`, `INTERVIEW_MODEL`, `REWRITE_MODEL`. `TRANSCRIBE_DAILY_CAP` now defaults to 12.

## 7. Known issues
- The explainer sometimes quotes a flag title as if it were message text (live call 3).
- Tall chat transcription can drop a few lines (live call 6).
- The rewrite no-invented-facts guard runs only in the browser. A raw API caller just gets text about their own resume.
- The header Tailor/Practice chips use the first report level. The in-report buttons use the live level.
- `tests/tiers/pdf.test.ts` and the resume-lines PDF test can be slow under load (timeouts raised to 20 s).
- The "Cache disabled" badge in the shots comes from next dev only.
- Possible duplicate test files: `tests/ui/v2-check-annotate.test.ts` / `.tsx`.
