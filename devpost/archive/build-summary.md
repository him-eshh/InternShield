# InternShield overnight build summary (Oct 21, 2026)

## What works

- **Full journey in one page:** intro → profile steps (field, level, skills, resume PDF/.docx read in the browser) → check form with auto-fill → live checklist → report → outcome → check another.
- **The kernel:** Groq extracts facts with exact quotes (bad quotes dropped twice: server and engine), a keyword backstop scans the raw text, and fixed rules in `lib/scoring` set the score. The AI only explains afterwards, from red flags only. It never says "safe".
- **Report:** risk ring, quick questions that re-score in the browser with a "why it changed" line, explanation with highlighted quotes, Sender/Message/Offer cards, collapsed Couldn't check, What to do now + FTC/IC3/platform links + Copy report, or the posting section with a match table and the official apply link.
- **Both examples work live:**
  - "a scam" → Strong signs of a scam, 100, with critical flags for the fake check and the equipment purchase. The company search correctly finds no official site (neutral).
  - "a real one" → No red flags found, 0. stripe.com is confirmed (registered 1995, receives mail) and the real posting is found at https://stripe.com/careers/listing/software-engineer-intern/8031833.
- **Failure handling:** a forced timeout (`?fail=company`, dev only) skips step 4, still shows the report, and Retry re-runs only steps 2 and 4. If live steps fail, the examples fall back to saved results and say so.
- **Safety and cost:** origin check, 16 KB body cap, 4,000-char message cap, 3/min and 20/day per visitor, 120 checks/day, 80 searches/day, explain cap, Groq 20b↔120b fallback, and a timeout on every outside call. Keys stay in `lib/server` only.

## How to run it

```
npm install          # already done locally
npm run dev          # http://localhost:3000 (keys come from .env.local)
npm test             # 175 unit tests
npm run eval         # 26 labeled messages, rewrites the README table
npm run eval:live -- --limit 3   # real Groq extraction, uses quota
```

## Test results

- **Gates:** `npm run lint`, `npx tsc --noEmit`, `npx vitest run` (175 passed) and `npm run build` are all green on `main`.
- **Eval:** 26/26 made-up messages land in their expected level (11 high, 5 medium, 10 low, including startup on Gmail, staffing agency, Greenhouse/Lever, university recruiter, and a prompt-injection case).
- **Live runs:** 9 tonight, under the budget of 10. They found and fixed these real bugs:
  - rdap.org returns 403 without a User-Agent.
  - The company picker matched "Brightline Data Solutions" to gobrightline.com.
  - The posting picker accepted a Dow Jones Workday posting for Stripe.
  - The explanation filter threw away nearly every AI paragraph over the word "legitimate".
- **Review:** every slice and a final full pass were reviewed, and all blockers and should-fixes were fixed. Details are in `devpost/checklist.md > Revisions`.

## Pending Himesh (morning)

1. **Hands-on check:** run `npm run dev`, click "Try an example: a scam" and then "a real one". Do you believe each report, and what would you change? (These are the planned checkpoints; boxes in `checklist.md` are still unchecked.)
2. **Browser-only checks** (I couldn't open a browser on localhost):
   - The ring counts up in the right color, and the cards fade in.
   - The posting card expands, and answering a question re-animates the ring.
   - Keyboard-only use works: focus rings show, and the coverage line opens Couldn't check.
   - The screen-reader announcement plays, and reduced motion gives plain fades.
   - Light and dark contrast hold, with no theme flash.
   - Nothing scrolls sideways on a narrow phone width.
   - PDF and .docx resume upload work, and Clear my data works.
   - Profile and theme survive a reload, and the share image renders.
3. **Final review and learning wrap-up** (`5-build`): kick-the-tires feedback, the code tour, and `devpost/app-map.html`.
4. **Before the demo:** re-check that the Stripe posting is still live, and refresh `lib/examples.ts` if not.

## Known issues / decisions to look at

- **Workers didn't use git worktrees.** Background agents had no shell access overnight, so they wrote straight into `main` with separate files each, and I ran every gate and commit. A stale, empty worktree folder may be left at `.claude/worktrees/agent-a2502dab67038db31` (Windows "Permission denied" on delete). `git worktree prune` plus deleting the folder clears it.
- **Accent color:** light-mode accent is `#2A5FB8`, not the spec's `#2F6FD6`, so blue text on the light-blue tint passes 4.5:1 contrast.
- **Coverage line:** it reads as weighted checks ("13 of 14 checks ran").
- **Untouched files:** `.agents/`, `agent/`, `.claude/skills/` and `skills-lock.json` are your hackathon skill files. I left them untracked and didn't touch them.
- **Not checked live:** Hunter (no decision on a key), and Groq's exact token use per check. The dev log shows about 1,280 tokens per extraction and 440 per explanation, under the spec's 2,400 target.
- **In-memory limits:** caches and counters are per server instance (accepted in the spec).
