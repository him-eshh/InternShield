# InternShield design direction: "Field notebook, not SaaS template"

> Design brief and decision record. The Levels/Tetris/Sketch choice immediately below governs the final visual pass. The older A-F sections contain proposed slices and critiques from before implementation; verify any “current UI” description there against the live app. Final verification belongs in `checklist.md`.

## Owner update, 2026-10-25: Levels + Tetris + Sketch

The owner chose a combination of the [Levels](https://github.com/bergside/awesome-design-skills/tree/main/skills/levels), [Tetris](https://github.com/bergside/awesome-design-skills/tree/main/skills/tetris), and [Sketch](https://github.com/bergside/awesome-design-skills/tree/main/skills/sketch) design skills. Their project-local copies are installed in `.agents/skills/`. This section supersedes the earlier single-metaphor restriction where it conflicts; the rest of this brief remains the starting implementation spec.

- **Levels supplies the interaction hierarchy:** one clear next action per state; show what was checked, why a result changed, and the next useful step without making users decode a dashboard. Controls must have explicit focus, disabled, loading, error, and recovery states.
- **Tetris supplies the structural motif:** small offset square modules, block-like progress and staggered evidence pieces. Use the motif where discrete facts or steps really accumulate: Home's annotated message, Check coverage, Tailor accepted edits, and Practice rounds. Do not make the scam verdict look like a game score or use blocks as decoration in every card.
- **Sketch supplies the human annotation:** warm paper, short hand-drawn SVG strokes, dashed callouts, marker highlights, and pencil-like margin notes. Quoted message text and the user's resume remain legible, selectable text. Sketch marks never replace an icon, label, or accessible focus state.
- **One palette still governs the app:** retain the existing Check coral, Tailor teal, Practice violet, and distinct risk red/amber/green. The reference skills' literal palettes conflict with this semantic mapping, so use their layout and interaction ideas rather than importing their hex values. Bricolage Grotesque and Inter remain the fonts; no novelty display font is added to safety-critical reading.
- **Restraint:** the Home hero gets the most expressive block-and-sketch composition. Tool pages use smaller versions of the same grammar for progress and evidence. Motion stays short, responsive to state changes, and absent under reduced motion.

Acceptance: at 390 and 1280 px in both themes, a person can identify the next action, the source of each claim, and the missing checks; no visual motif hides content, introduces horizontal overflow, or weakens contrast. The risk score remains described as rule-based, not a probability.

Author: design lead. Date: 2026-10-25. Scope: visual identity, motion, interaction, a11y, and a 4-slice build plan.
Inputs: the six reviewer screenshots in `images/`, `app/theme.css`, `app/globals.css`, `components/ui.ts`, `shell/{Nav,PageTransition,reveal}`, `report/RiskRing.tsx`, plus research (sources inline).
Not covered by screenshots: Tailor, Tracker, Profile, Practice summary. Those critiques come from code and the shared tokens, and are marked "(inferred)". Whoever implements them should open the screen first.

Note on a brief mismatch: Tailor's token is `--teal` (#0d7d74), not green. Keep it teal-leaning. A real green would collide with the risk-low `--good` (#1d7a4c), which is reserved for risk results.

---

## A. Critique of the current UI (ranked by impact)

Why it reads "AI-generated": it follows the tells that the anti-slop guides list. Those are a centered hero over a three-card grid, a gray 1px border on every card, a colored mesh gradient, numbered circles, and one display face with no point of view ([vibecodekit](https://vibecodekit.dev/ai-slop-design), [gradientdeck](https://gradientdeck.com/blog/anti-slop-design-with-gradientdeck), [avoid-ai-design](https://github.com/funboy322/avoid-ai-design)). The tokens and a11y are good. The weakness is composition, rhythm and motion, which is exactly what a human designer adds. The guides' shared fixes are to break symmetry, build around the product's own data, use cards only where they earn it, and commit to one accent per screen.

| # | Where | Finding | Why it reads generic | Severity |
|---|---|---|---|---|
| 1 | Report (image.png) | Everything is a centered column in one giant rounded box. The change log ("Added: Company... Confirmed... + Sent from... - Sent from...") is dumped as centered 13px gray run-on lines. | It reads like debug output, not a result. The advice ("Don't reply, pay, or click anything") is gray body text while the least important thing (the dial) is the biggest. | Critical |
| 2 | Home (image1, image3) | Radial coral/violet/teal mesh, then "Three tools, one profile" as three identical white cards with tinted illustration headers, then "How it works" as three numbered navy circles. | This is the symmetric-three-things template (hero, 3 cards, 3 steps). The mesh is the soft multicolor gradient tell. | High |
| 3 | Practice (image4-6) | Every block is the same white rounded box with a 1px border (question, feedback, follow-up, hint). Violet appears only in tiny labels. Setup counters ("Live coding: 1/2 Behavioral: 1/2 SQL: 0/1") are 12px gray. | No hierarchy between "the thing I answer now" and "history". The tool has no colored presence, so it does not feel like a different room from Check. | High |
| 4 | Practice coding (image6) | "Finish and get feedback" floats alone with an orphan hint ("Submit your code first."). "Ask for a hint" and "Skip question" sit far left and low. The editor is a white box on a white page. Footer says "AI calls: 0/30". | Actions are scattered. Whitespace is accidental, not designed. "AI calls" is jargon. | High |
| 5 | Mobile nav (image3) | The header has no wordmark and spends its width on a 3-segment theme toggle (monitor, sun, moon) plus the avatar. The bottom bar has six 11px labels. The capture shows the bottom bar cutting across a card mid-page, so verify the fixed bar vs `pb-[var(--nav-bottom)]` on real devices. | The prime header space is used for a setting. Six tabs are heavy for thumbs. | High |
| 6 | Type | Bricolage 800 at huge size with -0.03em tracking is the only expressive move. Everything else is Inter 15-17px gray. There is no mid-level display, no numerals style, no mono for quoted evidence. | The "Bricolage headline + Inter body" pairing is now a common default. A scale that has only a hero and body makes screens flat. | Medium |
| 7 | Cards (`ui.ts`) | One `card` class (18px radius, hairline, shadow-1) is used for everything. | Uniform rounded cards with soft shadows are the single most repeated slop pattern. | Medium |
| 8 | Motion | Route change is a 200ms fade + 8px rise. The ring count-up (800ms) and tick fade are good. Buttons scale to 0.98 with CSS and nothing else moves. No progress-bar fill choreography, no answer-to-next-question swap, no finish moment. | Motion exists but is uniform, so nothing is "directed". The result moments (report, finish) get the same energy as a link click. | Medium |
| 9 | Home hero | Redundant eyebrow "INTERNSHIELD" above a headline on a page that already shows the logo. Three CTAs in three colors (coral pill, teal link, violet link). | Colors on the CTA row feel arbitrary instead of mapped to a place. | Medium |
| 10 | Tailor, Tracker, Profile (inferred) | These use `data-tool="neutral"` (ink) with the same card shell. Tailor's edit cards likely repeat uniform cards. | Tracker and Profile have no identity or empty-state personality. | Medium |
| 11 | Microcopy | Good bones ("Strong signs of a scam"). Weak spots: "Answer follow-up", "AI calls: 6/30", "Added: Company: Northbeam Analytics." (system-voice). | Reads like logs, not a helper. | Low-Med |

What already works and must be kept: neutral-ink dark mode with elevation by surface steps; risk always icon + words; tick-per-check ring (shape, not just color); focus rings from `--accent`; skip-on-input count-up; `useReveal` hydration-safe pattern; 44px pill targets; the warm off-white.

---

## B0. Presets evaluated (bergside/awesome-design-skills) and the ONE signature

Source: https://github.com/bergside/awesome-design-skills ; local shortlist in `devpost/design-skills/<slug>/{SKILL,DESIGN}.md`. The files are thin (fonts, palette, scale, shadow style). Used as vocabulary only.

| Preset | What it offers | Decision |
|---|---|---|
| terracotta | "warm cream surfaces, serif headlines, single terracotta accent"; cream #F3E9D8 secondary; 4px/8px radii; mono label-caps (JetBrains Mono) | TAKE: cream paper surface, one accent per screen, small 4-8px radii on sheets, mono caps labels. Our coral is already terracotta-adjacent. SKIP: DM Serif Display (keep Bricolage; it already carries the editorial voice and avoids a new font load). |
| editorial | magazine grids, 8pt baseline, mono labels | TAKE: structured asymmetric grid (B4) and 8pt baseline. SKIP: Gelasio serif and near-black primary. |
| lingo | "tactile 3D-like bottom borders (e.g., border-b-4)", bold progress, rounded, friendly illustrations; rule: "avoid mixing multiple visual metaphors" | TAKE: pressable controls with a solid bottom edge that collapses on press, chunky 8px progress, finish celebration. SKIP: Nunito, Duolingo green/purple, 3-D on every surface. |
| friendly | soft pastel tints, ample whitespace | TAKE only what we have: the existing `--*-tint` pastels as tool backgrounds. SKIP: Noto Serif, compact density. |
| paper | print-inspired, tactile surface | TAKE: grain overlay idea (B2). SKIP: Montserrat/Roboto. |
| bento, riso, storytelling, spacious, refined, expressive, impeccable | not adopted (bento = the symmetric-grid tell we are removing; riso = a second metaphor) | SKIP |

**Signature (single metaphor): "warm paper you can press."** Surfaces are flat cream paper with ruled lines; every interactive control is a physical key with a solid bottom edge that sinks on press. Nothing else is a metaphor:
- Keep: paper `--bg`, rules, mono evidence, bottom-edge buttons, chunky progress, verdict/finish stamp (a paper-print gesture, used twice per product only).
- Drop from the first draft to honour "one metaphor": rotated sticky notes on Tracker, rotated illustration offsets, hatched shadows. Tracker cards are flat sheets with the same bottom edge only when draggable.

Tactile control spec (S0, in `ui.ts` + tokens). Edge = a hard shadow, not a border, so layout does not shift:
- `--edge-depth: 4px` (3px under 640px). Primary: `bg-accent text-accent-contrast shadow-[0_var(--edge-depth)_0_var(--accent-edge)]`.
- New token `--accent-edge`, set per tool: `color-mix(in oklab, var(--tool) 62%, var(--fg))` (about 3:1 against paper in light; add to contrast rows). Secondary buttons: surface fill, `--rule` 1px, edge `--border-strong`.
- Hover: translateY(-1px), edge 5px (`dur.hover`). Press: translateY(var(--edge-depth)), edge 0 (`spring.press`; no animation for keyboard activation beyond the instant state). Disabled: flat, no edge, `opacity .5`, adjacent reason text.
- Applies to: `btnPrimary`, `btnSecondary`, pills (`pillOn/pillOff` edge 2px), tab "keys" in the Practice language selector. Does NOT apply to cards, links, inputs.
- Reduced motion: edge still renders; the sink is a 0ms state change.
- Progress (Lingo): 12px track, rounded-full, fill with a 3px lighter highlight stripe (`color-mix(--tool 70%, white)`) on the top half of the fill; fill 320ms ease-out.

## B. Visual identity: "Field notebook" (editorial, warm, a little opinionated)

Idea: InternShield is a careful friend who marks up your paperwork. Visual vocabulary comes from stamped forms, margin notes and highlighter, not from dashboards. Each tool owns a full-bleed color block. Neutral screens (Tracker, Profile) use paper plus ink navy.

### B1. Principles
1. One accent per screen. Tool color shows up as a large block (band, side panel, header strip), not only as tiny labels.
2. Asymmetry by default: 7/5 or 8/4 grids, left-aligned reading column, margin notes. No 3-equal-card rows except where content is truly 3 equal things.
3. Cards only for objects you act on (an edit, a flag, a question). Everything else is typography on the paper, separated by rules and spacing.
4. Real content as decoration. The hero is a live-looking annotated recruiter message, not a mesh gradient or abstract blob.
5. Stamps and highlighter instead of gradients. Rotated 1-2 degree stamp labels, underline-swash highlights, ruled lines.

### B2. Surfaces and texture (new tokens, S0)
Keep hex in `theme.css` (contrast script parses hex; see S0). OKLCH is the design intent; hex is what ships.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | #f7f2e8 (oklch 0.962 0.014 88) | #0d1220 (= `--bg`) | page |
| `--paper-2` | #fffdf8 (oklch 0.995 0.006 90) | #151c2e | raised sheet (replaces most `card`) |
| `--rule` | #d9d0c0 (oklch 0.87 0.02 85) | #283149 | ruled lines, dividers |
| `--grain` | inline SVG feTurbulence data-URI, opacity .04 | opacity .06 | body::before overlay, `pointer-events:none`, paper feel |
| `--coral-deep` | #8a3115 | #ffbb98 | white text on it >= 7:1 (light) |
| `--teal-deep` | #064e48 | #5fdccb | tool color block with `--on-deep` text |
| `--violet-deep` | #3b2594 | #bca9ff | same |
| `--on-deep` | #fffdf8 | #0d1220 | text on a deep block |
| `--highlight-swash` | color-mix(--tool 28%, transparent) | color-mix(--tool 35%, transparent) | marker underline behind key words |

Rules for `--paper` vs `--bg`: set `--bg` to the new value (do not rename; names are a contract). Cards remain `--surface`, but most content moves onto the paper with `border-top: 1px solid var(--rule)` separators.

The tool "deep" token is wired into the `data-tool` mechanism in S0 as `--tool-deep`, so a block is `bg-tool-deep text-on-deep`.

Radii: keep scale but stop using 18px for everything. Sheets 6px (`--radius-xs`, like a paper note with soft corners), controls pill, tool blocks 28px on one corner only (e.g. `rounded-tr-[28px]`). Mixed radii are a human-made signal.

Shadow: drop shadow-1 on resting content. Use a 1px `--rule` plus a "paper lift" (shadow-2) only for the active/draggable thing.

### B3. Type scale (S0; Bricolage axes `opsz`, `wdth`; Inter `opsz`)
Add `axes: ["opsz","wdth"]` to Bricolage in `app/layout.tsx` (supported by next/font/google for variable fonts). Use `font-variation-settings` via utility classes.

| Role | Font | Size (clamp) | Weight / axes | Tracking | Line |
|---|---|---|---|---|---|
| `display` (hero only) | Bricolage | clamp(44px, 7vw, 84px) | 800, wdth 88 (slightly condensed), opsz 96 | -0.035em | 0.98 |
| `title` | Bricolage | clamp(28px, 3.2vw, 40px) | 700, wdth 100 | -0.025em | 1.1 |
| `section` | Bricolage | 22px | 650, opsz 24 | -0.015em | 1.2 |
| `numeral` (score, counters) | Bricolage | 72-96px | 800, wdth 80, tabular via `font-variant-numeric` | -0.04em | 0.9 |
| `body` | Inter | 17px | 400, features `cv11` (single-storey a), `ss03` | 0 | 1.6 |
| `label` | Inter | 13px | 600, uppercase | 0.1em | 1.3 |
| `margin-note` | Bricolage italic is not available. Use Inter 15px, `--fg-2`, with a 2px `--tool` left rule. | | | | |
| `evidence` (quoted message text) | system mono (existing `--font-mono`) | 15px | 450 | 0 | 1.55 |

Quoted recruiter text in mono on a ruled strip reads like evidence, and gives the report a signature texture without adding a font.

### B4. Layout and rhythm
- Spacing rhythm: 4/8/12/20/32/56/96 (add `--space-*` tokens or keep Tailwind with this subset). Sections use 96 desktop / 56 mobile, inside sections 32, between related items 12. A deliberate 20 and 56 breaks the usual 16/24/32 sameness.
- Max measure: 62ch for text, 1200px shell. Left-aligned reading column; side column for notes.
- Home: split hero into 7/5. Left: headline (left-aligned, 3 lines) plus one primary CTA. Right: a live annotated message (see B5). Below: three tools as a staggered "index" (rows, not cards), each row a full-width strip with a big tool-color number tag, a one-line description, and a mini-preview that animates on hover. Replace "How it works" with one sentence plus a timeline line.
- Tool pages open with a thin color band (56-72px, `--tool-deep`) that holds the tool name in `section` type, a one-line promise, and the step counter. This is how the color becomes a place.

### B5. Illustration and iconography
- Replace the "illustration in a tinted square" with spot illustrations drawn in the stamp/marker vocabulary: 2px ink stroke, one flat tool-color fill, no rotation or hatching (single-metaphor rule, B0). Keep SVG inline in `components/illustrations/`.
- Home hero object: a recruiter message as typography, with 3 phrases highlighted by `--highlight-swash` in risk-neutral tint and numbered margin flags (1, 2, 3). On load, the highlights draw left to right, and the flag list on the right fills. This demonstrates the product in 2 seconds.
- lucide-react only: set a single stroke width (1.75 at 20px, 1.5 at 24px+), `strokeLinecap` default, and never put icons in tinted circles. Use an icon next to a label with baseline alignment, or inside a square 6px-radius chip only when it is a status (risk).
- Logo mark: keep, but make the shield mark's three tool colors appear as a 3-segment stamp. Optional.

### B6. Surfaces per screen (summary)
- Check: coral color band, input is a large "sheet" with ruled lines (textarea with `repeating-linear-gradient` of `--rule`, 28px line step), placeholder as an example in mono. Report: see B7.
- Tailor: teal band, split view paper (resume left, margin notes right). Changed lines use a left bar + tint, not a card per edit.
- Practice: violet band is persistent and holds progress. The question sits on paper as a big quote, not a boxed card. Feedback appears as a margin note.
- Tracker: ink navy neutral, Kanban columns as ruled lanes with flat sheet cards (no rotation; see B0 single-metaphor rule).
- Profile: a checklist "passport" page: stamp slots that fill in as steps complete.

### B7. Report redesign (highest impact)
Layout (desktop 8/4):
1. Left (8): verdict headline (`title`, left aligned), the single next action as a bordered "do this" strip in `--bad-tint` with icon plus words ("Do not reply or pay. Block and report."), then the message in mono with flagged phrases underlined and numbered, then evidence list ordered by weight with a horizontal bar of points.
2. Right (4, sticky): ring (smaller, 168px, `numeral` type), coverage ticks, company chip, "13 of 14 checks ran".
3. Change log ("Added/Confirmed/+/-") becomes a collapsible "What changed" panel with rows: icon (arrow up/down/equal), label, and old-to-new points. Never raw run-on text. Highlight new/removed flags inline in the list for 1.6s (see C).
Mobile: ring first (smaller), verdict, "do this", then message.
Never says "safe"; low risk text stays "No strong signs found. Still verify the company." with icon plus words.

---

## C. Motion spec

Principles drawn from the sources: UI animation under about 300ms; frequency decides amount (the more often seen, the less it animates); never animate keyboard-initiated actions; animate things that would otherwise appear abruptly; press scale-down feels responsive ([Emil Kowalski](https://emilkowal.ski/ui/you-dont-need-animations)). Springs for position/size and gestures, tween for opacity/color ([motion.dev](https://motion.dev/)). Duolingo reserves the big celebration for the end of a short session and uses a ~320ms ease-out fill on each progress increment (unverified third-party figure: [open-design.ai](https://open-design.ai/plugins/design-system-duolingo/); celebration context: [Duolingo blog](https://blog.duolingo.com/streak-milestone-design-animation)). Linear/Raycast keep motion fast and purposeful, with polish in dark elevation ([awesome-design-md](https://github.com/VoltAgent/awesome-design-md), [Linear](https://getdesign.md/linear.app/design-md), [Raycast](https://getdesign.md/raycast/design-md)).

### C1. Tokens (S0 creates `components/motion/tokens.ts`; CSS twins stay in `theme.css`)
Update `theme.css` durations to match; keep existing names (add, never rename).

| Token | Value | Use |
|---|---|---|
| `dur.press` | 90ms | button down |
| `dur.hover` | 140ms | hover bg/arrow shift |
| `dur.enter` | 220ms | element enter, tween |
| `dur.exit` | 140ms (ease-exit) | element leave (exits are faster than enters) |
| `dur.route` | 240ms | page enter |
| `dur.stagger` | 45ms/item, cap 8 items (360ms total) | lists |
| `dur.count` | 900ms | number count-up |
| `dur.ring` | 1100ms | ring arc on first reveal (500ms on re-score) |
| `dur.celebrate` | 1200ms max | finish moment |
| `ease.out` | cubic-bezier(0.22, 1, 0.36, 1) | default enter |
| `ease.inOut` | cubic-bezier(0.65, 0, 0.35, 1) | moves on screen |
| `ease.exit` | cubic-bezier(0.3, 0, 0.8, 0.15) | exits |
| `spring.press` | {type:"spring", stiffness:600, damping:35, mass:0.6} | scale 0.97 on press |
| `spring.snap` | {stiffness:500, damping:32} | tab pill, toggles, shared layoutId |
| `spring.layout` | {stiffness:380, damping:34, mass:0.9} | layout reflow (list add/remove) |
| `spring.soft` | {stiffness:240, damping:26} | cards settling, panel open |
| `spring.stamp` | {stiffness:320, damping:15, mass:0.8} | only the finish stamp and verdict stamp (a hint of overshoot) |
| `variants.rise` | {opacity 0, y 10} to {1, 0} | reveals |
| `variants.reduced` | opacity only, `dur.micro` | every reduced-motion path |

Helper API: `useMotion()` returns `{reduce, t, spring, rise(i)}` where tokens collapse to `{duration:0}` when `useReducedMotion()` is true. Replace `reveal.ts` internals with this (keep the export `useReveal`, S1 owns the file).

Global rules (S0, `globals.css`): `@media (prefers-reduced-motion: reduce)` stays. Add `scroll-behavior: smooth` only for non-reduced. `will-change` never preset. Animate `transform`/`opacity` only; ring uses `strokeDashoffset`.

### C2. Global behaviors
- **Buttons:** hover: background to `--accent-hover`, arrow icon translates 3px right (CSS, `dur.hover`). Press: scale 0.97 (`spring.press`). Loading: label swaps to a verb ("Checking...") with a 14px stroke spinner, width locked (no layout jump). Keyboard activation does not animate scale.
- **Focus:** instant ring (no transition), 2px `--accent`, offset 2px (keep). Add `focus-visible:ring` on the tool band items.
- **Route:** direction-aware. Compute index from `TABS` order; forward = enter from +14px x, back = from -14px, cross-fade 240ms `ease.out`. Content wrapper only; the nav is static. Exit: not animated (App Router unmounts), so keep it enter-only. Optional later: Next's `experimental.viewTransition` and React `<ViewTransition>` for shared-element moves ([Next docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)). The docs call it experimental and not for production, so do not depend on it now.
- **Nav tab indicator:** already `layoutId`; switch the transition to `spring.snap`. Add the mobile indicator as a 3px top bar that slides (already present) plus an icon scale pop 1.0 to 1.12 to 1.0 on activation (`spring.snap`).
- **Skeleton and loading with purpose:** skeletons mimic final shape (verdict line, 3 flag rows, ring placeholder as a dashed circle). A single 1.4s shimmer using `background-position` only on skeleton, never on text. Streaming states say what is happening ("Reading the message", "Checking the sender", "Weighing the evidence"), cycled as the real steps finish (checklist with ticks; each tick = `spring.snap` pop).
- **Toasts / undo:** slide up 12px + fade (`dur.enter`), exit `dur.exit`. Duration 6s, hover pauses.

### C3. Check
- Input: textarea border color transition 140ms on focus; character counter appears after 200 chars. Paste detection: on paste, ruled lines "settle" (opacity .5 to 1, 200ms) and the primary button gently rises (`variants.rise`) with the text "Check this message".
- Submit: the sheet shrinks to a 72px "message strip" (layout animation, `spring.layout`) while the report area opens below. Checklist items tick one by one as real steps finish.
- **Report choreography (total about 1.6s; click/keypress skips to end, existing behavior):**
  1. 0ms: ticks sweep clockwise (20ms stagger, already exists; increase length easing).
  2. 100ms: arc fills with `dur.ring`; score counts up with `dur.count` (tabular, `numeral`). Add subtle ring color shift from `--border-strong` to level color at 60% progress.
  3. 900ms: verdict word "stamps" in (scale 1.06 to 1 with `spring.stamp`, rotation -1.5 degrees settle, only for high/medium; low uses plain `rise`).
  4. 1000ms+: "do this" strip slides in from left (`dur.enter`), then flags in the message underline-draw (scaleX 0 to 1, 220ms each, 70ms stagger), then evidence rows rise (`dur.stagger`).
  5. Hover a flag in the list: the matching phrase in the message gets a `--highlight-swash` pulse (140ms) and scrolls into view (smooth, reduced: instant).
- **Re-score after "Add information":** ring arc animates from old to new (500ms), delta chip pops in (`spring.snap`). Changed evidence rows get a 1.6s tint pulse (`--tool-tint` to transparent) plus an inline arrow icon (up/down) and text ("+40 points"). Removed flags collapse (`AnimatePresence mode="popLayout"`, `dur.exit`, height auto via layout).
- **Impact card diff:** show "Before 60 to After 100" as two numerals, with the new number counting up and the difference highlighted. Use real arrow icons, not "+/-" glyph strings.
- Primary "Check this message" key sinks 4px on press (B0), then the sheet collapses.
- Reduced motion: no sweep, no stamp, no pulse; numbers set instantly; rows cross-fade 120ms; delta chip appears with opacity only.

### C4. Tailor
- Plan panel to edit list: edits rise with `dur.stagger`. Accept/Reject: button press, card collapses to a 36px summary line (`spring.layout`), accepted line gets a left bar in `--tool` that draws top to bottom (220ms).
- **Changed-line glow:** when an edit is accepted, the corresponding resume line gets `--tool-tint` background fading over 1.6s plus a 2px left bar. Scrolls into view smoothly (instant under reduced motion).
- Undo toast after reject/accept (6s) with "Undo" button focusable via keyboard shortcut Z.
- Progress: "3 of 7 reviewed" with a segmented bar, each segment fills 320ms.
- Loading: resume skeleton lines (varied widths), then lines "type in" only for the first change (not for all; frequency rule).

### C5. Practice
- Progress bar: 8px high segmented; the active segment's fill animates 320ms `ease.out` when a question is answered. Completed segments have a check tick drawn (stroke-dashoffset, 200ms).
- Question swap: old question card exits (x -12, opacity 0, `dur.exit`), new one enters (x +16 to 0, `spring.soft`). Use `AnimatePresence mode="wait"` keyed by question id.
- Feedback panel: opens with `spring.soft` height reveal; "What worked" and "Try this next" stagger (70ms). Typing/loading uses three pulsing dots for exactly the AI wait time and a literal message ("Reading your answer").
- Code run: "Run examples" shows inline pass/fail rows (icon plus words), each row rising by 45ms. Submit button state: Submit to "Submitted" with check, 200ms.
- **Finish celebration (<= 1.2s):** a violet-deep full-width panel slides up, the score numeral counts up 900ms, a stamp ("Session done") lands with `spring.stamp`, and 12-16 small SVG confetti pieces (squares/triangles in tool tints) burst once (opacity and transform only, 900ms, then removed from the DOM). No sound. Respect reduced motion: static panel, no confetti. Do not play again on revisit (store a flag).
- Timer, if any: no animation beyond the number.

### C6. Home, Tracker, Profile
- Home hero: the annotated message's highlights draw one by one (220ms each, 140ms stagger, starts 300ms after paint, once per session). Tool rows: on hover, row background shifts to `--tool-tint`, number tag slides 4px, arrow slides 3px. Scroll-linked: rows reveal when 30% in view (`whileInView` once, `variants.rise`).
- Tracker: card move between lanes is a layout animation with `spring.layout`, drag handle cursor, drop target ruled lane tints (140ms). Add-card: new card enters at top with a tint pulse. Status change: stamp on the card (`spring.stamp` once).
- Profile: when a step completes, the stamp slot fills (scale 1.2 to 1, `spring.stamp`) and the avatar ring arc animates (existing SVG) with `dur.enter`.

---

## D. Interaction improvements (ease of use)

Cross-cutting
- Persist everything in progress (already stated for Practice). Say it plainly once: "Saved on this device". Remove "AI calls: 6/30" from the main flow and show "6 of 30 AI checks left today" only in Profile and when under 5 left.
- Keyboard: Cmd/Ctrl+Enter submits in Check and Practice (hint shown in the button tooltip). `g c`, `g t`, `g p` go-to shortcuts are optional (S1). Never animate keyboard-initiated actions beyond the focus move.
- Undo over confirm: use toast undo for delete/skip/reject; keep confirm only for "End session".
- Empty states use the pattern "what this is, why empty, how to start" ([UX copy skill pattern]): a small spot illustration, one sentence, one button. Tracker empty: "Nothing tracked yet. Save a job from Tailor or Check to follow it here."
- Mobile thumb reach: primary actions sit in a sticky bottom action bar above the tab bar (`bottom: var(--nav-bottom)`) with 56px height; secondary actions (skip, hint) in an overflow "More" menu to the right of the primary, not stacked below. Header: show wordmark, move theme toggle into Profile (keep a single-icon toggle on desktop); this frees width for the tool name and step counter.
- Mobile tab bar: reduce from six to five. Merge Profile into the header avatar (already there) and keep Home, Check, Tailor, Practice, Tracker. Label size 12px. Active tab shows the tool color block behind the icon.
- Progressive disclosure: the report shows verdict, action, top 3 flags. "All 14 checks" and "What changed" collapse by default; the expanded state persists for the session.

Per screen
- **Home:** one primary CTA ("Check a message"). Secondary tools become the index rows. Add a "Paste from clipboard" button in Check's input header (uses `navigator.clipboard.readText` on user click only).
- **Check input:** example chips ("Try an example") fill the sheet; counter and a "Clear" button; the submit button label states the object ("Check this message"). Errors: what happened + why + fix ("We couldn't read that screenshot. The text was too small. Try a closer crop or paste the text."). Disabled button gets an adjacent reason ("Paste at least a few lines").
- **Report:** copy/share report button visible near the verdict; "Add information" is a focused panel with 3 smart prompts ("Company name", "Sender email", "Link in the message") instead of a blank form; saving it shows the diff (C3).
- **Tailor:** keyboard: J/K next/previous edit, A accept, R reject (documented under a "?" popover). "Accept all safe edits" with preview count. The resume preview keeps scroll position when an edit is accepted.
- **Practice setup:** setup is a 3-step single screen (role, rounds, length) with a live summary strip ("5 questions, about 20 minutes"). Persisted selections. Coding view: group actions as `[Run examples] [Submit]` left and `[Hint] [Skip]` as quiet text buttons on the right of the same row; "Finish" only appears after submit (not a disabled orphan); hint on the right side of the editor header. Editor gets min-height 320px and a mono, ruled, tinted gutter.
- **Practice summary:** score numeral, 3 strengths, 3 next steps, "Practice weak area" button that pre-selects the weak round; share nothing by default.
- **Tracker:** inline status select (keyboard accessible, 44px), sort by "next step date", empty lanes show a ghost card with helper text. Undo on delete.
- **Profile:** the profile is a checklist with time estimates ("2 min") and a visible "why we ask" line; each completed step shows what unlocked.

---

## E. Accessibility review (WCAG 2.1 AA; design:accessibility-review checklist)

Existing guard: `tests/shared/v3-theme.test.ts` checks text >= 4.5:1 and UI marks >= 3:1 using `qa/v3-contrast.mjs`. Every new token pair below must be added to `rows` in that script by S0 before use.

| Item | Check | Result / action |
|---|---|---|
| Tool color on tint (light) | `--coral-strong` #b0401c on `--coral-tint` #ffefe8 | about 5.4:1, passes as text. `--teal-strong` #0a6760 on #e2f4f1 about 5.5:1 passes. `--violet-strong` #5838e0 on #efebff about 5.9:1 passes. Re-run after any change. |
| Tool fill + on-color | `--on-coral` #3a1306 on #ea5a31 about 4.8:1 passes; `--on-teal` white on #0d7d74 about 5.0:1 passes; white on `--violet` #6b4eff about 5.1:1 passes | Keep. Any new `--*-deep` blocks use white-ish `--on-deep`; all >= 7:1 by construction (verify). |
| Text on paper | `--fg-3` #6b655d on new `--bg` #f7f2e8 | about 4.9:1; do not darken the paper further or this drops below 4.5. Re-verify. |
| Rule/borders | `--rule` is decorative only; interactive field edges keep `--border-strong` (>= 3:1) | Do not use `--rule` as the only boundary of an input. |
| Grain overlay | `pointer-events:none`, `aria-hidden`, opacity <= .06 | Must not reduce text contrast under 4.5. Test with the contrast script on `--bg` blended with 6% noise (worst case). |
| Highlight swash | text sits on a 28% tool tint | Text must stay `--fg` (not tool color) over swash. Check `--fg` on swash >= 7:1. |
| Risk colors | red/amber/green only on risk results with icon + words; never rely on color alone | Keep; the 14 ticks use length as well as color. Verdict stamp keeps the icon. |
| Focus | 2px `--accent` ring offset 2px | Tool coral on paper: `--coral` #ea5a31 on #f7f2e8 about 3.0:1, borderline for non-text 3:1. On coral pages use `--coral-strong` for the ring (`--accent-fg`) or a double ring (inner `--bg`). S0 decides and tests. |
| Touch targets | 44x44 CSS px min | Current pills ok. New: tab icons, icon-only buttons (theme, copy, undo), sticky bar buttons 48px+. Gap >= 8px. |
| Motion | `prefers-reduced-motion` handled globally and by `useReducedMotion`; no autoplay > 5s; confetti, stamp, pulse, glow all have static equivalents | Add a test that the motion tokens collapse to 0 when reduced. No flashing > 3/s. |
| Live regions | Ring has `role="img"` + `aria-label`; delta uses `role="status"`; streaming steps need `aria-live="polite"` with the current step only | Do not re-announce count-up values; the announce text is the settled score. |
| Keyboard | All shortcuts must be single-key only when not in a text field, with a visible help affordance, and must not conflict with screen reader keys | Add "Shortcuts" popover reachable by `?` and by button. |
| Screen reader names | Tab bar `aria-current`; icon-only buttons need `aria-label`; reordered visual content (side column) must keep logical DOM order (verdict first) | Verify. |
| Zoom/reflow | 8/4 layouts collapse to one column at <= 1023px; verify 200% zoom and 320px width, no horizontal scroll | Add to QA. |
| Forms | Labels visible, errors with `aria-describedby`, error text is "what + why + fix" | Keep. Error color: not color alone (icon). |
| Dark mode | `--paper` dark = existing navy; tool "deep" tokens swap to light tints in dark | Contrast rows for dark must exist for each new token. |

---

## F. Implementation slicing (4 slices with disjoint ownership)

Order: S0 lands first (tokens and helpers, backwards compatible). S1-S4 then run in parallel. No slice edits another slice's files. Shared contracts: never rename existing token names or the data attributes used by tests (`data-tick`, `data-score`, `data-delta`, `data-start-dot`, `data-tool`). New tokens are additive.

### S0 Foundation (owner: `app/theme.css`, `app/globals.css`, `app/layout.tsx`, `components/ui.ts`, new `components/motion/tokens.ts`, new `components/motion/useMotion.ts`, `qa/v3-contrast.mjs`, `tests/shared/v3-theme.test.ts`)
Changes
1. `theme.css`: add B2 tokens (paper/rule/grain/deep/on-deep/swash) with light and dark values; add `--tool-deep` and `--on-deep` into each `[data-tool]` block; update `--bg` to the paper value; add `--space-*` rhythm if used; update motion tokens to C1 (additive); add `--font-mono` use. Keep hex (parser) and add comment with the oklch intent.
2. `globals.css`: `@theme inline` mapping for the new colors (`bg-paper-2`, `bg-tool-deep`, `text-on-deep`, `border-rule`), new type utilities (`text-display`, `text-title`, `text-section`, `text-numeral`, `text-label`, `text-evidence`) with font variation settings; `body::before` grain overlay; `::selection` in tool color; `.swash` utility (marker underline using `--highlight-swash`); `.ruled` utility (ruled-lines background); skeleton shimmer keyframe; focus ring rule updated per section E.
3. `layout.tsx`: Bricolage `axes: ["opsz","wdth"]`; Inter feature settings (`cv11`, `ss03`) via CSS.
4. `ui.ts`: keep every export name (other slices import them). Re-skin: `card` becomes the "sheet" (6px radius, 1px `--rule`, no resting shadow); add `cardInteractive` hover as border + 2px lift only; add exports `sheet`, `band`, `stampLabel`, `noteLeft`, `btnQuiet`, `btnPrimary` with arrow hover class (`group` + `group-hover:translate-x-[3px]` for icons). Do not break `max-sm:w-full` behavior unless the sticky bar pattern replaces it (S1-S4 may opt out via a new `btnInline`).
4a. Tactile controls per B0: add `--accent-edge`, `--edge-depth` tokens (light and dark), rework `btn*`/`pill*` class strings (bottom-edge shadow, hover lift, press sink); chunky progress class `progressTrack`/`progressFill`; contrast rows for `--accent-edge` vs `--bg` (>= 3:1) in both themes. Slices consume these classes and never hand-roll edges.
4b. `components/motion/tokens.ts`: all C1 tokens as typed consts; `useMotion.ts`: hook that collapses to zero under `useReducedMotion`.
5. Contrast script/test: add rows for every new text/background and the focus-ring pair; add a test that tokens exist in both `:root` and `.dark`.
Tests/QA that must keep passing: `tests/shared/v3-theme.test.ts` (no hex in components, contrast), `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npm run build`. Screenshot light and dark of Home to ensure nothing regressed from the `--bg` change (the existing app should look the same except for the warmer paper).

### S1 Home, shell, profile, tracker (owner: `components/home/**`, `components/shell/**`, `components/profile/**`, `components/ProfileSteps.tsx`, `components/illustrations/**`, `components/tiers/Tracker*.tsx`, `components/Logo.tsx`, `components/ThemeToggle.tsx`, `components/icons.tsx`, `app/page.tsx`, `app/profile/page.tsx`, `app/tracker/page.tsx`, `app/v3-shell.css`)
Changes
1. Home per B4/B5: 7/5 hero with annotated message and flag list animation; tools as index rows; remove mesh, eyebrow, 3 numbered circles; single primary CTA; one-sentence "how it works" with a timeline line.
2. Nav: desktop pill indicator on `spring.snap`; mobile five tabs (Profile via avatar), 12px labels, icon pop; wordmark visible on mobile; theme toggle becomes single icon on mobile (3-way menu in Profile); verify bottom bar vs content padding (image3 artifact).
3. `PageTransition.tsx`/`reveal.ts`: direction-aware route slide; `useReveal` uses motion tokens; keep first-load no-animation guarantee and the hydration-safe pattern.
4. Profile: passport checklist with stamp fill animation, "why we ask" lines, time estimates.
5. Tracker: ruled lanes, layout animation (`spring.layout`), inline status select, ghost empty lanes, undo toast, empty-state copy.
6. New spot illustrations in the stamp/marker style (inline SVG; tokens only).
Tests/QA: existing shell/home/profile/tracker vitest suites; `qa/v3-*.mjs` shell scripts; keyboard tab order; 320px, 768px and 1280px screenshots light + dark; reduced-motion check (no hidden first frame).

### S2 Check input + report (owner: `components/CheckForm.tsx`, `components/Checklist.tsx`, `components/report/**`, `components/interview/IntelCard.tsx` only if shared with report (otherwise leave), `app/check/page.tsx`, `app/v2-check.css`)
Changes
1. CheckForm: ruled "sheet" textarea, example chips, clipboard button, Cmd/Ctrl+Enter, counter, specific button label and disabled reason, error copy per D.
2. Checklist: streaming step list with real step names and tick pops; `aria-live` current step only.
3. Report: 8/4 layout (B7); ring smaller (168px) with `text-numeral`; "do this" strip; annotated message in mono with numbered underlines; evidence ordered with points bars; collapsible "What changed" panel built from existing `deltaLabel`/`deltaAnnouncement` data, rendered as rows with arrow icons (no raw "+/-" text); impact card shows before/after numerals; hover link between flag list and phrase.
4. Motion C3 choreography with click/keypress skip preserved; keep `data-tick`, `data-score`, `data-delta`, `data-start-dot`.
5. Copy pass: verbs, human voice ("We found 3 signs of a scam", "No strong signs found. Still check the company."), never "safe".
Tests/QA: report/ring vitest suites, `npm run eval` (88/88, held-out >= 24/27; do not touch `lib/scoring`), RiskRing a11y name/live-region tests, screenshots of high/medium/low/skipped-check reports at 3 widths, light + dark; reduced-motion run.

### S3 Tailor / resume (owner: `components/tiers/ResumeTailor.tsx`, `components/tiers/ResumeTailorPage.tsx`, `components/tiers/SaveToTracker.tsx`, `components/tiers/ScreenshotUpload.tsx`, `components/resume/**`, `app/tailor/page.tsx`, `app/v3-resume.css`)
Changes
1. Teal band header with step counter; split view paper (resume left, margin notes right); edits as list rows with a left bar rather than a card each.
2. Accept/reject with collapse to summary line, changed-line glow (C4), undo toast, keyboard J/K/A/R with shortcuts popover.
3. "Accept all safe edits" with count preview; progress segments.
4. Skeleton for resume; loading copy per D; error copy per D.
5. Upload dropzone: dashed ruled box, drag state tint, keyboard activatable, file name chip with remove (undo).
Tests/QA: resume vitest suites, DOM/PDF preview unchanged semantically, screenshot comparisons at 3 widths, reduced-motion check, keyboard-only pass through all edits.

### S4 Practice (owner: `components/interview/**`, `components/tiers/interview/**`, `components/tiers/PracticePage` if present, `app/practice/page.tsx`)
Changes
1. Violet band holding title, progress, "End session" as a quiet text button; progress bar 8px with fill and tick (C5); counters ("Live coding 1 of 2") as readable 14px chips.
2. Question as large quote on paper; feedback as margin note; follow-up as a tinted panel with the primary action inline.
3. Coding round: grouped action row, hint and skip as quiet buttons, "Finish" appears after submit, editor with min-height and ruled gutter; run results rows with icons.
4. Question swap choreography; feedback open; AI-wait copy.
5. Summary: finish celebration (C5), score numeral, strengths and next steps, "Practice weak area".
6. Remove "AI calls: x/30" from the main flow; show only when <= 5 left in plain words.
7. Setup: single-screen 3-step with live summary.
Tests/QA: interview vitest suites (Setup/Runner/Summary/CodeEditor), keyboard in CodeEditor ("Press Esc then Tab" hint stays), mobile screenshot of coding round (sticky action bar above tab bar), reduced-motion (no confetti), persistence on reload.

### Cross-slice done criteria
- All gates in CLAUDE.md pass: `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npm run build`, `npm run eval`.
- A screenshot per screen (light and dark, 390 and 1280 widths) that the implementer has actually looked at; the Home and Report must pass this check: "if the logo is covered, does it still look like InternShield?" (tool color block plus mono evidence plus stamp).
- No new dependencies, no hex in `components/**`, no emoji icons, no purple-blue gradient, no 3-equal-card row on Home.

---

## Sources
- awesome-design-md index (structure of DESIGN.md: atmosphere, palette, type, components, depth, do/don't): https://github.com/VoltAgent/awesome-design-md ; Linear https://getdesign.md/linear.app/design-md ; Notion https://getdesign.md/notion/design-md ("warm minimalism, serif headings, soft surfaces") ; Raycast https://getdesign.md/raycast/design-md ; Cursor https://getdesign.md/cursor/design-md ; Vercel https://getdesign.md/vercel/design-md (the pages are summaries; full DESIGN.md via `npx getdesign@latest add <name>`).
- Anti-slop: https://vibecodekit.dev/ai-slop-design , https://gradientdeck.com/blog/anti-slop-design-with-gradientdeck , https://github.com/funboy322/avoid-ai-design , https://ui-ux-pro-max-skill.com/blog/avoiding-ai-slop/
- Animation principles: https://emilkowal.ski/ui/you-dont-need-animations (under 300ms, frequency rule, no animation for keyboard actions, press scale) ; course topics https://animations.dev
- Motion library (layoutId shared elements, `AnimatePresence` modes incl. popLayout, springs, `useReducedMotion`, scroll-linked): https://motion.dev/ and https://www.mintlify.com/motiondivision/motion/guides/layout-transitions
- View Transitions in Next: https://nextjs.org/docs/app/guides/view-transitions and https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition (experimental, not production-recommended).
- Duolingo: https://blog.duolingo.com/streak-milestone-design-animation ; progress/celebration patterns https://60fpsdesign.substack.com/p/fun-in-every-frame , https://screensdesign.com/articles/duolingo-onboarding-design/
- Not retrieved (searches returned nothing relevant): Rauno Freiberg "Devouring Details" and Josh Comeau button articles. Principles attributed to them are not asserted here. Search again if the team wants to cite them.
