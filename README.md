# InternShield

Paste a job or recruiter message and get an evidence-based scam-risk report.

## How it works

- AI extracts facts from the message, each with an exact quote.
- Fixed rules score those facts. The AI never decides the score.
- AI explains the result only after the score is set.
- The real posting is cross-checked against the company's official listing. It never says a message is safe. If nothing is flagged, it says "No red flags found" and links the official careers page.

## Run it locally

Requires Node 20+.

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `GROQ_API_KEY` and `TAVILY_API_KEY`. `HUNTER_API_KEY` is optional.
3. `npm run dev`
4. Open http://localhost:3000

Try "Try an example: a scam" and "a real one" on the check screen. If a live step fails or the free quota is used up, examples fall back to saved results and say so.

## Deploy (optional)

1. Push to a GitHub repo and import it into Vercel (free Hobby plan).
2. In Vercel → Project → Settings → Environment Variables, add `GROQ_API_KEY`, `TAVILY_API_KEY` (and optionally `HUNTER_API_KEY`, `DAILY_CHECK_CAP`, `TAVILY_DAILY_CAP`).
3. Set `ALLOWED_ORIGINS` to include your production URL, e.g. `https://your-app.vercel.app`, then redeploy. Without it every check is refused.

## Limits

Every outside service is on a free plan with no card. Per visitor: 3 checks a minute, 20 a day. Site-wide: 120 checks and 80 searches a day by default. Counters live in server memory, so they're best-effort per server instance.

## Tests

- `npm test` runs the unit tests.
- `npm run eval` runs the labeled test set and rewrites the results table below.
- `npm run eval:live -- --limit 3` re-extracts the first few test messages with the real AI (your keys and quota) and flags any whose facts or level differ from the saved ones. Run it sparingly.

## Test-set results

<!-- eval:start -->
36/36 made-up messages land in their expected level; false positives on low: 0/13 (0%). `*` marks a critical flag.

| expected \ got | low | medium | high |
|---|---|---|---|
| low | 13 | 0 | 0 |
| medium | 0 | 5 | 0 |
| high | 0 | 0 | 18 |

Held-out set (27 cases written without seeing the rules, not gating): 23/27; false positives on low: 1/9 (11%).

| expected \ got | low | medium | high |
|---|---|---|---|
| low | 8 | 1 | 0 |
| medium | 2 | 5 | 1 |
| high | 0 | 0 | 10 |

| Message | Expected | Got | Score | Top flags |
|---|---|---|---|---|
| mid-caregiver-whatsapp | medium | medium | 43 | surprise_text, off_platform, field_pattern |
| mid-mystery-shopper | medium | medium | 33 | free_email, field_pattern |
| mid-no-interview-new-domain | medium | medium | 35 | no_interview, new_domain |
| mid-recruiter-gmail-whatsapp | medium | medium | 55 | free_email, off_platform, pressure |
| mid-telegram-new-domain | medium | medium | 45 | off_platform, new_domain, pressure |
| real-abroad-whatsapp | low | low | 0 | off_platform |
| real-company-recruiter | low | low | 0 | - |
| real-greenhouse | low | low | 0 | - |
| real-handshake-interview | low | low | 0 | - |
| real-lever | low | low | 0 | - |
| real-signed-offer-portal | low | low | 0 | sensitive_data |
| real-staffing-agency | low | low | 0 | - |
| real-startup-gmail | low | low | 12 | free_email |
| real-thin-message | low | low | 0 | - |
| real-university-recruiter | low | low | 0 | - |
| scam-extract-failed | high | high | 85 | deposit_check* |
| scam-fake-check-equipment | high | high | 100 | buy_equipment*, deposit_check*, free_email |
| scam-fake-coding-test | high | high | 85 | run_code_or_install*, new_domain, pressure |
| scam-gift-card-assistant | high | high | 85 | gift_cards*, field_pattern |
| scam-injection | high | high | 85 | deposit_check*, lookalike_domain, new_domain |
| scam-lookalike-bank | high | high | 60 | lookalike_domain, no_interview, pressure |
| scam-reply-yes-text | high | high | 73 | reply_yes, surprise_text, vague_easy_pay |
| scam-reship-package-inspector | high | high | 100 | reship_or_forward*, lookalike_domain, no_interview |
| scam-ssn-telegram | high | high | 85 | sensitive_data*, off_platform, generic_greeting |
| scam-task-usdt | high | high | 100 | crypto_or_task_deposit*, surprise_text, off_platform |
| scam-training-fee | high | high | 90 | pay_fee*, lookalike_domain, new_domain |
| v2-anydesk-install | high | high | 85 | run_code_or_install* |
| v2-applied-takehome | low | low | 0 | untrusted_code |
| v2-camera-terminal | high | high | 85 | run_code_or_install* |
| v2-legit-company-laptop | low | low | 0 | - |
| v2-legit-direct-deposit | low | low | 0 | - |
| v2-reimburse-laptop | high | high | 85 | buy_equipment*, new_domain |
| v2-task-no-crypto | high | high | 73 | surprise_text, field_pattern, vague_easy_pay |
| v2-unicode-whatsapp-fee | high | high | 95 | pay_fee*, surprise_text, off_platform |
| v2-withdraw-fee | high | high | 85 | money_wrong_way*, surprise_text |
| v2-zelle-balance | high | high | 85 | money_wrong_way* |
<!-- eval:end -->

## Privacy

Your message is sent to an AI (Groq) and a search service (Tavily) to run the check. Nothing is stored on a server. Your profile and resume text stay in your browser.

## Built with

- Next.js
- TypeScript
- Tailwind CSS
- Groq (gpt-oss)
- Tavily
- RDAP
- DNS-over-HTTPS
