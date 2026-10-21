# InternShield

Paste a recruiter message, get an evidence-based scam-risk report. AI extracts facts and explains; fixed rules in `lib/scoring` decide the score. Plans: `devpost/scope.md`, `prd.md`, `spec.md` (source of truth), `api-facts.md`, `scam-detection-research.md`. Progress: `devpost/checklist.md`.

Next.js 16 App Router + TypeScript + Tailwind v4 (CSS-first config in `app/globals.css`, no tailwind.config). See `AGENTS.md`: read `node_modules/next/dist/docs/` before using unfamiliar Next APIs.

## Ownership map (parallel build)

| Owner | Files |
|---|---|
| orchestrator | `package.json`, lockfile, all configs, `app/layout.tsx`, `app/globals.css`, `lib/types.ts`, `lib/constants.ts`, `lib/quotes.ts`, `lib/examples.ts`, `fixtures/reports.ts`, `tests/shared/**`, `CLAUDE.md`, `devpost/**` |
| engine-builder | `lib/scoring/**`, `eval/**`, `tests/scoring/**` |
| api-builder | `app/api/**`, `lib/server/**`, `lib/explainFallback.ts`, `tests/api/**` |
| ui-builder | `app/page.tsx`, `app/icon.svg`, `components/**`, `lib/client/**`, `lib/autofill.ts`, `public/**`, `tests/ui/**` |
| chores | only files the orchestrator names (e.g. `README.md`) |

Tier 2 (`devpost/tier2-spec.md > Ownership`): orchestrator also owns `lib/tiers/types.ts`, `lib/tiers/flags.ts`, `lib/server/guard.ts`, `lib/server/groq.ts`, `lib/client/storage.ts`, `components/App.tsx`, `.env.example`. engine-builder: `lib/tiers/resumeGuard.ts`, `lib/tiers/tracker.ts`, `tests/tiers/**`. api-builder: `app/api/rewrite/**`, `app/api/transcribe/**`, `lib/server/rewrite.ts`, `lib/server/transcribe.ts`. ui-builder: `components/tiers/**`, `lib/tiers/image.ts`, `lib/tiers/pdf.ts`, `lib/tiers/client.ts`. Tier features stay hidden behind `lib/tiers/flags.ts` until their slice passes the gates.

Tier 3 (`devpost/tier3-spec.md > Ownership`): orchestrator keeps the Tier 2 shared files plus round wiring in `components/tiers/interview/Interview.tsx`. engine-builder: `lib/tiers/interview.ts`, `lib/tiers/problems.ts`, `lib/tiers/board.ts`, `tests/tiers/**`. api-builder: `app/api/interview/**`, `lib/server/interview.ts`, `tests/api/interview.test.ts`. ui-builder: `components/tiers/interview/**`, `lib/tiers/runner.ts`, `lib/tiers/client.ts`, `public/workers/**`, `components/tiers/Tracker.tsx` (`onPractice`), `tests/ui/interview*.test.tsx`.

Tier 4 (`devpost/tier4-spec.md > Ownership`): orchestrator keeps the Tier 2/3 shared files (types, flags, App). engine-builder: `lib/tiers/scripted.ts`, `lib/tiers/interview.ts`, `lib/tiers/board.ts`, `tests/tiers/**`. api-builder: `lib/server/interview.ts`, `app/api/interview/**`, `tests/api/interview.test.ts`. ui-builder: `components/tiers/interview/**`, `tests/ui/interview*.test.tsx`.

Contracts in `lib/types.ts` are read-only to workers: report needed changes, don't edit. No new dependencies: everything is installed.

## Gates (all must pass before any merge)

```
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
```

## Rules

- Keys only via `process.env` inside `lib/server/**`; never `NEXT_PUBLIC_`, never logged, never sent to the client. Never read or print `.env.local`.
- Never commit `.env.local` or `devpost/learner-profile.md`. Never push, deploy, or touch remotes.
- Example messages are made up. Never put Himesh's real recruiter or scam messages in the repo.
- Never say "safe" as a verdict. Nothing from `scope.md > Explicitly Cut`; Tier 2 stays hidden.
- No animation or icon libraries (spec.md > Stack): CSS motion + inline SVG.
