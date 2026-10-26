# InternShield final audit (Oct 26 2026)

Progress (audit session, started 04:57 ET, deadline 06:05 ET)
- [x] Docs read
- [x] Gates: lint pass, tsc pass, vitest 86 files / 1270 tests pass, build pass, eval 88/88 + held-out 24/27
- [ ] Server on 3511 (`next start`, hidden, cmd PID 45960) is **still running**: this session was not allowed to run process or port commands. Next session: `taskkill /PID 45960 /T /F`
- [x] Browser walkthrough: routes at 1440/390 in light and dark; Check high/low + quick question; Tailor (API failure and mocked edits); Practice default + Stripe/fallback through the summary. Shots in `.git/internshield-relay/final-shots/audit/`, text dumps in `qa/audit-*.txt` (untracked)
- [x] Requirement table, F1-F25 table, fix list, UI plan
- [x] Commit

Method: Playwright on `next start -p 3511`. APIs were mocked or left to fail (503), so AI output quality was **not** checked live. 768px and the onboarding of a returning user were not shot in this pass.

## 1. Verdict

The three engines work. What's missing is a **front door and a through-line**. Home only pitches the scam check: there's no gradient hero, no onboarding, and no "try it with sample data" path. Profile is just an unlabeled avatar. Tailor has **no sample resume**, so a judge without a resume can't try it, and a failed or empty run is a dead end ("Couldn't draft edits. Try again."). The quick-question payoff Himesh asked for ("Added" plus the score change) is hidden behind a collapsed "What changed" row at the bottom of a 3,000px report. The report still repeats itself ("What stood out" restates the evidence cards). Practice works, but its pages look the least finished: a light-weight heading, a pale header that loses contrast in dark mode, a 3,900px setup page on phones, and "Keep the momentum." shown after 0 of 5 answered. About a third of the F1-F25 fixes were never applied, even though `v3-summary.md` reads as if they were.

## 2. Himesh's requirements

| Requirement | Status | Evidence |
|---|---|---|
| Tailor keeps original length/format | DONE (text path) | `tailor-review` dump: "Within your original text length."; PDF/DOCX path not re-shot this pass |
| Tailor output reads human | NOT VERIFIED | Needs a live call; mocks only |
| Tailor visible loading state | DONE | `tailor-loading-1440-light.png` |
| Tailor preview + accept/reject/edit, live update | PARTIAL | Review UI renders the "Your resume / Text preview" pane, but the mocked edit was filtered out ("0 suggestions · No suggestions passed the checks"). When nothing passes, the user has nowhere to go |
| Tailor company-aware tips from public sources | PARTIAL | "What we'll emphasize: Using the job post only" when intel fails; real intel not seen |
| Interview: one session, pick rounds/topics/difficulty | DONE | `route-practice-*`, setup dump |
| Ends after N or early stop | DONE | `practice-end-dialog-*`, Stripe run reaches "Session done" after 5 |
| Real LeetCode-style incl. Hard + company info | PARTIAL | Bank questions show title + "Read the full problem on LeetCode" + a plain textarea (no editor or complexity fields). Company research is behind a button; not seen live |
| AI follow-ups, feedback per answer | NOT VERIFIED live | Code path exists (`lib/tiers/sessionFeedback.ts`); runnable Q shows "0 of 5 hidden tests passed" first |
| Summary at end | PARTIAL | Exists, but generic: "Keep the momentum." with 0/5 answered, and "No runnable test result was recorded." repeated 3x (Stripe summary dump) |
| Home page | PARTIAL | Only sells Check. Tools 2-3 sit below the fold with no CTA (`route-home-1440-light.png`) |
| Nav with lucide icons | DONE | Top nav 1440, bottom tabs with Home at 390 |
| Profile | PARTIAL | Works (`route-profile-*`), but it's only an unlabeled avatar icon, not in nav, and titled "Your starting notes" |
| Clear onboarding | MISSING | No first-run prompt anywhere; Home never mentions Profile |
| QQ shows "Added" + score change | PARTIAL | "WHAT YOU ADDED" is visible, but "Score 0 → 85" sits inside a collapsed "What changed" (`check-qq-impact-collapsed-1440-light.png`). The text duplicates itself ("Deposit a check. You added: … Deposit a check.") and lists 3x "No longer counted as a good sign", which is confusing |
| Report solid, not repetitive | PARTIAL | "What stood out" repeats the 3 evidence explanations verbatim; "What to do now" and "What to do next" both appear; page is 3,261px at 1440 and 4,621px at 390 |
| Per-tool colors, risk colors reserved | PARTIAL | Check hero is dark brick, not coral; Tailor dark hero is a bright mint slab; Practice is navy/lavender. The three heroes don't look like one family |
| Warm off-white / ink-navy dark | DONE | Route shots |
| Bricolage + Inter | PARTIAL | Home h1 tracking so tight the letters touch; Practice h1 "Question 1 of 5" in light weight |
| Gradient hero | MISSING | Home hero is a flat canvas |
| Illustrations, purposeful motion | PARTIAL | Profile/Tailor icons; Check header uses a plain lucide icon, not CheckIllustration |
| Phone layouts | DONE (no overflow) | `ox=0` on all routes at 390; pages are long (practice 3,908px) |

