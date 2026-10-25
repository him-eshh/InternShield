---
doc: tier4-spec
status: historical-approved-plan
---

# Tier 4 spec: interview rounds for other fields

> Historical plan. This is the approved 2026-10-21 Tier 4 build plan, retained for historical decisions. Current v3 Practice keeps relevant case/portfolio-style discussion but retired the finance round and design challenge; the old hidden flags and `components/App.tsx` entry points below no longer exist. The continuous session and current round choices are described in `prd.md` and `spec.md`.

Grounded in `prd.md > Deferred From the POC`, `scope.md > Later`, `spec.md > Look and Feel / Components / Usage Guard / Token Budget / Browser Storage / Stack`, and the Tier 3 interview shell (`tier3-spec.md`). Same look: Apple-like, system font, one soft-blue accent, green/amber/red only for results, light/dark, CSS motion only, inline SVG icons, keyboard and screen-reader accessible, self-explanatory. No accounts, no server storage, no scraping, no "safe" verdict. Every case, question, prompt and answer key is made up.

**Hidden until it works:** `lib/tiers/flags.ts` gains `case` (slice 14), `finance` (15), `portfolio` and `challenge` (16), all `false` until the commit where that slice passes its gates. A `false` flag renders nothing. All need `interview`.

## Where it's reached from
Unchanged entry points (profile chip menu, report "Practice an interview for this", tracker Interviewing cards). The setup screen's round picker adds rounds by `profile.field` (`INTERVIEW_ROUNDS[].field`, replacing Tier 3's `techOnly`):

| Field | Rounds |
|---|---|
| every field | Recruiter screen, Behavioral |
| tech | Live coding, System design (Tier 3) |
| business | **Case interview** (14) |
| finance | **Technical questions** (15) |
| design | **Portfolio walkthrough**, **Design challenge** (16) |
| other | Recruiter screen, Behavioral only |

Under the picker, one plain line says what the selected round is (e.g. "A short made-up business case: structure it, do one calculation (checked by code), then recommend.").

## Scripted rounds (case, finance): `lib/tiers/scripted.ts` (engine-builder, pure)
- All questions are local and deterministic from the session seed (`scriptFor`), so these rounds use **one AI call per session** (feedback only). The route rejects `question` for them.
- **Case (14):** ≥ 4 made-up cases (e.g. a campus coffee cart's falling profit, a bike-share pricing change, a bookstore opening a second location, a food-truck menu cut). 3 questions each, interviewer-led: (1) "How would you structure this?" checked by a **rubric** (key areas like revenue/costs/customers/competition, keyword alternatives); (2) a calculation with all data in the prompt and "End with your final number", checked in code (**number**, last number in the answer, absolute tolerance); (3) "What would you recommend and why?" rubric (recommendation, reason from the data, risk/next step).
- **Finance (15):** bank of ≥ 12 made-up accounting/valuation questions (three statements, depreciation flow-through, working capital, EV vs equity value, DCF steps, WACC, simple interest/growth/margin/multiple math). ≥ 5 are numeric (checked in code), the rest rubric. A session takes 4 distinct questions.
- `extractNumber`: the **last** number in the answer; `$`, commas, `%`, `k/m/million/billion`, negatives, decimals. No number → "No final number found".
- `checkAnswer` rubric: case-insensitive match of any keyword alternative per point → covered / missed labels. `describeCheck` gives one plain line used both in the AI prompt and in the UI.
- Results are recomputed from `turn.question` (exact match via `findQuestion`) wherever needed: in Feedback and in the route. Nothing new is stored and the route never trusts a client-sent grade.

## Portfolio walkthrough (16)
- Setup shows "Portfolio links (optional)" when this round is picked: textarea, one per line, up to 5 http(s) links of ≤ 200 chars (`cleanLinks`). Help text: "We only show these. Nothing opens them; the interviewer only sees the text of the link."
- Links go in `context.links` (optional, so Tier 3 sessions still load). During the session they're listed as plain links (`rel="noopener noreferrer nofollow"`, new tab; the user's own click, never our fetch).
- First question local (`PORTFOLIO_FIRST`: walk me through one project, problem, role, process, outcome); then up to 3 AI follow-ups about process, decisions, feedback, trade-offs; 4 questions total. The AI is told the links were not opened and must not claim to have seen the work.

