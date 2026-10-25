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
- Motion (`motion/react`) is the only animation library; icons stay inline SVG.

## v2 ownership (parallel worktrees)

Two streams build at once from `v2-base`: `check` (worktree branch `v2-check`) and `tools` (`v2-tools`). Only edit files in your table; anything else goes under "Needs integration" in your log. Shared files nobody edits until integration: `package.json`, lockfile, configs (`next.config.ts`, `eslint.config.mjs`, ...), `app/layout.tsx`, `app/globals.css`, `components/App.tsx`, `components/MotionProvider.tsx`, `qa/lib.mjs`, `qa/ports.mjs`, `qa/serve.mjs`, `.env.example`, `lib/server/guard.ts`, `CLAUDE.md`.

| check owns | |
|---|---|
| Scoring + eval | `lib/scoring/**`, `eval/**`, `tests/scoring/**` |
| Server (check routes) | `app/api/{extract,company,posting,sender,explain}/**`, `lib/server/{extract,extractSchema,tavily,rdap,dns,hunter,http,cache}.ts`, new `lib/server/{wikidata,links}.ts`, `lib/explainFallback.ts` |
| Client logic | `lib/client/{pipeline,copyReport}.ts`, new `lib/client/{annotate,errorCopy}.ts`, `lib/autofill.ts`, `lib/examples.ts`, `lib/quotes.ts`, new `lib/{reportView,recovery}.ts`, `lib/types.ts` (additive; tools reads it), `fixtures/**` |
| UI | `components/report/**`, `components/{CheckForm,Checklist,Intro,Logo,icons}.tsx`, `components/tiers/SaveToTracker.tsx` (Bug B only), `app/v2-check.css`, `app/icon.svg`, `app/apple-icon.png`, `app/opengraph-image.tsx` |
| Tests + QA | `tests/api/{extract,company,sender,explain,explainTidy,picker}.test.ts` + new `tests/api/v2-check-*.test.ts`, `tests/ui/{fixReport,pipeline,autofill,quickQuestionsReal,slice7}.test.*` + new `tests/ui/v2-check-*.test.tsx`, `qa/v2-check-*.mjs`, `devpost/v2-check-*.md`, `README.md` (eval table only) |

| tools owns | |
|---|---|
| Tier logic + types | `lib/tiers/**` (incl. `lib/tiers/types.ts` and `lib/tiers/flags.ts`), new `lib/v2/tools-*.ts` |
| Server (tool routes) | `app/api/{rewrite,transcribe,interview}/**`, `lib/server/{rewrite,transcribe,interview,groq}.ts` |
| Client | `lib/client/resume.ts`, `components/ProfileSteps.tsx` (resume upload preview only) |
| UI | `components/tiers/**` except `SaveToTracker.tsx`, `app/v2-tools.css`, `public/**` (workers, vendor assets) |
| Tests + QA | `tests/tiers/**`, `tests/fixtures/**`, `tests/api/{rewrite,transcribe,transcribeDedupe,interview,guard}.test.ts` + new `tests/api/v2-tools-*.test.ts`, `tests/ui/interview*.test.tsx` + new `tests/ui/v2-tools-*.test.tsx`, `qa/v2-tools-*.mjs`, `devpost/v2-tools-*.md` |

v2 flags in `lib/tiers/flags.ts` start false; tools flips each in the commit where it passes gates. Check-stream features aren't flagged (they replace UI directly and must work at every commit).

QA in a worktree: set `QA_BASE`, `QA_SHOTS` (required: `.git` is a file there), `QA_PORT_RANGE`; `node qa/serve.mjs start|stop <port>` runs one `next dev` per worktree.

### v2 gates (all green before a phase-closing commit)

```
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
npm run eval    # 26/26
```

## v3 (parallel worktrees from `v3-base`)

| Stream | Worktree / branch | Ports |
|---|---|---|
| setup, then integration | `InternShield-v3` / `v3-base` | 3400-3499 |
| resume | `InternShield-v3-resume` / `v3-resume` | 3100-3199 |
| interview | `InternShield-v3-interview` / `v3-interview` | 3200-3299 |
| shell | `InternShield-v3-shell` / `v3-shell` | 3300-3399 |

Port 3000 and the main tree belong to Himesh: never touch them. Dev servers start hidden and stop after each screenshot round. Anything outside your table goes under "Needs integration" in your log.

| Owner | Files |
|---|---|
| resume | `components/tiers/ResumeTailor*`, `components/resume/**`, `lib/tiers/{tailored,resumeGuard,resumeLines,keywordGap,pdf}*`, new `lib/tiers/resume*` (incl. `resumeTypes.ts`), `lib/client/resume*`, `lib/server/rewrite*`, `app/api/rewrite/**`, `app/v3-resume.css`, its tests/qa/devpost files |
| interview | `components/tiers/interview/**`, `components/interview/**`, `lib/tiers/{interview,scripted,scorecard,presets,problems,debugging,sql,runner,board}*`, `lib/tiers/types.ts` (session/bank types), new `lib/tiers/session*`, `lib/tiers/bank*`, `data/question-bank/**`, `lib/server/interview*`, `app/api/interview/**`, `public/workers/**`, `app/v3-interview.css`, its tests/qa/devpost files |
| shell | `components/{App,CheckForm,Checklist,Intro,Logo,icons,ThemeToggle,ProfileSteps,ProfileChip,ui}*`, `components/shell/**`, `components/home/**`, `components/profile/**`, `components/illustrations/**`, `components/report/**`, `components/tiers/{Tracker,SaveToTracker,ScreenshotUpload}*`, `lib/impact.ts`, `lib/{reportView,autofill,recovery}.ts`, `lib/client/{storage,pipeline}.ts`, `lib/scoring/questions.ts` (copy/impact only), `app/{page,layout}.tsx`, `app/{check,tracker,profile}/**`, `app/icon*`, `app/apple-icon*`, `app/opengraph-image*`, `app/v3-shell.css`, its tests/qa/devpost files |
| shared (nobody edits) | `package.json`, lockfile, `app/theme.css` (shell may tune values, not names; log it), `app/globals.css`, `lib/types.ts`, `lib/server/{guard,companyIntel,cache,tavily,wikidata}.ts`, `app/api/intel/**`, `next.config.ts`, `CLAUDE.md` |

- **Theme rule:** every color comes from a token in `app/theme.css`; never a hex literal in `components/**` (`tests/shared/v3-theme.test.ts` enforces it, plus contrast). Inside a tool, use `--tool`, `--tool-tint`, `--tool-strong`, `--on-tool` (set by `data-tool`). Risk red/amber/green only on risk results, always with an icon + words.
- **Icons:** `lucide-react` only. **Motion:** `motion/react`, reduced-motion aware.
- **Company intel:** `POST /api/intel { company, role, kind }` -> `CompanyIntel` (`lib/server/companyIntel.ts`); cached 7 days, capped by `INTEL_DAILY_CAP`, `limited: true` when capped/unconfigured. Tests mock it; no live calls.
- **Quality bar:** v3 is judged on whether it is good to use, not whether it renders. Each brief's Quality bar line is a test: prove it with a screenshot you actually looked at, or an automated check.
- Gates: the v2 list above; eval stays 88/88 (held-out >= 24/27).