## 3. F1-F25 (verified on v3 now)

| F | Status | Evidence |
|---|---|---|
| F1 impact card | PARTIAL | Score delta collapsed, duplicate sentence, signal rows not deduped |
| F2 report length/dup | NOT DONE | "What stood out" + "Our take" + "What to do next" still present; low risk still says "Could change to 'Strong signs of a scam' depending on 1 answer"; QQ at the bottom, not under the hero |
| F3 footer | DONE | One primary; low risk offers Tailor/Practice; Report menu on high |
| F4 focus ring | DONE | No box in report shots |
| F5 mobile nav Home | DONE | 390 tab bar has Home |
| F6 check form | PARTIAL | "Add details" and "Add context (optional)" both still present; no illustration; button has no icon; right column has examples (OK) |
| F7 profile polish | NOT DONE | "Next step" is the filled primary, "Choose a file" outline; native ▶ on "Paste text instead"; no "You're set" seen |
| F8 copy fix | NOT DONE | Still "They want you to deposit a check and send money on" |
| F9 dark coral vs risk | NOT VERIFIED | Not compared side by side |
| F10 home mobile | NOT DONE | Home 390 = 2,401px (target ≈1,400); no Continue seen (fresh user) |
| F11 default bits | PARTIAL | "← Back" still on Tailor top-level |
| F12 medium fixture | NOT VERIFIED | QA-only |
| F13 768 header | NOT VERIFIED | 768 not shot |
| F14 bank coding round | PARTIAL | Chips + LeetCode link present; plain "Your answer" box, no editor or complexity fields |
| F15 no dead-end slots | DONE | Stripe → "No Stripe-tagged questions; showing similar fintech questions." (`lib/tiers/bankPool.ts`) |
| F16 frequency picks | DONE (code) | `bankPool.ts` ranks by asked count, top-N |
| F17 coding feedback | PARTIAL | Tests first; rubric not seen live |
| F18 coding layout | PARTIAL | Two-pane; still three steps "Run examples / Submit / Finish and get feedback"; Hint/Skip at the bottom |
| F19 difficulty everywhere | PARTIAL | Harder SQL exists (`sql-rank`), but the Stripe run showed "Medium" and "Easy" bank picks with Mixed |
| F20 setup polish | PARTIAL | Difficulty chips done; topic wall, heights (2,813 / 3,908px) and the light h1 remain |
| F21 intel card real | NOT VERIFIED | Intel 503 in this run |
| F22 summary earned | PARTIAL | Counts present; generic headline and repeated "Practice next" |
| F23 dark end dialog | NOT DONE | Scrim washes the page light grey in dark (`practice-end-dialog-390-dark.png`) |
| F24 MIT notices | NOT DONE | No `data/question-bank/LICENSES.md`; SOURCES.md has only "MIT (c) 2022 Huan Xu" |
| F25 practice reshoot | PARTIAL | This audit covers setup/q1/end/summary only |

## 4. Ranked fix list

### P0 (demo-blocking)
- **A1 Tailor sample data.** A judge can't try Tailor without a resume. Add "Try a made-up resume" (fills resume + a made-up posting from `qa/v3-lib.mjs` RESUME-style fixture in `lib/examples.ts`) in `components/resume/*` input step. Accept: fresh profile → one click → edits shown. Shot `tailor-sample-1440-light`.
- **A2 Tailor failure/empty dead ends.** "Couldn't draft edits. Try again." has no reason and no retry button. "No suggestions passed the checks" offers no next step. Show the cause (busy/limit/offline), add Retry, and let the user edit lines manually. Accept: shots with `/api/rewrite` returning 503 and with 0 edits, each showing a clear message plus a button.
- **A3 QQ payoff visible.** Show "Added: Deposit a check" plus the delta pill "0 → 85 · Strong signs of a scam" open by default. Drop the duplicate sentence. Collapse the 3 "No longer counted" rows into one line. Scroll/announce the verdict change (`lib/impact.ts`, `components/report/QuickQuestions.tsx`). Accept: `check-qq-impact` shot shows the delta without a click.
- **A4 F24 license notices.** Add `data/question-bank/LICENSES.md` with both MIT texts verbatim and link it from the Practice footer. Legal, 5 minutes.

