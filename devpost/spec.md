---
doc: spec
status: current-v3
---

# InternShield technical spec

## Architecture

Next.js 16 App Router, TypeScript, Tailwind v4 with CSS-first tokens in `app/theme.css`, `motion/react`, and `lucide-react`. Routes are `app/{check,tailor,practice,tracker,profile}`; API handlers are in `app/api`. Read the installed Next.js guide in `node_modules/next/dist/docs/` before changing an unfamiliar API.

The Check client pipeline is in `lib/client/pipeline.ts`. Groq extraction and explanation run through server routes; company, posting, sender, and intel lookups use Tavily, Wikidata, RDAP, DNS-over-HTTPS, and optional Hunter as available. `lib/scoring` is pure deterministic scoring, with regex/keyword backstops and quote validation. Model text cannot set the level. The report keeps unavailable checks distinct from clean results.

Resume parsing, editing, preview, and export are in `lib/client/resume*`, `lib/tiers/resume*`, and `components/resume`. AI suggests edits through `/api/rewrite`; client and server guards validate suggested lines. PDF cover-and-redraw may leave old text extractable beneath the new text. DOCX editing supports a narrower set of existing-word changes. Neither export is a redaction tool.

Practice session planning and feedback are in `lib/tiers/session*`, `bank*`, `runner`, `sql`, and `sessionFeedback`; the UI is in `components/interview` and `components/tiers/interview`. Python, TypeScript, and SQL run in browser workers with pinned public-CDN runtime assets. Live questions, hints, and feedback use `/api/interview` when available; local pools and type-specific review keep a session usable when unavailable. The public question bank stores metadata only, with attribution in `data/question-bank/SOURCES.md`.

## State and data flow

`lib/client/storage.ts` owns the browser local-storage keys: profile, extracted resume text, theme, tracker, last Check report, preferences, active Practice session, Practice history, and cross-tool targets. “Clear my data” clears these except theme. There is no account or persistent application database. The original uploaded document is handled in browser memory for editing/export. External API calls can transmit message text, screenshot image data, extracted resume text, posting context, sender address, interview answers, and bounded resume excerpts as needed. Server memory caches some results and counters; these are per instance.

## Server controls

All API secrets are read through `process.env` in `lib/server/**`; none are `NEXT_PUBLIC_`. `lib/server/guard.ts` enforces allowed origins (localhost:3000 by default), bounded body reads (16 KB JSON; 3.6 MB screenshot), and input lengths. Extraction allows 3/minute and 20/day per visitor. Rewrite allows 4/minute and 15/day; screenshot transcription 2/minute and 6/day; interview calls 6/minute and 30/day; intel 4/minute and 20/day. Other lookup routes share 20/minute. The production identity bucket uses Vercel's forwarded IP; other production hosts use a conservative shared bucket unless a trusted proxy contract is added.

Default instance-wide daily caps: checks 120; Tavily 30; Wikidata 300; intel 15; rewrite 30; transcription 12; interview 50. Explanation has a separate cap of twice the check cap. Values can be configured with the matching variables in `.env.example`. Caches and caps are in memory, so they are best-effort per instance, not a globally coordinated quota. Provider limits remain independent.

## Scoring and evaluation

The scoring rules and backstop live in `lib/scoring`. The model extracts quote-backed facts and may explain the completed report; it never selects the risk band. “No red flags found” is not a safety guarantee. Missing posting evidence is neutral. `eval/` contains 88 labeled fictional messages and 27 held-out fictional messages; the last documented result is 88/88 and 24/27 held-out. The held-out misses remain known. Use `npm run eval` to refresh the generated README table; a green fixture suite does not measure real-world recall.

## Quality gates

Run `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npm run build`, and `npm run eval` on the final tree. Browser QA covers desktop/mobile and light/dark Check, Tailor PDF/DOCX, Practice coding/SQL/behavioral, Tracker, cross-tool seams, and reduced motion. Live calls use a bounded smoke budget and fabricated inputs. Do not infer final acceptance from archived stream reports.

## Current limits

- PDF edits visually cover and redraw text; underlying text can remain extractable, and white covers can fail on colored backgrounds.
- DOCX edits are limited by original word layout. Resume suggestion quality from live providers requires review.
- Python, TypeScript, and SQL runtime assets load from public CDNs and have not been established to work offline.
- Company-specific question ranking is a proxy derived from historical lists; a thin pool falls back with notice.
- The held-out scoring set misses 3 of 27 cases. This is reported separately from the required 88-message fixture set.
