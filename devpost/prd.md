---
doc: prd
status: current-v3
---

# InternShield product requirements

## Journey

1. Home explains the three tools and offers Check, Tailor, and Practice. Navigation also exposes Tracker and Profile.
2. Check accepts a pasted message or screenshot. The user can correct extracted company, sender, and context. Two made-up examples are available.
3. During a check, progress reflects live steps. A provider failure or cap is shown as unavailable rather than silently counted as a pass.
4. The report shows a rule-based risk level, quoted evidence, grouped flags, coverage, unavailable checks, and a concrete next action. Quick questions and added information can recalculate the report and explain what changed. The app never labels an offer safe.
5. Tailor takes an original PDF or DOCX, or pasted resume text, plus a posting or company/role context. The user reviews bounded edits against original facts, accepts or rejects each one, sees an updated preview, and downloads the edited result. The preview should make changed lines apparent.
6. Practice configures role, company, rounds, topics, difficulty, and length. A selected Tracker application can carry its pasted posting into setup; profile level guides mixed difficulty. A continuous session supports hints, follow-ups, skip, early end, refresh recovery, type-specific review, and a numerical summary. Coding and SQL execute in browser workers; their results lead feedback.
7. Tracker and Profile save local information. Tracker cards span Saved, Applied, Interviewing, and Interviewed, move by menu or drag and drop, and can launch Tailor or Practice with exact card context. Report, Tailor, and Practice links can also carry role/company context between tools.

## Check acceptance

- Model extraction must attach exact source quotes. The deterministic engine in `lib/scoring` sets the level; explanation is built from the scored flags.
- Posting matches and a company's official site are evidence, not proof. A missing posting is neutral. Incomplete lookups appear under “Couldn't check.”
- Risk styling always has words and an icon. The report has a useful action even at low risk, without a guarantee of legitimacy.
- The two examples use only fabricated messages and disclose when a saved fallback result replaces a live call.
- The labeled evaluation set stays at 88/88 expected levels; the held-out set is reported separately, currently 24/27. These fixture results do not establish real-world detection accuracy.

## Tailor acceptance

- The original resume remains the source for its page and structure. Only eligible bullet lines may change; guardrails reject unsupported claims, large growth, and unwanted style.
- The user controls each suggestion and can inspect the generated file before download. PDF exports can retain covered original text underneath; they must not be described as redacted. DOCX wording changes are constrained by existing words/layout.
- The service can be unavailable or capped without losing the original file or presenting an unchecked suggestion as fact.
- Pasted text stays selectable after a file was chosen. A posting is optional when the user provides a role or company, and the result must say when it used role context alone.

## Practice acceptance

- Setup supports configurable rounds, difficulty, topics, language, and question/round count. When a company-specific pool is thin, it broadens to similar or general questions and says so.
- “Most asked at [company]” is a ranking proxy from historical public lists. It is not measured interview frequency.
- Code/SQL result checks run locally and are displayed before coaching. Only rounds with runnable results receive quality bands. Discussion answers are recorded and coached without a quality grade. Server feedback can show an exact answer quote and test results, but model-written achievement claims and STAR ratings are discarded. Follow-ups use question-type prompts without assuming facts the candidate did not provide.
- A session resumes after refresh, can end early, and produces counts from actual turns. Model or intel limits trigger a visible local fallback.
- Selected posting details guide role questions but are not candidate achievements. Runnable exercises must identify their practice source and state when a requested difficulty pool was exhausted or broadened. Historical employer list tags must not be presented as current interview frequency.

## Privacy, accessibility, and constraints

- Profile, extracted resume text, report, tracker, targets, and practice history stay in browser local storage until cleared. Original resume bytes are processed in the browser for preview/export. Server calls transmit only the data each tool needs; some lookup and extraction results are cached temporarily in server memory.
- All API keys stay server-side. Origin, body-size, input-length, per-visitor, and daily site-instance limits are required. See `spec.md` and `lib/server/guard.ts`.
- Keyboard and mobile flows, readable focus, reduced motion, and light/dark themes apply across all screens. Tool colors are coral (Check), teal (Tailor), and violet (Practice); risk colors are reserved for risk results.
- No login, persistent server database, real recruiter messages in fixtures, AI-selected scam verdict, or “safe” verdict.

## Verification boundary

The product is complete only after lint, TypeScript, Vitest, build, eval, browser QA, and bounded live smoke checks pass for the final tree. Historical stream results and screenshots do not prove final integrated status. `checklist.md` records the current verification state.