### P1 (missing requirement / obvious gap)
- **A5 Home front door.** Gradient hero (coral→teal→violet wash from `app/theme.css` tokens) and three tool CTAs above the fold. Add a "Set up your profile (2 min)" onboarding card for first-time users and Continue for returning users (`app/page.tsx`, `components/shell/*`). Accept: `route-home-1440-light` shows all three tools above 900px; 390 ≤ ~1,600px.
- **A6 Report de-dup (F2).** Remove "What stood out" when it repeats the evidence. Merge "Our take/What to do next" into the hero. Move quick questions under the hero. Low risk: "Answer 1 question to be sure". Accept: high report ≤ 2,000px at 1440.
- **A7 Profile discoverability.** Label the avatar "Profile" (text at ≥1024), rename the h1 "Your profile", fix the F7 button hierarchy, add "You're set" with Tailor/Practice buttons.
- **A8 Practice dark header contrast.** Lavender header with light text in dark mode (`practice-end-dialog-390-dark.png`, `components/interview/Runner.tsx:73`). Use tool-tint on surface with `text` tokens; add a contrast test. Also F23 scrim.
- **A9 Summary honesty.** Headline from real counts ("0 of 5 answered, 5 skipped. Pick up where you left off"). Dedupe the "Practice next" lines (`components/interview/Summary.tsx`).
- **A10 Bank question answer area (F14).** Approach + time/space fields + editor (discussion-only label).
- **A11 Copy (F8).** "Asks you to deposit a check and forward money" at the display layer.

### P2 (polish)
- **A12** One tool-hero style for Check/Tailor/Practice (same shape, tool tint, illustration right); Check uses coral, not brick; Tailor dark not a neon slab.
- **A13** Check form: merge "Add details" and "Add context"; ShieldCheck icon on the button (F6).
- **A14** Drop "← Back" on Tailor (F11).
- **A15** Practice setup: top-10 topics + "More", sticky Start bar, Bricolage heavy h1 (F20); 390 ≤ 1,800px.
- **A16** Coding actions: "Run tests" + "Submit answer"; Hint/Skip toolbar under the title (F18).
- **A17** Home h1 tracking: loosen to about -0.02em; letters currently touch.
- **A18** Use "…" not "..." in loading copy (`ProfileSteps.tsx:261`, `ProfilePage.tsx:123,143`, `AddInformation.tsx:32`).

## 5. UI/UX improvement plan

- **Home:** gradient hero with a live mini demo. The made-up message card animates its 3 marks in sequence (motion/react, stagger 120ms, reduced-motion static). Below it, three tool tiles (icon, verb, one-line promise, "Try with sample" link) in tool colors. A first-run strip: "1 Check · 2 Tailor · 3 Practice · Profile optional".
- **Check form:** right column "What we check" (5 lucide rows) under the examples. Example buttons auto-submit after fill, with a visible "Filled with a made-up message" chip.
- **Report:** two columns at 1440 (left verdict + quick questions + evidence; right sticky message + ring). When a quick answer moves the ring, count up the number (~600ms) and flash the delta pill. Evidence cards get hover lift.
- **Tailor:** sample button. A side-by-side diff with inline accept ✓ / reject ✕ chips per line, keyboard j/k/a/r (already has "Shortcuts"), and a sticky "3 of 5 accepted · Download" bar. Empty state explains why and offers "Edit a line yourself".
- **Practice:** past sessions at the top. Heavy Bricolage header on an ink surface with a violet progress bar that fills on each answer. Summary: progress fills to 100% plus a check pulse; per-question rows with ✓ tests/band and "Retry this one".
- **Tracker/Profile:** distinct column icons (F11). Profile completeness ring next to the avatar label in the nav.
- **Guidelines pass** (web-interface-guidelines rules applied from memory via grep; live guideline fetch skipped for time): ellipsis character (A18); `autoFocus` in `CompanyChip.tsx:33` and `SaveToTracker.tsx:106,145` is fine on desktop but scrolls/opens the keyboard on mobile, so gate it to pointer:fine; no `transition-all` or bare `outline-none` found.

## 6. Gates

Run against the v3 tree (no app code changed in this audit): lint pass · `tsc --noEmit` pass · vitest 86 files / 1270 tests pass · build pass · eval labeled 88/88, held-out 24/27 (misses: ho-11, ho-15, ho-16). Lint, tsc, vitest and eval were re-run at 05:40 and passed. Build was not re-run then, because the 3511 server was serving `.next`.
