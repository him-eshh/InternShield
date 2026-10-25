# v3 setup log

## Baseline (v3-base @ f790485, Oct 25)
- lint 0 errors (2 warnings in qa/v2-check-heldout-lint.mjs), tsc clean, vitest 73 files / 1191 tests passed, build compiles, eval 88/88 (low 35/35, 0 false positives), held-out 24/27 (misses ho-11, ho-15, ho-16).
- Gate runner: `node qa/v3-gates.mjs [lint,tsc,vitest,build,eval]` writes short results to `qa/gates-out.txt` (gitignored).

## Step 1: dependencies
- `lucide-react` 1.61.0 (ISC), `diff` 9.0.0 (BSD-3-Clause, ships its own types, no @types needed), `jszip` 3.10.2 (MIT OR GPL-3.0-or-later, used under MIT; was already transitive via mammoth, now explicit).
- Fonts via `next/font/google` (Bricolage Grotesque, Inter): no package.
- `npm ci --dry-run` passes; `@emnapi/runtime` + `@emnapi/core` 1.11.3 lockfile entries still present (needed by Linux `npm ci`). Full `npm ci` skipped on Windows (EPERM on locked next-swc .node file); `npm ls` resolves all three.

## Step 2: theme tokens
- `app/theme.css` holds every token (canvas, surfaces 1-3, borders, text levels, ink + coral/teal/violet with fill/strong/tint/on, risk good/warn/bad, ink ramp, code syntax, shadows, mesh, fonts, radii, motion). `globals.css` imports it; old names (`--blue-N`, `--accent*`, `--text`, `--card`, `--muted`, `--bg-soft`) alias the new values, so v2 report chrome turns neutral ink.
- `data-tool="check|tailor|practice|neutral"` sets `--tool/--tool-tint/--tool-strong/--on-tool`, and `--accent*` follow it. Tailwind names: `bg-tool`, `text-tool-strong`, `bg-tool-tint`, `text-on-tool`, `bg-coral` etc., `font-display`.
- Contrast (`node qa/v3-contrast.mjs`, 194 pairs, all pass; enforced by `tests/shared/v3-theme.test.ts`). Tightest: light `--coral` mark on `--bg-subtle` 3.11 (min 3), `--on-coral` on `--coral` 4.71, `--good` on `--good-tint` 4.70, `--bad` on `--bad-tint` 4.72, `--good` on `--bg-subtle` 4.73; dark `--fg-3` on `--surface-3` 4.78, `--border-strong` on `--surface-3` 3.27. Coral vs risk red: 1.56 light / 1.44 dark (distinct hue, coral is orange and lighter).
- Fonts: Bricolage Grotesque (`--font-bricolage`, headings + `font-display`) and Inter (`--font-inter`, body) via next/font in `app/layout.tsx`.
- Code syntax tokens moved from `app/v2-tools.css` into theme.css; Board.tsx `#888` fallback -> `gray`. Hex-free components enforced by the same test.

## Step 3: app shell
- Routes `/`, `/check`, `/tailor`, `/practice`, `/tracker`, `/profile` (thin pages), `components/shell/{AppStateProvider,Nav,PageTransition}.tsx`, no forced intro/profile gating; first visit lands on Home.
- `qa/v3-lib.mjs` opens routes and seeds profile/resume/finished check via localStorage; `qa/v3-setup-shell.mjs` passes at 1440/390, light/dark (shots `setup-*` in QA_SHOTS), incl. back from `/tailor` and refresh on `/check` showing the report.
- `--nav-bottom` (globals.css) keeps the Tailor sticky bar and Tracker toast above the mobile tab bar.

## Step 4: contracts
- `lib/impact.ts` (`AnswerImpact`, basic `diffReports`, TODO for shell), `lib/tiers/types.ts` (`SessionConfig`, `SessionTurn`, `SessionSummary`, `BankQuestion`), `lib/tiers/resumeTypes.ts` (`ResumeEdit`, `TailorPlan`).
- Company intel: `lib/server/companyIntel.ts` + `POST /api/intel`. Cache (7 days) -> Wikidata official site -> Tavily restricted to that domain -> general Tavily (excludes linkedin + people-search sites) when < 3 hits -> Groq (`intel` task, 20b then 120b) returns claims with a snippet number; claims without a valid source are dropped and only cited sources are returned. `takeIntel()` caps lookups at `INTEL_DAILY_CAP` (15) on top of `TAVILY_DAILY_CAP`; `limited: true` when capped, unconfigured, no hits or Groq fails (failures not cached). Route visitor limit 4/min, 20/day. `tests/api/intel.test.ts` (6, all mocked).

## Step 5
- CLAUDE.md v3 section: worktrees/ports, ownership, theme rule, intel, quality bar.

## Pending Himesh
- (none yet)
