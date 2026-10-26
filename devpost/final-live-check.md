# Final live check (Mon Oct 26 2026, started 07:16 ET)

Live = the production build (`next start`, port 3501) with the real server-side keys, no QA mocks. Inputs are real public scam/legit messages, Himesh's resume and real postings; they live outside the repo and are never quoted here.

## Progress
- [x] Server: `next start -p 3501`, cmd PID 35944 (hidden, stale build; session 4 could not stop it: kill commands need approval). Stop at end.
- [x] Session 4 (10:31): rebuilt at 6b6c2aa, `next start -p 3502`, cmd PID 40652 (hidden, log qa-server-3502.log). Iteration server: `next dev -p 3503`, cmd PID 38668 (hidden, real keys, no mocks). Stop at end.
- [ ] (a) Check: 18 cases running (`qa/live-check.ts`, untracked, local only)
- [ ] held-out ho-11, ho-15, ho-16
- [ ] (b) Tailor
- [ ] (c) Practice
- [ ] (d) Clarity + "How to read this"
- [ ] gates + commit

AI calls used so far: 1 (S4 extract).

## Coder interim findings (7:35 AM ET, from qa/live-out.json + qa/live-tailor-out.json after the Claude limit stopped live-07)
- qa/live-check.ts was moved to C:\Users\himes\internshield-real-tests\live-check.ts (it broke `tsc` as an untracked file in qa/). Keep live scripts outside the repo or exclude them from tsconfig; never commit real-case data.
- (a) Real scams scored LOW: S1 (Pitt personal assistant, score 8), S2 (Pitt study assistant, 0), S3 (VT psych RA, 0), S6 (VT RA office-supplies check reimbursement, 0). S5 task scam only medium (42). S7 high (85) but shown 85 != subtotal 80 (floor rule? explain in UI). L1/L2 low (correct). B1 medium (correct).
- (a) L3 (real Google posting) and E1, E2 (real job emails) were classified notJob=true, so no check ran. Real job/recruiter emails must not be rejected as "not a job message".
- (a) Every explanation came back source=fallback: the live AI explanation never ran. Find out why.
- (b) Tailor P1 (Fox) with Himesh's resume PDF: /api/rewrite returned 200 with edits:[] -> "No safe edits found". Tailor gives nothing on his real resume. Root-cause it (prompt, guards, PDF line extraction?).
- (c) Practice not run yet.

## Fix list (session 3, from 10:19 ET)
- [x] L-A scam misses: commit 328168b (campus research-job pattern, payment-duties flag, text-a-personal-number, task vocabulary 40). Eval 88/88, held-out 25/27.
- [~] L-B not-job gate: extraction prompt now says recruiter emails, postings and job alerts are job messages (328168b). Live re-check pending.
- [x] L-C explanation "fallback": not a bug. Since V3 (68d7b09) `/api/explain` is deterministic by design (spec.md: "builds deterministic copy from scored flags"; model text can't set the explanation). `source: "fallback"` is only a label; the UI lays out the titled sections. No AI call to fix.
- [x] L-D 85 vs 80: risk panel now says "The rule weights add up to 80. A critical sign sets the score to at least 85." (also 100 cap, 0 floor, good-sign cap). Commit 6d752b7.
- [x] L-E Tailor no edits on real resume: commits 6b6c2aa + 968f0ad. Root causes: (1) the rewrite model (Qwen) echoed tight real bullets unchanged, so the edits task now drafts with gpt-oss-120b first; (2) gpt-oss writes non-breaking hyphens (U+2011) that the PDF redraw fonts can't measure, so every such edit silently failed the width fit; (3) dropped final periods failed the punctuation check. Now normalized before the guards, and width failures get the guided retry. Live on Himesh's resume PDF: P1 Fox 1 edit, P2 GM 1, P5 Rogue 1, P6 Amplify 2 (was 0). Added posting skills (e.g. Python) are still blocked until the user taps "I have this" (by design).
- [ ] L-F Practice live
- [x] L-G held-out (eval at 968f0ad: 88/88, held-out 25/27). ho-15 Telegram chat interview: now medium, PASS (fixed by the chat-interview wording in 328168b). ho-11 WhatsApp-only, no ask: low 20 vs expected medium. Judgment call: one off-platform request with nothing else is also how some real recruiters write (main-set `real-abroad-whatsapp` is low at 10); pushing it to medium would flag those. ho-16 unknown text, "reply YES", easy work, urgency: high 60 vs expected medium. Judgment call toward caution: it's the standard task-scam opener and matches the main-set `scam-reply-yes-text` (high). Neither is a logic bug; no change.
- [ ] L-H live reshoot final3
- [x] L-I qa/final2-practice.mjs committed (e96f256)

## REQUIRED (Coder 10:12 AM): re-read the end of .git/internshield-relay/final-brief-live.md - fix list L-A..L-I (scam misses, not-job gate, AI explanation fallback, 85-vs-80 floor explanation, Tailor no edits on real resume, Practice live, held-out, live reshoot in final-shots/final3 incl. phone tab bar, commit qa/final2-practice.mjs).

