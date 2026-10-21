# InternShield overnight build: orchestrator brief

Himesh approved this plan on Oct 21, 2026 ~1:10 AM ET and is asleep. Run it end to end without asking questions. Where a skill says to pause for the learner, record the item under Hands-on Checkpoints / Final Review as "pending Himesh (morning)" and continue. He chose FAST MODE. He approved scope, PRD and spec already; treat this brief as his approval of the checklist (set checklist status: approved after writing it).

You are the orchestrator (Opus). Follow .claude/skills/5-build/SKILL.md for the checklist format, verification, commits and git safety, adapted as below. Source of truth: devpost/scope.md, prd.md, spec.md, api-facts.md, scam-detection-research.md.

## Team (defined in .claude/agents)
- engine-builder (Opus, worktree): lib/scoring, backstop, test set.
- api-builder (Sonnet, worktree): app/api, lib/server, caps/limits/cache. Mocks only.
- ui-builder (Sonnet, worktree): pages, components, design. Fixtures only.
- chores (Haiku, worktree): README, example fixtures, metadata.
- reviewer (Opus, read-only): review before each merge and at the end.

## Phases
1. Setup (you alone, sequential): write devpost/checklist.md (slices below). Scaffold Next.js App Router + TS + Tailwind + ESLint in this folder (keep devpost/, .claude/, .gitignore, .env.local). Install EVERY dependency needed by all workers now (e.g. zod, vitest, framer-motion/motion, pdf/docx text extraction, lucide-react) so nobody touches package.json later. Write: tailwind theme + globals.css tokens (light/dark), root layout with theme script, lib/types (all shared contracts: extracted facts, flags, checks, report, API request/response shapes), fixtures for the two "Try an example" cases (made up: "a scam" with fake check for equipment + WhatsApp move; "a real one" normal recruiter message from a real company with a findable posting), stub API routes returning fixtures, .env.example (no secrets), CLAUDE.md with ownership map and gates. Verify gates, commit "Slice 1: scaffold and contracts".
2. Parallel: launch engine-builder, api-builder and ui-builder together in the background, each in its own worktree, each with a precise task and its file ownership. Give chores small tasks when useful. Do not edit their folders while they run.
3. Merge one at a time in order engine -> api -> ui. Before each merge run the reviewer on that branch and fix blockers (send fixes back to the owning worker). After each merge run the gates on the main branch: npm run lint, npx tsc --noEmit, npx vitest run, npm run build. Do not proceed until green. Commit.
4. Integration: replace stubs with real wiring. Run the dev server and test both "Try an example" flows end to end with the real keys from .env.local (the app reads them; never read, print, or log .env.local yourself). Keep live runs minimal: at most ~10 full checks tonight. Fix what breaks.
5. Final review: reviewer full pass vs spec; fix blockers and should-fixes. Run all gates. Update README (setup, test-set results table, privacy line). Commit.
6. Polish only if everything above is green and time/usage remain: motion, empty/error states, a11y pass.

## Checklist slices (write them in the 5-build template format)
1 Scaffold + contracts + stub flow showing a fixture report. 2 Scoring engine + test set. 3 Server routes (mocked) with limits/caps. 4 UI screens on fixtures. 5 Live integration of both examples. 6 Review fixes + README. Record the parallel strategy under Revisions as a deliberate deviation approved by Himesh.

## Hard rules
- Never git push, never deploy, never touch remotes. Local commits only. Stage only intended files; check every diff for secrets. Never commit .env.local or devpost/learner-profile.md.
- Never put Himesh's real recruiter/scam messages anywhere.
- No --dangerously-skip-permissions behavior; stay within allowed tools.
- Don't add anything from scope.md "Explicitly Cut". Tier 2 stays hidden.
- Keep your own context small: workers report in <=10 lines; track progress in devpost/checklist.md and git, and tick boxes immediately.
- Clean up finished worktrees (git worktree remove / prune) after merging.
- If you hit something you cannot safely fix, record it in devpost/build-log.md and move to the next independent task.
- Append a short timestamped progress line to devpost/build-log.md at each phase change.

When finished, write devpost/build-summary.md: what works, how to run it (npm run dev), test results, what's pending Himesh's hands-on checks, known issues.
