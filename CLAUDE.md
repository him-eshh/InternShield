# InternShield

InternShield has three primary tools: Check (rule-based message risk report), Tailor (guarded original-document resume edits), and Practice (multi-question interview sessions). Tracker and optional Profile connect the tools. The current product contract is in `devpost/scope.md`, `devpost/prd.md`, and `devpost/spec.md`; final verification is tracked in `devpost/checklist.md`. Historical stream plans and logs are in `devpost/archive/`. The old single-screen Intro, hidden Tier 2 flags, finance round, design challenge, whiteboard, and single-round interview flow are retired.

Next.js 16 App Router + TypeScript + Tailwind v4 (CSS-first tokens in `app/theme.css`, no tailwind.config). Read the installed guide in `node_modules/next/dist/docs/` before using unfamiliar Next APIs.

## Gates

```
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
npm run eval    # labeled 88/88; report held-out separately (last documented 24/27)
```

Run gates against the final integrated tree. Browser QA and a bounded live smoke with fabricated inputs are separate checks. Do not infer final submission, demo, or deployment status from a stream summary.

## Rules

- Keys only via `process.env` inside `lib/server/**`; never `NEXT_PUBLIC_`, never logged, never sent to the client. Never read or print `.env.local`.
- Never commit `.env.local` or `devpost/learner-profile.md`. Never push, deploy, or touch remotes.
- All example messages and test resumes are made up. Keep personal recruiter/scam messages out of tracked files and demos.
- AI extracts facts and explains; deterministic `lib/scoring` rules set risk. Never use “safe” as a verdict.
- Risk red/amber/green are reserved for risk results, always with icon and words. Tool colors: Check coral, Tailor teal, Practice violet.
- Every UI color comes from `app/theme.css`; no hex literals in `components/**`. Use `motion/react` for JS motion and `lucide-react` for icons, plus existing inline SVG illustrations. Respect reduced motion.
- No new dependencies without asking. Treat `lib/types.ts` contracts deliberately. Current routes and guards are documented in `devpost/spec.md`.
- Resume PDFs are cover-and-redraw documents: covered original text may remain extractable. They are not redactions. Practice's company question ranking is a historical-list proxy.
- Keep names, absolute workstation paths, personal messages, and private context out of tracked docs. The vault may be unavailable; say so rather than claiming to have read it.

## QA

`qa/v3-*.mjs` contains current browser scripts; `qa/archive/` contains old flows. `tests/shared/v3-theme.test.ts` enforces theme constraints and contrast checks. Use fabricated fixtures, inspect screenshots, and report what was and was not run.
