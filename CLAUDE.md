# InternShield

Paste a recruiter message, get an evidence-based scam-risk report. AI extracts facts and explains; fixed rules in `lib/scoring` decide the score. Plans: `devpost/scope.md`, `prd.md`, `spec.md` (source of truth), `api-facts.md`, `scam-detection-research.md`. Progress: `devpost/checklist.md`.

Next.js 16 App Router + TypeScript + Tailwind v4 (CSS-first config in `app/globals.css`, no tailwind.config). See `AGENTS.md`: read `node_modules/next/dist/docs/` before using unfamiliar Next APIs.

## Status

v2/v3 streams are merged on branch `v3`. Single working copy at `InternShield` (no worktrees); the old per-stream ownership tables are retired. `lib/types.ts` contracts change deliberately, not casually. No new dependencies unless asked. Historical stream logs and briefs: `devpost/archive/`, `qa/archive/`.

## Gates (all must pass before any merge)

```
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
npm run eval    # 88/88, held-out >= 24/27
```

## Rules

- Keys only via `process.env` inside `lib/server/**`; never `NEXT_PUBLIC_`, never logged, never sent to the client. Never read or print `.env.local`.
- Never commit `.env.local` or `devpost/learner-profile.md`. Never push, deploy, or touch remotes.
- Example messages are made up. Never put Himesh's real recruiter or scam messages in the repo.
- Never say "safe" as a verdict. Nothing from `scope.md > Explicitly Cut`; Tier 2 stays hidden.
- Motion (`motion/react`) is the only animation library; icons stay inline SVG.

## v3 conventions

- **Theme rule:** every color comes from a token in `app/theme.css`; never a hex literal in `components/**` (`tests/shared/v3-theme.test.ts` enforces it, plus contrast). Inside a tool, use `--tool`, `--tool-tint`, `--tool-strong`, `--on-tool` (set by `data-tool`). Risk red/amber/green only on risk results, always with an icon + words.
- **Icons:** `lucide-react` only. **Motion:** `motion/react`, reduced-motion aware.
- **Company intel:** `POST /api/intel { company, role, kind }` -> `CompanyIntel` (`lib/server/companyIntel.ts`); cached 7 days, capped by `INTEL_DAILY_CAP`, `limited: true` when capped/unconfigured. Tests mock it; no live calls.
- **Quality bar:** v3 is judged on whether it is good to use, not whether it renders. Each brief's Quality bar line is a test: prove it with a screenshot you actually looked at, or an automated check.
- QA scripts live in `qa/` (`v3-*.mjs`, shared `lib.mjs`, `ports.mjs`, `serve.mjs`, `make-shots.mjs`); `node qa/serve.mjs start|stop <port>` runs a dev server.