## Design challenge (16)
- Reuses the Tier 3 board (`DesignRound` + `Board`), with a new board kind **Screen** for user-flow sketches. First prompt local (`CHALLENGE_PROMPTS`, ≥ 4 made-up UX challenges, e.g. an onboarding flow for a campus food-pantry app). 3 questions: prompt + 2 AI follow-ups about the board.
- Timer: `CHALLENGE_MINUTES = 20` from `session.createdAt` (`challengeLeft`). Shown as "12:34 left" (`role="timer"`, not live); a polite status announces "5 minutes left" and "Time's up. Finish when you're ready." Nothing is locked when time runs out (it's practice); the feedback prompt is told whether time ran out.

## Feedback view
Same as Tier 3, plus for scripted rounds a **Checked by code** row per answer: number → "Your final number: $1,500 · Expected: $1,500 · ✓ correct" / "– not quite" / "No final number found"; rubric → each key point with "✓ covered" / "– missing" (text marks, not color alone). The AI's strength/improve is shown alongside; the AI is told the check lines are facts and never re-grades them.

## Route `POST /api/interview` (api-builder, same route, no new route)
- Rounds enum grows via `INTERVIEW_ROUNDS`. `question` → 400 for `coding`, `case`, `finance`. `hint` still coding only.
- `context.links`: optional array, ≤ `MAX_LINKS`, each a string ≤ `MAX_LINK_CHARS` whose `new URL()` protocol is `http:`/`https:`; anything else → 400. Put in the prompt as `Links (not opened, text only): ...`. **Never fetched.**
- Feedback for scripted rounds: after each `[i] A:` line add `[i] Check: <describeCheck>` (computed server-side via `checkTurn`); system prompt says check lines are computed by code and must not be re-graded. Portfolio question prompt: ask about process/decisions/collaboration/outcome, don't claim to have seen the links. Challenge question prompt: like design but about user flows/screens on the BOARD. Case/finance feedback: judge structure, reasoning and communication.
- Same guard (`guard(req, "interview")`), same `takeInterview()` daily cap, same qwen-only model, same caps, same "untrusted data" line, same nothing-but-token-counts logging.

## Data model (`lib/tiers/types.ts`, Tier 4 section)
`InterviewRound` + `INTERVIEW_ROUNDS[].field`, `QUESTIONS_PER_ROUND` (case 3, finance 4, portfolio 4, challenge 3), `SCRIPTED_ROUNDS`, `BOARD_ROUNDS`, `InterviewContext.links?`, `MAX_LINKS`, `MAX_LINK_CHARS`, `CHALLENGE_MINUTES`, `AnswerCheck`, `ScriptedQuestion`, `CheckResult`, `BoardKind` + `screen`. Storage unchanged: `is:interviews` (sessions with the new rounds validate on load; wiped by Clear my data).

## Env caps and token budget
**No new route, so no new env cap.** The new rounds share `INTERVIEW_DAILY_CAP=50` (site-wide) and the per-visitor 6/min, 30/day limits. Scripted rounds spend 1 call per session (feedback), portfolio 4 (3 questions + feedback), challenge 3 — all at or below a Tier 3 round, so the average cost per call doesn't rise.

| Model | Use at full caps | Tokens/day | Share of 200K |
|---|---|---|---|
| gpt-oss pair | core (unchanged, see tier2-spec) | ~288K of 400K | 72% (28% left) |
| qwen3.8-27b | transcribe 20 × ~2,800 | ~56K | 28% |
| qwen3.8-27b | rewrite 30 × ~800 | ~24K | 12% |
| qwen3.8-27b | interview 50 calls × ~1,300 avg (all rounds, Tiers 3 + 4; a scripted feedback call with check lines ~2,700) | ~65K | 33% |
| qwen total | Tiers 2-4 | ~145K | **73% (27% left)** |

Requests/day ≤ 100 on qwen; 8K TPM per model is unchanged from Tier 3 (one visitor ≤ 6 calls/min, a feedback call ~2.7K).

## Dependencies
None. (The board, timer and checks are home-made; no new packages.)

## Ownership (Tier 4)
| Owner | Files |
|---|---|
| orchestrator | `lib/tiers/types.ts`, `lib/tiers/flags.ts`, `components/App.tsx`, round filter in `components/tiers/interview/Interview.tsx` (Phase A only), `CLAUDE.md`, `devpost/**` |
| engine-builder | `lib/tiers/scripted.ts`, `lib/tiers/interview.ts`, `lib/tiers/board.ts` (only if `screen` needs it), `tests/tiers/**` |
| api-builder | `lib/server/interview.ts`, `app/api/interview/**`, `tests/api/interview.test.ts` |
| ui-builder | `components/tiers/interview/**` (Interview setup links + round line, Feedback checks, DesignRound challenge timer), `tests/ui/interview*.test.tsx` |

## Tests
Scripted: every case math answer key equals the numbers in its prompt (recomputed in the test), `extractNumber` table ($1,500 / 1.5k / 12% / -3 / "1,200 then 1,500" → 1500 / none), number tolerance, rubric covered/missed, `scriptFor` deterministic + finance 4 distinct, `findQuestion` round trip, `describeCheck`. Interview: scripted rounds advance locally and end at the script length, `canCall("question")` false for case/finance, challenge/portfolio first questions, `challengeLeft`, `cleanLinks`, sessions with `links` and new rounds round-trip storage, Tier 3 sessions still load, board `screen` kind round-trips. Route: question rejected for case/finance, bad links rejected (javascript:, too many, too long), links text in prompt marked not opened, Check lines in the scripted feedback prompt computed server-side (a lying client can't change them), challenge board in prompt. UI: per-field round lists (business → Case, finance → Technical questions, design → both design rounds, flags off → none), links field only for portfolio, Feedback shows the code check marks, DesignRound shows the timer for challenge only.
