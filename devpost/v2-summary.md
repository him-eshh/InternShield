# InternShield v2 summary

Branch `v2` (from `v2-base` 36ad123), merging `v2-check` (fe84e11) and `v2-tools` (afb173d). Not merged into `main`, not pushed. Details: `devpost/v2-integration-log.md`, `v2-check-summary.md`, `v2-tools-summary.md`.

## 1. Approved plan
| Item | Status | Note |
|---|---|---|
| Bug A tall screenshots | ✓ | Cut into ≤ 2 strips, one request; body cap 3.6 MiB. Live: works, but a 34-message chat lost ~6 of 35 lines (known issues) |
| Bug B tracker form at 1440 | ✓ | |
| Bug C "$1.2 million" -> 1,200,000% | ✓ | Unit-aware numbers, 19-case table |
| Bug D company = department | ✓ | `department` split out in extraction (live: "University Recruiting" kept apart from Stripe) |
| Bug E resume line breaks | ✓ | |
| Bug F CRLF fixtures | ✓ | `.gitattributes` LF + `readFixture` normalizer (setup) |
| Tavily cap ~30/day + Wikidata official site first | ✓ | Live: Stripe resolved in 307 ms with no Tavily delay |
| Design groundwork (Calm Instrument tokens, readable dark, motion/react reducedMotion=user, cards always visible) | ✓ | |
| Scoring rules 1-4, 6 | ✓ | Reimbursement trap, wrong-way money, run-code split, Unicode cleanup, task vocab |
| Rules 5, 7-10 | ✓ all | 5 local link checks, 7 secrecy, 8 impersonation, 9 paperwork, 10 platforms + reply YES |
| Eval ~90 cases | ✓ | 88/88 main set, every original case correct; held-out 24/27 |
| Report redesign (ring with ticks + visible 0, action line, top 3, one sorted list, one primary footer button, Tailor/Practice hidden on high, ring animates) | ✓ | Tailor/Practice follow the live level after quick answers |
| Quick questions (only if they can change level/critical/advice, max 3, "Not sure", recovery card, editable company chip, no "employer outside US") | ✓ | Title "A few quick questions"; confirmation under the answer |
| Local link checks | ✓ | Live: look-alike careers URL flagged High |
| Annotated message view | ✓ | |
| Tailoring: keyword gap, 3 options, stronger guard, more presets | ✓ | Live call returned 3 identical texts (shown as 1); prompt now demands distinct texts (mock test, not re-run live) |
| Interview: 4-area scorecard, TS + SQL in browser, debugging round, company-style presets, wide coding layout + dark code theme, duplicate "hidden tests passed" fixed | ✓ | |
| Java/C++/Go/Rust execution | out | As planned |
| Logo / favicon / OG | ✓ | Ring-with-ticks mark, apple icon, OG image |
| A11y + reduced motion | ✓ | 8 screens x 2 themes: 0 contrast failures, visible focus on every Tab stop, Escape closes menus, reduced motion = no running animations |
| Screenshots of every feature | ✓ | See 4 |

## 2. Dropped
Nothing from the drop order (intro, resume diff, logo, tracker polish) was dropped. Optional items left out: ask-for-the-number slots, Accept "morph" animation, A3 line protocol for transcription.

## 3. Numbers
- Tests: TESTS. Eval: 88/88 main set (low FP 0/35); held-out 24/27 (misses ho-11, ho-15, ho-16).
- Live calls: 9 of 10 (table in the integration log, I4).

## 4. Screenshots
`C:\my_projects\projects\InternShield\.git\internshield-relay\v2-shots\integration\INDEX.md`. Top 10:
TOP10

## 5. Check by hand before merging
- Paste a real (non-repo) recruiter message and a known scam; read the report top to bottom.
- Upload a long phone screenshot of a chat: check no lines are missing.
- Tailor one resume line with a posting: do you get 3 different options?
- Run a TypeScript and a SQL interview problem (first run downloads from jsDelivr).
- Design board canvas is dark in both themes on purpose; check you like it in light mode.

## 6. Pending Himesh
- Merge `v2` into `main` with `--no-ff` (your OK).
- Push (Coder, after a secret scan).
- Deploy (your OK): set `DAILY_CHECK_CAP=100`, confirm `TAVILY_DAILY_CAP=30` in Vercel; check the Stripe posting used by the real example is still live.
- New optional env vars for Vercel (names only): `VISION_MODEL`, `INTERVIEW_MODEL`, `REWRITE_MODEL`; `TRANSCRIBE_DAILY_CAP` default is now 12.
- Decide on the optional items in 2.

## 7. Known issues
- Tall screenshot (34 messages, 2 strips) came back with ~6 lines missing in the live run; no duplicates.
- Two screenshots back to back can hit Groq's rate limit; the UI says "Screenshot reading is busy. Try again in 8 seconds."
- The explainer sometimes puts a flag title in quotes as if the message said it.
- Held-out misses: WhatsApp-only and Telegram-interview messages score low (20) instead of medium; one vague urgent text scores high (60) instead of medium.
- `tests/tiers/pdf.test.ts` can time out under full-suite load (timeout raised to 20 s; passes).
- Header chip Tailor/Practice use the first report level; the in-report buttons use the live one.
- Dev-only "Cache disabled" badge shows in screenshots.
