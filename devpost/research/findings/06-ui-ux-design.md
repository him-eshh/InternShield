# Findings 06: UI/UX and visual design

*Research for brief 06, InternShield. Prepared Thu Oct 22, 2026 (ET). Covers every question in brief section 5 (numbered Q1–Q10 below), plus the section 6 deliverables: one recommended direction, a token sheet, motion tokens, a screen-by-screen change list, pitfalls, and a 3–4 day plan for the Mon Oct 26, 5 PM ET deadline.*

*Sources: every link below was checked on Oct 22, 2026 (HTTP 200, or a bot-block 403 on a real site, marked). The color hex and OKLCH values and the contrast ratios were calculated with a script (WCAG 2.x relative luminance), not estimated. Nothing here needs a paid service. The licensing flags are in §15.*

---

## 0. TL;DR

1. **The UI isn't generic because of the colors.** It's generic because every screen has the same structure: a centered column, the same h1, pills, and bordered cards. The one moment that's actually distinctive (the evidence quoted from the user's own message) gets no visual treatment of its own.
2. **Recommended direction: "Calm Instrument" (Direction A).** It's Apple calm, made precise like a lab report. Neutrals have a slight blue tint. There's one blue, `#2466c3` / `#6ea0e8`. The type is the system font or Inter with optical sizing, plus tabular numbers. There are two signature elements: a **ring that also shows coverage** (14 tick marks around the risk arc) and an **annotated-message view** where the verified quotes light up inside the user's own pasted text. Those two make it look built for this product rather than taken from a template.
3. **Motion: use Motion (`motion/react`) with `LazyMotion` and `m`**, which adds about 5 KB at first render plus 24 KB (`domAnimation`) or 38 KB (`domMax`, which adds layout animations), lazy-loaded. Add `<MotionConfig reducedMotion="user">`. Plain CSS stays for hovers and presses. React's `<ViewTransition>` works in Next 16 with no config. It's optional for screen changes and fine to leave until after the hackathon.
4. **Fix before anything else: the scroll-reveal hides evidence.** In nearly every full-page capture (`full/03`, `06`, `08`, `11`, `verify/verify-report-scam-1440-light`, `-390-dark`), the Sender, Message and Offer groups show as **large blank areas**. The cards stay at opacity 0 until they intersect the viewport. A judge who scrolls fast, a print, or a screenshot all see empty space. The fix: render the cards visible, and animate only the elements above the fold on first mount.
5. **What makes it look hand-crafted:** one signature visualization, real typographic details (`tabular-nums`, `text-wrap: balance`, curly quotes, optical sizes), deliberate layout widths per screen (the coding screen gets a split pane), motion choreographed for **one** hero moment and nearly none elsewhere, and copy with a voice. See the checklist in §9.

---

## 1. What the screenshots show (critique with citations)

| # | Screenshot | Observation | Why it matters |
|---|---|---|---|
| S1 | `full/01-intro`, `fix/compare/08-copy-shorter-intro` | The faint 12% ring sits behind the headline. The privacy paragraph crosses the bottom of the ring stroke. The screen never shows *what you get*. | The ring reads as decoration rather than a product preview. Text crossing a stroke looks accidental. |
| S2 | `full/02-check-page` | Five stacked form regions: textarea, sender and company, two pill groups, and a **pre-disabled pale "Check it"** button that looks broken. Sender and Company are empty boxes before anything has been pasted. | It looks like a form, not a tool. Vercel's guidelines say not to pre-disable submit ([Forms › "Don't pre-disable submit"](https://vercel.com/design/guidelines)). The auto-filled fields could stay hidden until there's something to show. |
| S3 | `full/03`, `06`, `08`, `11`, `verify/verify-report-scam-1440-light`, `-390-dark` | The **evidence groups render as empty space**: only the headers "Sender · 1 red flag", "Message · 2 red flags" and "Offer · 4 red flags" are visible, with roughly 200–400 px of blank space under each. | This is the core proof, and it's invisible until intersection. It's the most serious visual defect. |
| S4 | `full/06-example-real-report`, `full/11-live-report-after-answer` | Risk 0 is drawn as an **empty grey track**, so the "good" result looks like "no data" or "still loading". "RISK" and "0" are small (about 11 px and 20 px) inside a ring roughly 190 px across. | The hero moment has no weight. The good-news state has no shape. |
| S5 | `full/03`, `verify/verify-report-scam-1440-light` | Quotes in the explanation are highlighted with an **accent-blue tint**, the same blue as links and buttons. | Blue should mean "interactive". Quotes need their own marker style, and it should match the annotated-message view. |
| S6 | `full/06`, `full/11` (footer) | Five or six centered pill buttons wrap across three rows: Copy, Save, Tailor, Practice, Check another, plus two links. | Button soup. There's no clear next step, and it looks like a dashboard. |
| S7 | `full/09`, `full/10`, `full/11` (quick questions) | A grey card with an info icon and six pills. After you answer, "Thanks, your answer didn't change the score." shows as plain grey text, and the ring doesn't react visibly. | A chance for a live, causal animation (score moves, with a delta chip) is lost. |
| S8 | `full/14`, `full/15` (tailor) | One long page. The labels in the options card are about 12–13 px. The suggestion uses **inline strike-through mixed with insertions** ("~~Cleaned and charted~~ Analyzed … ~~find~~ identify peak ~~hours~~ hours, cleaning…"), which is hard to read. Download PDF sits at the very bottom. | The diff is the product here, and it needs a clearer layout. |
| S9 | `full/16`, `full/16b` (interview setup, dark) | Rounds are small pills with a one-line description. In dark mode, **empty inputs are nearly invisible**: border `#2c2c31` on `#111113` is about 1.3:1. | Picking a round should feel like choosing an experience. Inputs need a visible fill or edge. |
| S10 | `full/19-live-coding-in-progress` | The editor is squeezed into the roughly 380 px column, so the JS line is scrolled sideways (`…ords(s) { return s.trim()…`, with the start cut off). "6 of 6 hidden tests passed" appears **twice**. | Coding needs a wide layout. Duplicated status looks unfinished. |
| S11 | `verify/verify-coding-python-1440-dark` | In the dark syntax theme the keyword and function-name colors (dark purple and navy) almost **disappear** on the dark editor background. It also brings purple into the palette. | This is a contrast failure (WCAG 1.4.3) and a taste violation. |
| S12 | `full/20-system-design`, `full/24-design-challenge` | The board nodes are tiny (about 9–10 px labels) in a big empty canvas. "Boxes / Arrows" repeats the board as a text list. | The canvas feels like a placeholder. |
| S13 | `full/18`, `full/22` (feedback) | A wall of text. The most useful verdict, "Checked by code: … – missing" (22), is buried in the middle as small grey chips. There's no at-a-glance summary. | There's no sense of how well the user did. |
| S14 | `full/13-tracker` | The **content's left edge (about x=160) doesn't line up with the header logo (about x=190)**. "None yet." is the whole empty state. Each card has three pill buttons. | A misalignment like this is a classic "template" tell. The empty states are bare. |
| S15 | All dark shots (`full/08`, `13b`, `16b`, `verify/*-dark`) | A neutral inversion: grey-black with no hue, and cards barely lift off the page. | This matches the self-critique that "dark mode has no character". |

What already works: the calm white space, the big confident h1, the restrained color, the icons that go with every result color, the verbatim quotes, the "9 of 14 checks ran" honesty, and the mobile layouts (`10b`, `13b`) that reflow cleanly. **Keep all of it.**

---

## 2. Q1: Design directions

All three stay within the hard constraints: system font or Inter, one soft blue, green, amber and red for results only, no gradients or glass. Contrast ratios are calculated against the page background.

### Direction A: "Calm Instrument" (recommended)
**Mood:** an Apple product page crossed with a well-made lab report. It's quiet and exact, and every number means something. The feel is "a careful instrument looked at this for you." References: Apple Privacy pages, Linear, Vercel/Geist, the Lighthouse report.

- **Type:** `system-ui, -apple-system, "SF Pro Text", InterVariable`. Turn on Inter's **opsz axis** (`next/font/google` `Inter({ subsets:['latin'], axes: ['opsz'] })` and `font-optical-sizing: auto`) so headlines get the tighter Display cut automatically ([Inter 4: opsz 14–32](https://rsms.me/inter/), [Google Fonts opsz](https://fonts.google.com/knowledge/glossary/optical_size_axis)). Numbers use `font-variant-numeric: tabular-nums`. Optionally use **Geist Mono** or **SF Mono** (OFL / system) only for the small "checked by code" and "verbatim" stamps.
- **Color (light / dark):** neutrals with a slight blue tint, hue about 258 (similar to Radix Slate), so dark mode has character.

| Token | Light | OKLCH | Dark | OKLCH | Contrast (L / D) |
|---|---|---|---|---|---|
| `--bg` | `#ffffff` | 100% 0 0 | `#0e1013` | 17.2% .007 258 | n/a |
| `--bg-subtle` | `#f6f7f9` | 97.6% .003 265 | `#13161a` | 19.9% .009 256 | n/a |
| `--surface` (card) | `#ffffff` | n/a | `#171a1f` | 21.7% .011 261 | n/a |
| `--sunken` (inputs, wells) | `#f1f3f6` | 96.3% .005 258 | `#1d2127` | n/a | n/a |
| `--border` | `#e3e6eb` | 92.4% .008 261 | `#272c33` | 29.1% .015 257 | n/a |
| `--border-strong` (inputs, hover) | `#c5cad3` | 83.8% .014 262 | `#3d444f` | 38.5% .021 259 | n/a |
| `--text` | `#14171c` | 20.4% .011 261 | `#eceef2` | 94.9% .006 265 | 17.96 / 16.40 |
| `--text-2` (muted) | `#555c68` | 47.3% .021 261 | `#a4abb6` | 73.9% .018 259 | 6.74 / 8.24 |
| `--text-3` (meta; on bg only) | `#6c737f` | 55.4% .020 261 | `#868e9a` | 64.4% .020 258 | 4.78 / 5.76 |
| `--accent` (solid, focus) | `#2466c3` | 52.1% .160 258 | `#6ea0e8` | 70.1% .119 257 | white on it 5.58 / dark bg on it 7.13 |
| `--accent-text` (links) | `#2460b7` | 49.9% .151 258 | `#8fb9f7` | 77.9% .100 258 | 6.12 / 9.48 |
| `--accent-tint` (selected) | `#e3f0ff` | 95.0% .025 252 | `#152235` | 25.0% .041 258 | accent-text on it 5.30 / 7.96 |
| `--good` | `#1d7a4c` | 51.5% .112 157 | `#5bbf8a` | 73.0% .123 158 | 5.33 / 8.41 |
| `--good-tint` | `#e6f4ec` | 95.5% .018 161 | `#12271c` | 25.1% .035 160 | good on tint 4.70 / 6.95 |
| `--warn` | `#95590a` | 52.1% .113 65 | `#e3a94f` | 77.2% .126 76 | 5.66 / 9.12 |
| `--warn-tint` | `#fcf1df` | 96.2% .027 80 | `#2a200f` | 25.1% .032 80 | 5.06 / 7.66 |
| `--bad` | `#bf3a2b` | 54.3% .172 30 | `#f0857a` | 73.1% .133 27 | 5.45 / 7.57 |
| `--bad-tint` | `#fcebe8` | 95.3% .019 30 | `#2d1614` | 23.2% .038 26 | 4.72 / 6.75 |

A full 12-step accent ramp in Radix step semantics ([Radix: understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale): 1–2 backgrounds, 3–5 component states, 6–8 borders, 9–10 solids, 11–12 text), hue 258:
- light 1 `#f9fcff` · 2 `#f2f7ff` · 3 `#e3f0ff` · 4 `#d2e6ff` · 5 `#c1dbff` · 6 `#adcdfc` · 7 `#94b9f1` · 8 `#6ea0e8` · **9 `#2466c3`** · 10 `#1657af` · 11 `#2460b7` · 12 `#0c2c5a`
- dark 1 `#0b1016` · 2 `#10161f` · 3 `#152235` · 4 `#172b49` · 5 `#1d3559` · 6 `#26426c` · 7 `#345687` · 8 `#4772b1` · **9 `#6ea0e8`** · 10 `#82b0f3` · 11 `#8fb9f7` · 12 `#dce9fc`

Further notes on Direction A:
- **Radii (nested and concentric):** 6 (tags, inputs inside cards) · 10 (inputs, small cards) · 14 (cards; down from 18) · 20 (hero panels) · pill (buttons and chips only). Vercel's rule is "child radius ≤ parent radius".
- **Shadows (layered, very soft; light mode only, dark mode uses lighter surfaces and hairlines instead):**
  - `--shadow-1: 0 1px 0 rgb(20 23 28 / .04), 0 1px 2px rgb(20 23 28 / .06)` (resting card)
  - `--shadow-2: 0 1px 2px rgb(20 23 28 / .06), 0 4px 12px -2px rgb(20 23 28 / .08)` (hovered or raised card, popover)
  - `--shadow-3: 0 2px 4px rgb(20 23 28 / .06), 0 12px 32px -8px rgb(20 23 28 / .14)` (toast, sheet)

  This follows Vercel: "Layered shadows: mimic ambient + direct light with at least two layers" plus "Crisp borders: combine borders & shadows".
- **Spacing:** a 4 pt base. The scale is 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96. Vertical rhythm inside a section is 16 or 24, between sections 56, and from the hero to the content 72.
- **Widths per screen** (deliberate, not one column for everything): forms 600 · report text 680, inside an 880 hero zone · tracker 1040 · **coding and boards 1200 split pane** · intro 1040, asymmetric.
- **Icons:** keep the custom set, but redraw it on one grid: 24 px, 1.75 px stroke, round caps, so it matches Inter's stroke weight. If more icons are needed, use **Lucide** (ISC, [lucide.dev](https://lucide.dev/)) because its style matches. Never put icons in rounded-square "feature tiles".
- **Illustration:** none. The only "illustration" is the product itself: the ring, the annotated message, and the tick marks.
- **Ring and evidence:**
  - Ring: 180 px with a 10 px stroke, plus an outer ring of 14 small tick marks for *coverage* (filled for checks that ran, hollow for ones that couldn't). The number is 56 px semibold in tabular figures.
  - Evidence cards: sorted by severity, with a 3 px left rule in the result color, a severity shape icon, a title, and an **upright** quote in curly quotes with a superscript number that links into the annotated message.

**Why A:** It turns InternShield's real differentiator (deterministic, checkable evidence) into the visual identity. It's the easiest to build in Tailwind 4 because it's mostly token changes plus two components. It also reads as trustworthy to stressed students and to career-center staff.

### Direction B: "Editorial Calm"
**Mood:** a well-set magazine explainer, like Apple Newsroom or Stripe Press. It's warmer and more human, and reads like a counselor's note more than a scanner.
- **Type:** Inter or the system font for the UI, plus **Newsreader** (OFL, [Google Fonts](https://fonts.google.com/specimen/Newsreader)) *only* for the level label ("Strong signs of a scam") and the explanation paragraph, at 19–20 px with 1.55 line height. Pairing a serif with a sans this way is the most reliable way to stop looking like a template.
- **Color:**
  - Light: bg `#fbfaf8`, subtle `#f4f2ee`, border `#e6e2db`, text `#1a1917` (16.8:1), muted `#5c5852` (6.77), accent ink-blue `#2b5ea7` (6.17; white on it 6.44), good `#226e47` (5.94), warn `#8e5a10` (5.56), bad `#b3392d` (5.69).
  - Dark: bg `#131211`, surface `#1a1918`, border `#2d2a27`, text `#ece8e1` (15.3), muted `#aaa39a` (7.50), accent `#7ea6e0` (7.50), good `#6bbd8e` (8.28), warn `#ddaa5c` (8.89), bad `#ea8b7f` (7.57).
- **Radii:** 4, 8 or 12 (squarer, more like print). **Shadows:** none; it uses hairline rules (1 px) and generous margins instead. **Spacing:** same 4 pt base, with a reading measure of about 64ch.
- **Ring:** thinner (6 px), with the number in Newsreader figures. **Evidence:** "footnotes", meaning the quotes in the explanation are numbered and listed as notes below it.
- **Risk:** the serif can feel less like a tool on the coding and tracker screens. Mitigation: use the serif on the report only.

### Direction C: "Warm and Reassuring"
**Mood:** a friendly student-services product, like Monzo or Things 3. It's softer and rounder, and puts reassurance first.
- **Type:** the system font or Inter; optionally **Instrument Sans** (OFL, [Google Fonts](https://fonts.google.com/specimen/Instrument+Sans)) for headings because its forms are rounder.
- **Color:**
  - Light: bg `#fcfcfd`, subtle `#f5f6f8`, text `#1b1f27` (16.1), muted `#535b69` (6.68), accent `#2f6fd6` (white on it 4.81), accent-text `#2a63c2` (5.59), good `#1f7a50` (5.17), warn `#9a5a00` (5.34), bad `#c23b30` (5.17).
  - Dark: bg `#12151b`, text `#e9edf3` (15.6), muted `#a6aebb` (8.18), accent `#79a6f2` (7.44), good `#5fc28e`, warn `#e6ad55`, bad `#f08a7f`.
- **Radii:** 12, 18 or 24. **Shadows:** `--shadow-2` on all cards. **Spacing:** more padding (24–32 px in cards).
- **Ring:** thick (16 px). Evidence cards get tinted backgrounds.
- **Risk:** this is the direction most likely to slide back into "generic SaaS card soup", which is exactly what the self-critique complains about.

**Pick: A**, and borrow one idea from B: the curly-quote and footnote linking for evidence.

---

## 3. Q2: Reference products and what to borrow

| Space | Product (link) | What to borrow specifically |
|---|---|---|
| Trust and safety | [Apple Privacy](https://www.apple.com/privacy/) | One idea per viewport, a huge statement h1, then plain-language proof. Product imagery *is* the illustration. Use this on the intro: show the report, don't illustrate it. |
| | [Have I Been Pwned](https://haveibeenpwned.com/) | Emotional framing of good versus bad results: a big, plain verdict ("Oh no — pwned!" vs "Good news — no pwnage found!"), then the *list of specific breaches with dates and data types*. Use the same verdict, then the itemized proof. Don't copy its playful tone for scams. |
| | [Google Safety Center](https://safety.google/) / [Security Checkup](https://myaccount.google.com/security-checkup) | A status for each category (green check or amber alert) that expands into one concrete recommendation with one button. Map this to the Sender, Message and Offer rows on the report. |
| | [1Password](https://1password.com/) | A calm, confident security voice. Its Watchtower-style "N issues" summary sorts problems by severity before detail. |
| | [Proton](https://proton.me/), [Bitwarden](https://bitwarden.com/) | Privacy claims as short, checkable statements. Use this for the privacy line: three short facts with icons, not a paragraph (S1). |
| | [Malwarebytes](https://www.malwarebytes.com/), [Norton Genie](https://us.norton.com/products/genie-scam-detector) | Mostly *anti-patterns*: big shield illustrations, alarm-red hero sections, upsells. Norton Genie does show that a paste-or-screenshot scam checker needs exactly one input and one verdict. |
| Scores / fintech | [Credit Karma](https://www.creditkarma.com/) | A score dial with named bands and "what's affecting your score" factor rows. That's exactly the evidence-group pattern. Borrow the factor rows with their impact labels. |
| | [Oura](https://ouraring.com/), [Whoop](https://www.whoop.com/) (403 bot-block; site exists) | A single score, then "contributors", each with a small bar and a word ("Optimal / Pay attention"). Borrow: **every number gets a word**. |
| | Apple Fitness rings | Concentric rings show several quantities without a chart. This is what the coverage ticks plus risk arc idea is based on. Closing a ring gets a tiny settle and no confetti. |
| | [Monzo](https://monzo.com/), [Wise](https://wise.com/), [Mercury](https://mercury.com/), [Copilot Money](https://copilot.money/) | Monzo and Wise: plain, jargon-free copy about money risk, and "we'll never ask you to…" scam warnings. Mercury and Copilot: restrained neutrals, precise tabular numbers, and one accent used at large scale. |
| | [Stripe](https://stripe.com/) | Careful type and numeral alignment, and docs with real example values. Keep the specific made-up sample data (Northbeam Analytics, $2,850 check). |
| Polish | [Linear](https://linear.app/) + [How we redesigned the Linear UI](https://www.linear.app/now/how-we-redesigned-the-linear-ui) | They went from 98 hand-set variables to three inputs (base, accent, contrast) generated in **LCH**, which gives dark mode real elevation steps. They use Inter Display for headings. Copy the method: derive every dark surface from one hue. |
| | [Vercel](https://vercel.com/), [Geist](https://vercel.com/geist/introduction), [Web Interface Guidelines](https://vercel.com/design/guidelines) | Deploy-log-style live step lists, crisp hairline borders, mono stamps, and the guideline checklist (§9). |
| | [Arc](https://arc.net/), [Raycast](https://www.raycast.com/), [Things 3](https://culturedcode.com/things/), [Resend](https://resend.com/) | Arc: expressive motion, but only on key moments. Raycast: no animation on keyboard-frequent actions (Emil Kowalski cites it). Things 3: tiny, quick, satisfying completion micro-interactions. Resend: black and white restraint plus one product shot. |
| Career tools | [Teal](https://www.tealhq.com/), [Huntr](https://huntr.co/), [Simplify](https://simplify.jobs/) | Tracker columns with counts, compact cards, and quick status moves. Teal's keyword-match panel next to the resume (for tailoring). |
| | [Handshake](https://joinhandshake.com/), [Wellfound](https://wellfound.com/), [Welcome to the Jungle](https://www.welcometothejungle.com/) | A student-native tone and real company signals (verified badges). WTTJ / Otta brings an editorial warmth to job content, which supports Direction B's serif idea. |
| Interview practice | [Google Interview Warmup](https://grow.google/certificates/interview-warmup/) | **The best direct model.** Calm, one question per screen, and feedback that *highlights the words in your own answer* (job-related terms, talking points). Apply it to the behavioral and finance feedback, using the same highlight system as the report. |
| | [interviewing.io](https://interviewing.io/), [Exponent](https://www.tryexponent.com/), [Hello Interview](https://www.hellointerview.com/) | A rubric scorecard per competency, plus split-pane problem/editor layouts. Hello Interview's system-design flow is a guided step list (requirements, API, data model, scale). |
| | [LeetCode](https://leetcode.com/) (403 bot-block; site exists) | Split pane: description on the left, editor on the right, a console with test-case tabs underneath (fixes S10). |
| | [Yoodli](https://yoodli.ai/), [Final Round AI](https://www.finalroundai.com/) | Yoodli: per-answer metrics shown as a few words plus one coach tip. Final Round is an anti-pattern (dense dashboards, gradients). |
| Reports | [Lighthouse](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring), [VirusTotal](https://www.virustotal.com/), [Snyk](https://snyk.io/), [Dependabot](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts), [Grammarly](https://www.grammarly.com/) | See §6 (Q5). |

---

## 4. Q3: Motion guidelines and specs

### 4.1 Principles from the sources
- **Apple HIG Motion** ([link](https://developer.apple.com/design/human-interface-guidelines/motion)):
  - "Add motion purposefully… Don't add motion for the sake of adding motion."
  - "Make motion optional… avoid using it as the only way to communicate important information."
  - "Aim for brevity and precision in feedback animations."
  - "Generally avoid adding motion to UI interactions that occur frequently."
  - "Let people cancel motion."
- **Material 3** ([easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)):
  - Easings: standard `cubic-bezier(0.2,0,0,1)`, emphasized-decelerate `cubic-bezier(0.05,0.7,0.1,1)`, emphasized-accelerate `cubic-bezier(0.3,0,0.8,0.15)`.
  - Durations: short 50–200 ms, medium 250–400 ms, long 450–600 ms. "Selection controls have a short duration of 200ms with Standard easing." "A Card expanding to full screen uses a long 500ms duration with Emphasized easing."
  - M3 Expressive moves components to **springs**, and keeps the easing tokens for transitions ([transition patterns](https://m3.material.io/styles/motion/transitions/transition-patterns): container transform, shared axis, fade through).
- **IBM Carbon** ([link](https://carbondesignsystem.com/elements/motion/overview/)): *productive* motion (`cubic-bezier(0.2,0,0.38,0.9)`) for task UI and *expressive* motion (`cubic-bezier(0.4,0.14,0.3,1)`) "for occasional, important moments". Durations: 70, 110, 150, 240, 400, 700 ms. Micro-interactions are 90–120 ms with ease-out. **This productive/expressive split is the core rule for InternShield: productive everywhere, expressive only for the result reveal.**
- **Fluent 2** ([link](https://fluent2.microsoft.design/motion)): top-level page changes should "use a quick fade transition instead of moving or sliding". Stagger with short offsets, "starting with larger gaps and gradually shortening them". Give important elements longer durations.
- **Emil Kowalski** ([Great animations](https://emilkowal.ski/ui/great-animations), [You don't need animations](https://emilkowal.ski/ui/you-dont-need-animations), [Sonner](https://sonner.emilkowal.ski/)): mostly ease-out and "usually shorter than 300ms". "Never animate keyboard initiated actions." Animate only transform and opacity, keep animations interruptible, and handle reduced motion.
- **Rauno Freiberg** ([Invisible details of interaction design](https://rauno.me/craft/interaction-design)): *frequency and novelty*. He removed motion from core high-frequency interactions and "suddenly felt like I was moving much faster". The macOS context menu has no enter animation, only a subtle fade-out after an accent blink that confirms the selection.
- **Josh Comeau** ([spring physics](https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/), [prefers-reduced-motion in React](https://www.joshwcomeau.com/react/prefers-reduced-motion/)): springs feel natural and keep their velocity when interrupted. The react-spring default of tension 170 / friction 26 is roughly critically damped (no overshoot).
- **Vercel guidelines** ([link](https://vercel.com/design/guidelines)):
  - Prefer CSS, then WAAPI, then JS libraries. Animate only compositor properties. "Never `transition: all`". Wrap SVG in `<g>` with `transform-box: fill-box`.
  - Spinners: "add a short show-delay (~150–300 ms) & a minimum visible time (~300–500 ms)".

### 4.2 Motion tokens (add to `@theme`)
```css
@theme {
  --ease-out:      cubic-bezier(0.22, 1, 0.36, 1);   /* current one; keep for entrances */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);       /* M3 standard: state changes, expand */
  --ease-exit:     cubic-bezier(0.3, 0, 0.8, 0.15);  /* M3 emphasized-accelerate: leaving */
  --ease-reveal:   cubic-bezier(0.05, 0.7, 0.1, 1);  /* M3 emphasized-decelerate: ring arc */
  --dur-press:  90ms;   /* active scale, pill tap (Carbon 90–120) */
  --dur-micro:  150ms;  /* color/border changes, checkbox, chevron */
  --dur-base:   220ms;  /* expand/collapse, toast in, tooltip */
  --dur-screen: 280ms;  /* screen change (fade + 6px rise) */
  --dur-reveal: 800ms;  /* ring arc + count-up (expressive, once per report) */
  --stagger:    40ms;   /* list items, cap at 6 items (240ms total) */
}
```

Motion springs use Motion's `visualDuration` and `bounce` options ([spring docs](https://motion.dev/docs/spring): bounce 0 = critically damped, negative = overdamped). The stiffness/damping equivalents assume mass 1, where damping ratio ζ = d / (2√k):

| Name | Motion option | ≈ stiffness / damping | Use |
|---|---|---|---|
| `spring.ui` | `{ type:"spring", visualDuration:0.22, bounce:0 }` | 500 / 45 (ζ≈1.0) | pill selection check, toggle thumb, segmented-control indicator |
| `spring.layout` | `{ type:"spring", visualDuration:0.32, bounce:0.08 }` | 300 / 30 (ζ≈0.87) | evidence reorder, card expand, checklist → coverage-line morph, Accept morph |
| `spring.settle` | `{ type:"spring", visualDuration:0.5, bounce:0 }` | 170 / 26 (ζ≈1.0) | ring moving to a new score after a quick-question answer |
| `spring.good` | `{ type:"spring", visualDuration:0.35, bounce:0.15 }` | 260 / 22 (ζ≈0.68) | the check icon on a *low-risk* result only |

Rule: **never use a bounce above 0.15**, and never bounce on a medium- or high-risk result.

### 4.3 Choreography by moment

| Moment | Spec |
|---|---|
| **Screen change** | Old screen fades out over 120 ms (`--ease-exit`). The new one fades in and rises 6 px over 280 ms (`--ease-out`). Move focus to the h1 after the enter (`onAnimationComplete`). No horizontal slides (Fluent "top level"). Use `AnimatePresence mode="wait"`. |
| **Checklist → report handoff** | When the last check finishes, hold 150 ms. The checklist collapses (`spring.layout`) into one line, "14 checks · 9 ran", which **becomes the coverage line** under the ring (Motion shared `layoutId="coverage"`). The ring track is already in the position the checking screen reserved, so nothing jumps. |
| **Result reveal (the hero)** | t=0: ring track and coverage ticks visible. 0–300 ms: ticks for the checks that ran fill one by one (20 ms apart). 0–800 ms: the arc draws 0→score with `--ease-reveal`, and the number counts in sync (tabular-nums, so the width is stable). t=700: the level icon draws in (stroke-dashoffset, 200 ms) and the level words fade in and rise 4 px (220 ms). t=900: the top-3 reasons stagger in (40 ms apart, 220 ms each). **Total ≤ 1.2 s, and skippable**: any click, key or scroll jumps to the end state. Everything below the fold is already rendered and visible. |
| **Evidence list** | **No scroll-reveal.** If you want any motion at all, only on first render: the first 3 cards in view stagger in (40 ms apart, opacity and 4 px). Use `whileInView` with `viewport={{ once:true, amount:0.1 }}`, and make `initial` visible in print and when reduced motion is on. |
| **Expand/collapse** (Couldn't check, real posting, feedback cards, tailor options) | Height uses `spring.layout`. The content fades in over 150 ms, delayed 60 ms. The chevron rotates 180° over 150 ms with `--ease-standard`. Keep `aria-expanded`. |
| **Pill selection** | Background and border colors change over 150 ms (`--ease-standard`). Press scales to 0.97 over 90 ms. Selected adds a 14 px check glyph whose width grows 0→14 (`spring.ui`). It's tactile without bounce. When the selection comes from the keyboard (arrow keys), there's no motion, just the color change. |
| **Score change after a quick-question answer** | The ring animates **from the old score to the new one** (`spring.settle`). A delta chip ("−15", in the new level's color, tabular) fades in next to the number and stays 2.5 s. If the level changes, the level words crossfade (150 ms out, 220 ms in). Announce it with `aria-live="polite"`: "Risk now 45, some warning signs." If the score doesn't change, replace the grey sentence with a single subtle pulse on the coverage line ("+1 check confirmed"). |
| **Toast / confirmation** | It enters from the bottom with 8 px and opacity over 220 ms (`--ease-out`), stays 2.5 s, and exits over 150 ms (`--ease-exit`). Prefer *inline* confirmation: "Copy report" morphs into "Copied ✓" in place. Deleting from the tracker gives an **Undo** toast (Vercel: "Confirm destructive actions… or provide Undo"). |
| **Tailor Accept** | The suggested text flies into the resume bullet's position (`layoutId` per bullet, `spring.layout`). The bullet gets a 1.2 s fade-out accent tint. The "N changes accepted" counter ticks up. |
| **Interview progress** | A segmented bar for "Question 1 of 3". The finished segment fills over 220 ms. The next question card crossfades in (no slide). The design-challenge timer is a thin ring depleting linearly. It turns amber at 2 minutes left and never red, because a timer isn't a danger state. |

### 4.4 Library recommendation: Motion
- **Package:** `motion` (formerly Framer Motion), imported from `"motion/react"`. Requires React ≥ 18.2 and supports both Next.js routers. In the App Router, use it from `"use client"` components, or import `* as motion from "motion/react-client"` ([install docs](https://motion.dev/docs/react-installation)). MIT licensed and free.
- **Bundle:**
  - The full `motion` component can't tree-shake below about 43 KB. `LazyMotion` + `m` brings that down to "just over 5kb for the initial render", plus a feature pack: `domAnimation` (+24 KB: animations, variants, exit, tap/hover/focus) or `domMax` (+38 KB: adds pan/drag and **layout animations**) ([reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)).
  - Use `domMax`, **lazy-loaded** (`features={() => import("./motion-features").then(r => r.default)}`), because the handoff and Accept morphs need layout animations.
  - Use `<LazyMotion strict>` so nobody imports `motion.div` by accident.
- **Reduced motion:** `<MotionConfig reducedMotion="user">`. Per the [Motion accessibility docs](https://motion.dev/docs/react-accessibility), "all motion components will automatically disable transform and layout animations, while preserving the animation of other values like opacity". That's exactly the strategy in §10.
- **View Transitions:**
  - Next 16 ships React 19.2's `<ViewTransition>` and it "works in the App Router with no configuration" ([Next guide](https://nextjs.org/docs/app/guides/view-transitions), [React reference](https://react.dev/reference/react/ViewTransition), [Next 16 release](https://nextjs.org/blog/next-16)). It only fires for updates inside `startTransition`, Suspense or `useDeferredValue`. Plain `setState` doesn't trigger it.
  - Same-document View Transitions have been Baseline (Chrome, Safari, Firefox) since Firefox 144 in Oct 2025 ([web.dev](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available)). Firefox 144 lacks transition *types*, and the Next guide notes that React's integration uses features "available in Chromium 125+ and recent Safari and Firefox".
  - **Advice:** InternShield's screens are state-driven inside one route, so use Motion's `AnimatePresence` for screen changes this week. Try `<ViewTransition>` (wrapping `setScreen` in `startTransition`) after the hackathon. Never animate the same element with both.
- **Alternatives considered:**
  - [auto-animate](https://auto-animate.formkit.com/): tiny, and fine for the tracker list, but no choreography.
  - react-spring: springs only, no layout or exit orchestration.
  - Pure CSS: keep it for hover and press states.

  Motion is the only option that covers springs, exits, layout morphs and reduced-motion config together.

Ring sketch (the shape of the code to aim for, not drop-in):
```tsx
"use client";
import * as m from "motion/react-m";
import { animate, useMotionValue, useTransform, useReducedMotion } from "motion/react";
import { useEffect } from "react";

const R = 80, C = 2 * Math.PI * R;
export function RiskRing({ score }: { score: number }) {
  const reduce = useReducedMotion();
  const v = useMotionValue(0);                         // keeps the last value, so re-scores animate old→new
  const dashoffset = useTransform(v, s => C * (1 - s / 100));
  const label = useTransform(v, s => String(Math.round(s)));
  useEffect(() => {
    const c = animate(v, score, reduce ? { duration: 0 } : { duration: 0.8, ease: [0.05, 0.7, 0.1, 1] });
    return () => c.stop();
  }, [score, reduce, v]);
  return (/* <svg><circle className="track"/><m.circle strokeDasharray={C} style={{ strokeDashoffset: dashoffset }}/></svg>
             <m.span className="num">{label}</m.span>  + 14 coverage ticks */ null);
}
```

---

## 5. Q4: Micro-interactions and the hero moment

- **Anticipation → count → settle, done soberly.**
  - Anticipation is the reserved ring track and the checklist collapsing into it (about 150 ms), so the eye is already where the result will appear.
  - The count uses a decelerating ease (not linear), with **no overshoot** for medium or high risk.
  - The settle is just the level words fading in.
  - Keep it ≤ 1.2 s and skippable. HIG says "let people cancel motion", and a stressed student who might be about to deposit a fake check shouldn't wait for a show.
- **Sound or haptics: no.** `navigator.vibrate` isn't supported in iOS Safari ([caniuse](https://caniuse.com/vibration)), where many students will be. Sound is wrong for a possible-fraud result and for shared library computers. HIG's "supplement visual feedback" advice is about native haptics, which a web app doesn't have.
- **How the references handle good versus bad news:**
  - Apple Fitness: completing a ring gets a small, quick celebration, and missing it gets *no* negative animation, just the open ring.
  - Oura and Whoop: a neutral score, a word, then contributors. Bad days aren't alarming, just "Pay attention".
  - Credit Karma: a color band plus actionable "what's affecting it" factors.
  - HIBP: a very plain verdict headline, then facts. Red and direct when bad, green and short when good.
- **InternShield tone by level:**

| | No red flags found | Some warning signs | Strong signs of a scam |
|---|---|---|---|
| Ring | Green arc at the score (0–20). **At 0, show the full set of filled green coverage ticks and a small green dot at 12 o'clock**, so it never looks empty (fixes S4). | Amber arc | Red arc. The number is in `--bad`, while the h1 stays `--text`, so the whole page isn't red. |
| Motion | `spring.good` on the check icon (the only bounce in the app) | Plain | Plain and no bounce, level words a little slower (300 ms) |
| First line under the level | "Still apply through the official careers page." | "Check these before you reply." | **"Don't send money or personal details."** Action first, in bold, before any explanation. |
| Celebration | **None.** The product never says "safe". No confetti, no "you're all set!" | None | None |
| Primary button | "Open the official posting" (or "Answer 1 question") | "Answer 1 question to be sure" | "What to do now" (jumps to the steps), with "Report to the FTC" beside it |

- **Other micro-interactions worth doing:**
  - **Paste detection:** when more than 80 characters are pasted, the auto-filled Sender and Company fields slide in with a "filled from message" tag that fades after 3 s, and Check becomes fully enabled.
  - The Copy-report label morphs in place.
  - Pill selection gets a check glyph.
  - Coverage ticks fill during the reveal.
  - On desktop, hovering an evidence card lifts it to `--shadow-2` over 150 ms and highlights its span in the annotated message, and vice versa.

---

## 6. Q5: Information design of the report

Target order. On a 390×844 phone, above the fold should be the verdict, the action and the first reason.

1. **Verdict block:** the ring (risk arc plus 14 coverage ticks), the level words with a severity-shape icon, the *one-line action*, and "9 of 14 checks ran" (tappable, opens Couldn't check). This is **coverage shown visually instead of as text**. It's like VirusTotal's "N/94 vendors flagged" detection-ratio dial ([VirusTotal](https://www.virustotal.com/)) and Apple's concentric rings.
2. **"Why" (top 3):** the three highest-weight flags as one-line rows, each with its severity shape and a ¹ ² ³ link into the message. Critical flags always come first. Lighthouse shows its gauges first and then sorts opportunities by impact, and Snyk and Dependabot sort by severity.
3. **Annotated message (the signature view):**
   - The user's own pasted text, at 15 px in a sunken well. Each verified quote is a `<mark>` with a 2 px underline in its severity color, a 10% tint, and a superscript number (shape plus number, not color alone).
   - Clicking a mark, or pressing Enter on it, scrolls to and focuses its evidence card, and the card links back the same way.
   - This is the **Grammarly inline-underline ↔ suggestion-card** pattern ([Grammarly](https://www.grammarly.com/)) and Google Interview Warmup's "highlight your words" pattern.
   - Quotes are already verified word for word, so the character offsets come free from the matcher. That makes this low risk, and it's the strongest "not a template" element in the plan.
   - Messages longer than 12 lines collapse, with "Show full message".
4. **Evidence:**
   - One list **sorted by severity** (Critical → red flag → caution → good sign). Sender, Message and Offer become small category labels on each card, not section headers with gaps.
   - Critical cards get a "Critical" tag and a 3 px left rule.
   - On medium- and high-risk reports, good signs collapse into "2 good signs".
   - Lighthouse uses the same idea, collapsing "Passed audits (N)", and Dependabot and Snyk order by severity ([Dependabot alerts](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts), [Snyk](https://snyk.io/)).
5. **Couldn't check:** collapsed. Each item says *why* ("Company website didn't load") and whether it could have changed the score.
6. **What to do now** (medium or high) or **The real posting** (low). One primary action.
7. **Footer:** **one** primary ("Check another message") plus a compact row of secondary text-and-icon buttons (Copy report · Save · Tailor · Practice), replacing the six pills (fixes S6). **Hide Tailor and Practice on high-risk reports.** Nobody should tailor a resume for a scam.

Explanation styling: quotes in the paragraph use the *same* mark style as the annotated message, with curly quotes (fixes S5). Keep "Our take / What stood out / What to do next", but cap "What stood out" at three bullets, since the evidence list holds the rest.

All of this is progressive disclosure as NN/g describes it ([progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)): the essentials first, with secondary detail one click away and always reachable.

---

## 7. Q6: Waiting states (2–8 s)

- **Research:**
  - NN/g: 0.1 s feels instant, 1 s keeps the flow of thought, and 10 s is the attention limit ([response times](https://www.nngroup.com/articles/response-times-3-important-limits/)).
  - For 2–10 s, a looped indicator is right. For longer waits, use percent-done, or "a list of completed and remaining steps" when percent can't be known. "Indicate current step… but do not overburden users" ([progress indicators](https://www.nngroup.com/articles/progress-indicators/), [long waits](https://www.nngroup.com/articles/designing-for-waits-and-interruptions/)).
  - Skeletons suit predictable content layouts ([skeleton screens](https://www.nngroup.com/articles/skeleton-screens/)).
- **Recommendation: a hybrid. Keep the step list**, which is honest and matches NN/g, but change five things:
  1. **Put it inside the report frame.** The ring track is already in place, with a thin indeterminate arc turning slowly (one rotation per 1.6 s, linear, which is fine for rotation per Fluent). The steps sit where the "Why" list will appear. The handoff is then a morph, not a page swap (§4.3).
  2. **Show real outcomes per step, not only spinners.** Each step resolves to a tiny result: "Sender: gmail.com address", "Domain registered 12 days ago", "Company site found". That's the Vercel deploy-log and Perplexity step-streaming feel.
     - The full version needs the check route to **stream NDJSON** (a `ReadableStream` from the route handler, one line per finished stage). That's post-hackathon.
     - This week: when the final payload arrives, tick the steps off with their *real* outcomes at about a 120 ms cadence. It's a replay of true data, not fake progress. Note that in the code.
  3. **Timing hygiene (Vercel):** about a 200 ms show delay before any spinner, and a minimum visible time of about 400 ms per step, so fast steps don't flicker.
  4. **Slow steps:** after 8 s, the slow step's copy changes to "Still checking the company's website… (this one can be slow)". After 15 s, offer "Show what we have": a partial report with that step marked as couldn't check.
  5. **No optimistic verdicts.** Never show a score and then change it for the same check. It's a safety tool. Optimistic UI is fine for *tracker* moves.
- **Screenshot upload** (`full/12`): show the thumbnail with a soft scanning bar (opacity only in reduced motion), then fade the extracted text into the textarea. It's the same "reading" metaphor.

---

## 8. Q7: Onboarding, empty and error states

**Onboarding (value first):**
- NN/g's onboarding research ([mobile app onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/)) finds that up-front tutorials and setup are often skipped and forgotten. Let people do the core task first.
- **Flow change:** Intro → **Check screen directly**. Ask for the profile only when a career tool needs it ("To tailor, pick your field and level: 2 taps"), and offer "Personalize InternShield?" once after the first report. The check doesn't need the profile.
- **Intro hero (fixes S1):**
  - Desktop is asymmetric: text on the left (5/12 of the width), a **live mini report** on the right (7/12). The mini report is a real rendered component: a made-up message with two marks, a ring at 86, and two evidence rows. It plays its reveal once, and is static in reduced motion. On mobile it stacks under the CTA.
  - It replaces the decorative 12% ring.
  - The privacy paragraph becomes three short facts with icons: "Not stored · Screenshots discarded · No account".
- **Field and level steps:** keep the big cards. Add number-key shortcuts (1–5), and auto-advance 150 ms after a selection, with Back always visible.

**Empty states.** Polaris says to explain what the area is for and give one primary action ([Polaris empty states](https://polaris-react.shopify.com/patterns/empty-states)). NN/g says to use empty states to teach and to give a direct path ([empty states](https://www.nngroup.com/articles/empty-state-interface-design/)).
- **Tracker, completely empty:** "Keep track of real offers. Save one from a report, or add it here." Primary: **Check a message**. Secondary: Add an application.
- **Tracker columns:** each empty column shows a dashed 1 px placeholder the size of a card:
  - Saved: "Offers you're considering"
  - Applied: "Move a card here after you apply"
  - Interviewing: "Practice for it from the card"
- **Practice history:** "Your practice rounds show up here. A recruiter screen takes about 10 minutes." Primary: **Start a recruiter screen**.
- **Tailor without a resume:** a drop zone that says "PDF or Word. Stays on this device." plus "Use a sample resume" for demos.

**Errors.** GOV.UK: say what happened and how to fix it, plainly, with no "oops" and no blame ([error message](https://design-system.service.gov.uk/components/error-message/), [validation](https://design-system.service.gov.uk/patterns/validation/)). Mailchimp: clear rather than clever, and match the reader's emotional state ([voice and tone](https://styleguide.mailchimp.com/voice-and-tone/)). See also NN/g's [error-message guidelines](https://www.nngroup.com/articles/error-message-guidelines/).

| Now | Suggested |
|---|---|
| "This doesn't look like a job message" + Try again | "This doesn't look like a recruiter message. Paste the full message, including who sent it." + **Edit message** (keeps the text) |
| "We're busy. Try again in a moment." | "Too many checks right now. Try again in about a minute. Your message is still here." (with a 60 s countdown on the button) |
| "InternShield is resting for today." | "We've hit today's free limit. Checks reset at midnight ET. Until then: never send money or bank details to a recruiter." (useful even when blocked) |
| "We couldn't read the message, so this result is incomplete." | Keep it, but name *which* step failed and offer "Try again" for that step only. |
| Screenshot fails with the generic error | "We couldn't read all of this screenshot. Very tall screenshots work best cut into 2–3 parts." (ties in with bug 05-A) |

Errors go inline next to their cause, focus moves to the first error (GOV.UK and Vercel), and the pasted text is never wiped.

---

## 9. Q8: Hand-crafted versus AI-generated

**Tells of AI and template UIs in 2025–26** (from reviewing typical vibe-coded apps, checked against the guidelines below):
- default Inter at default tracking everywhere
- shadcn-default `rounded-xl` + `shadow-sm` cards around every block
- purple-to-indigo gradient text in the hero
- "✨" and emoji bullets
- three feature cards, each with an icon in a tinted rounded square
- everything centered, with identical section spacing
- fade-up-on-scroll on *every* element
- glow borders and blurred blobs
- filler copy ("Unlock your potential", "Seamless", "Supercharge")
- fake stats ("10k+ students")
- undesigned empty and error states
- one container width everywhere, and header and content edges that don't line up (S14)
- straight quotes and "..."
- numbers whose width jumps while counting
- mixed icon stroke weights

**What signals craft** (sources: [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines), [Rauno Freiberg](https://rauno.me/craft/interaction-design), [Emil Kowalski](https://emilkowal.ski/ui/great-animations), [Linear redesign](https://www.linear.app/now/how-we-redesigned-the-linear-ui), [Refactoring UI](https://www.refactoringui.com/)):
- **One signature visual** that only this product has: the coverage ring and the annotated message.
- **An optical type scale:** headings use opsz Display with tighter tracking (−0.024 to −0.032em), and body text stays at normal tracking (§12).
- **Deliberate asymmetry** on the intro, and on the desktop report verdict block (ring on the left, verdict and action on the right). Forms stay centered.
- **Real content:** specific made-up examples, never lorem ipsum or "John Doe". Already good.
- **Rhythm:** a strict 4/8 pt scale, aligned edges (fix S14), and a small number of reused widths.
- **Texture (optional):** 2–3% noise on the intro background only, as a small PNG `background-image`, not an SVG filter. Fine to skip.
- **Custom focus ring:** 2 px accent with a 2 px offset that follows the element's radius, on `:focus-visible` only. Keep the current one.
- **Restrained color:** the accent covers under 5% of the pixels on any screen, and result colors appear only on result elements (ring, icons, tags, marks).
- **Copy voice:** short, second person, calm, specific, verb first. "Don't send money." instead of "We recommend refraining from…".
- **Typographic details:**
  - `tabular-nums` on scores, counts, timers and test results
  - `text-wrap: balance` on h1/h2 and `pretty` on paragraphs ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap))
  - curly quotes “ ” and the single ellipsis character …
  - `hanging-punctuation: first` (Safari-only, harmless elsewhere; [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/hanging-punctuation))
  - non-breaking spaces in "$2,850 check", "9 of 14" and "10 min"
  - ±1 px optical alignment of icons next to text

**Checklist to apply to every screen:**
1. Is there exactly **one** primary button?
2. Do the left edges of the content line up with the header logo?
3. Is anything animated that the user sees more than 5 times in a session? Remove that animation.
4. Are numbers tabular, quotes curly, and ellipses a single character?
5. Do headlines use `text-wrap: balance`, with no orphaned word on the h1 at 390 px?
6. Are result colors used **only** for results, and is accent blue used only for interactive things?
7. Is every state designed: empty, loading, error, very long content, very short content?
8. Are icons on one grid and one stroke width that matches the text weight?
9. Does dark mode have elevation (surface steps), not just inverted colors?
10. Are targets ≥ 24 px (44 on touch), and is focus visible and never hidden under a sticky header?
11. Does it still look right with reduced motion on, and in print?
12. Is UI copy short, second person and verb first?

---

## 10. Q9: Accessibility and reduced motion

**WCAG 2.2 AA items most relevant to these screens:**
- **1.4.3 Contrast (text):** every token pair in §2 passes 4.5:1, except `--text-3` on `--bg-subtle` (4.46). Use `--text-2` on subtle surfaces.
  - **Fix the dark syntax theme (S11):** use [`@codemirror/theme-one-dark`](https://github.com/codemirror/theme-one-dark) or a small custom theme where every token is ≥ 4.5:1 on `#171a1f`, with no purple (use the accent blue, the green and amber tones, and greys).
- **[1.4.11 Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html):**
  - The ring arc must be ≥ 3:1 against the page. All three result colors pass (5.3–5.7:1 light, 7.6–8.4:1 dark). The track is decorative.
  - Inputs: give them a `--sunken` fill plus a `--border-strong` edge and a visible label, so each field is clearly identifiable. In dark mode raise the input border to `#3d444f` (fixes S9).
- **[1.4.1 Use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html):**
  - Pair each result color with a **shape**: good = circle with check, warn = triangle, bad = octagon with exclamation. Lighthouse uses shape-coded audit icons for the same reason.
  - The calculated OKLCH lightness of good (51.5%) and bad (54.3%) is nearly the same, so for red-green color-blind users **the shape and the words carry the meaning**.
  - Message marks also vary their underline style: solid for red flags, dashed for caution, dotted for good signs.
- **[2.5.8 Target size (minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html):** ≥ 24×24 px. Pills (40) and buttons (48) pass. Pad the inline "a scam · a real one" links and the small tracker buttons.
- **[2.4.11 Focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html):** if the header becomes sticky, add `scroll-padding-top` equal to its height.
- **[4.1.3 Status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html):** the result is already announced. Add polite live regions for "Copied", "Saved", score changes after a quick question, test results, and the timer at 5, 2 and 1 minutes (not every second).
- **2.2.2 Pause, stop, hide:** the indeterminate ring stops when the check ends. Give the design-challenge timer a Pause button.
- **3.3.1 / 3.3.3 Error identification and suggestion:** see §8.
- **3.3.7 Redundant entry** (new in 2.2): carry Company and Role from the report into Save, Tailor and Interview. Mostly done already; keep it consistent.
- **[2.3.3 Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)** (AAA, but cheap to meet): honor reduced motion everywhere.

**A reduced-motion strategy that still feels polished:**
- Use `<MotionConfig reducedMotion="user">` (transforms and layout off, opacity kept), plus CSS `@media (prefers-reduced-motion: reduce)` ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)).
- Every enter becomes a 150 ms opacity crossfade, and stagger is off.
- The ring renders at its final value: the arc and number fade in over 200 ms, with no count-up, and the ticks are pre-filled.
- Layout morphs become crossfades.
- The indeterminate ring becomes a static "Checking…" alongside the step list.
- A score change crossfades the number, and the delta chip stays (it's information, not decoration).
- **No scroll-reveal at all** (this also fixes S3).
- If View Transitions are adopted later: `@media (prefers-reduced-motion: reduce) { ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation-duration: .01ms !important; } }`.

**Focus order through the report:**
1. The h1 level, which receives focus and is announced
2. The action line
3. "9 of 14 checks ran" (a button that opens Couldn't check)
4. The quick question, if present
5. The top-3 reasons (links into the message)
6. The annotated-message marks (each focusable; Enter jumps to its card)
7. The evidence cards
8. What to do now
9. The footer actions

Add a skip link at the top of the report: "Skip to what to do now".

---

## 11. Q10: Brand

- **Should the ring be the mark? Yes.** It's the product's real hero, so the logo should be the same object.
  - The mark is **an open ring**: a 300° arc with round caps in `--accent`, its stroke about 12% of the diameter, with a small solid dot in the 60° gap at the upper right (the "checked" point).
  - It replaces the stock-style shield, which the self-critique calls out. If a hint of a shield is wanted, the gap can become a shield notch, but the plain ring is simpler and more ownable.
- **Wordmark:** "InternShield" in the system font or Inter Display, weight 600, tracking −0.02em, in one color (`--text`). Don't color "Shield" separately. Show the wordmark on mobile too, at 15 px. It fits next to the profile chip at 390 px, and hiding it makes the header feel generic.
- **Favicon set:** follow the Evil Martians "[six files](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs)" guide:
  - `icon.svg`, with an internal `prefers-color-scheme` style and the arc thickened to about 18% so it reads at 16 px
  - `favicon.ico` at 32 px
  - `apple-icon.png` at 180 px on a white tile
  - manifest icons at 192 and 512
  - Use Next's file conventions (`app/icon.svg`, `app/apple-icon.png`; [app icons](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons)).
- **OG image:** `app/opengraph-image.tsx` with `ImageResponse` ([docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)), 1200×630, white background.
  - Left: "Is this offer real?" at 72 px semibold, with "Paste a recruiter message. See the evidence."
  - Right: a red ring at 86 and one annotated quote line.
  - The product is the illustration.

---

## 12. Token sheet for Tailwind 4 `@theme` (Direction A)

```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

@theme {
  --font-sans: system-ui, -apple-system, "SF Pro Text", var(--font-inter), sans-serif;
  --font-mono: ui-monospace, "SF Mono", var(--font-geist-mono), monospace;

  /* type scale: size / line-height / tracking  (weights: 400 body, 600 headline, 680–700 display) */
  --text-display: clamp(2.5rem, 5.5vw + 0.5rem, 4.5rem); --text-display--line-height: 1.04; --text-display--letter-spacing: -0.032em; /* 40→72 */
  --text-title:   clamp(1.75rem, 2.5vw + 0.75rem, 2.5rem); --text-title--line-height: 1.12; --text-title--letter-spacing: -0.024em;  /* 28→40 */
  --text-level:   clamp(1.875rem, 3vw + 0.75rem, 2.75rem); --text-level--line-height: 1.1; --text-level--letter-spacing: -0.022em;  /* 30→44 */
  --text-score:   3.5rem;     --text-score--line-height: 1;      --text-score--letter-spacing: -0.03em;   /* 56, tabular */
  --text-headline: 1.0625rem; --text-headline--line-height: 1.4;  /* 17 semibold: card titles */
  --text-body:    1.0625rem;  --text-body--line-height: 1.6;      /* 17 (Apple body default) */
  --text-callout: 0.9375rem;  --text-callout--line-height: 1.5;   /* 15: secondary, message well */
  --text-footnote: 0.8125rem; --text-footnote--line-height: 1.45; /* 13: meta, tags (minimum) */

  --radius-xs: 6px; --radius-sm: 10px; --radius-md: 14px; --radius-lg: 20px;

  --color-bg: #ffffff; --color-bg-subtle: #f6f7f9; --color-surface: #ffffff; --color-sunken: #f1f3f6;
  --color-border: #e3e6eb; --color-border-strong: #c5cad3;
  --color-fg: #14171c; --color-fg-2: #555c68; --color-fg-3: #6c737f;
  --color-accent: #2466c3; --color-accent-hover: #1657af; --color-accent-fg: #2460b7; --color-accent-tint: #e3f0ff;
  --color-good: #1d7a4c; --color-good-tint: #e6f4ec;
  --color-warn: #95590a; --color-warn-tint: #fcf1df;
  --color-bad:  #bf3a2b; --color-bad-tint:  #fcebe8;

  --shadow-1: 0 1px 0 rgb(20 23 28 / .04), 0 1px 2px rgb(20 23 28 / .06);
  --shadow-2: 0 1px 2px rgb(20 23 28 / .06), 0 4px 12px -2px rgb(20 23 28 / .08);
  --shadow-3: 0 2px 4px rgb(20 23 28 / .06), 0 12px 32px -8px rgb(20 23 28 / .14);
  /* + motion tokens from §4.2 */
}
[data-theme=dark] {
  --color-bg: #0e1013; --color-bg-subtle: #13161a; --color-surface: #171a1f; --color-sunken: #1d2127;
  --color-border: #272c33; --color-border-strong: #3d444f;
  --color-fg: #eceef2; --color-fg-2: #a4abb6; --color-fg-3: #868e9a;
  --color-accent: #6ea0e8; --color-accent-hover: #82b0f3; --color-accent-fg: #8fb9f7; --color-accent-tint: #152235;
  --color-good: #5bbf8a; --color-good-tint: #12271c;
  --color-warn: #e3a94f; --color-warn-tint: #2a200f;
  --color-bad:  #f0857a; --color-bad-tint:  #2d1614;
  --shadow-1: 0 0 0 1px rgb(255 255 255 / .04);
  --shadow-2: 0 0 0 1px rgb(255 255 255 / .06), 0 8px 24px -8px rgb(0 0 0 / .6);
  color-scheme: dark;
}
:root { font-optical-sizing: auto; -webkit-font-smoothing: antialiased; }
h1, h2, .text-level { text-wrap: balance; }
p { text-wrap: pretty; }
.num { font-variant-numeric: tabular-nums; }
```

Notes:
- The scale follows Apple's text styles, where 17 is the iOS body default ([HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography): "Minimize the number of typefaces"; "avoid light font weights").
- **SF Pro can't be self-hosted as a web font** under Apple's license ([Apple fonts](https://developer.apple.com/fonts/)). Only reference it through `system-ui` / `-apple-system`, as the stack already does.
- Tailwind 4's default palette is already OKLCH ([Tailwind colors](https://tailwindcss.com/docs/colors)). You can write the tokens above as `oklch(...)` using the values in §2. Use hex as the fallback.

---

## 13. Screen-by-screen change list

Tags: **I** = impact, **E** = effort, **R** = risk (H/M/L). ★ marks the top 15.

| Screen | Change | I | E | R |
|---|---|---|---|---|
| Global | ★ Direction A tokens (§12), including dark elevation steps and the stronger dark input border | H | L | L |
| Global | ★ Motion (`LazyMotion strict` + lazy `domMax`) + `MotionConfig reducedMotion="user"` + motion tokens; `AnimatePresence` for screens instead of the blanket `animate-enter` | H | M | M |
| Global | ★ Type details: Inter opsz, tabular-nums, balance/pretty, curly quotes and …, size-based tracking | M | L | L |
| Global | Align header and content edges (S14); widths per screen (§2) | M | L | L |
| Global | Ring mark, wordmark, favicon set, OG image | M | M | L |
| Intro | ★ Asymmetric hero with a live mini report; three-fact privacy row; straight to Check, profile asked lazily | H | M | M |
| Profile | Auto-advance and number-key shortcuts; shown only when a tool needs it | L | L | L |
| Check | ★ Don't pre-disable "Check it" (validate on click); reveal Sender and Company on autofill or "Add details"; fold both optional pill groups into "Add context (optional)" | H | L | L |
| Checking | ★ Step list inside the report frame, with real per-step outcomes, show delay and minimum time, slow-step copy, checklist → coverage morph | H | M | M |
| Report | ★ **Remove scroll-reveal; evidence always rendered** (S3) | H | L | L |
| Report | ★ Ring v2: 56 px tabular number, coverage ticks, choreographed reveal, a non-empty good state (S4) | H | M | L |
| Report | ★ Verdict action line + top-3 reasons; one severity-sorted evidence list; good signs collapsed on high risk | H | M | L |
| Report | ★ Annotated-message view with two-way linked marks (the signature) | H | M | M |
| Report | ★ Footer: one primary + a compact secondary row; hide Tailor and Practice on high risk (S6) | M | L | L |
| Report | ★ Quick question: ring animates old→new + delta chip + live region (S7) | M | L | L |
| Report | Quotes in the explanation use the mark style, not accent blue (S5) | M | L | L |
| Tailor | ★ Side-by-side Before / Suggested with word-level highlights; Accept morphs into the bullet; sticky "N changes · Download PDF" bar (S8) | H | M | M |
| Tailor | "How to tailor" collapses to a one-line summary ("Confident · Light touch · Same length ▾") | M | L | L |
| Tracker | ★ Designed empty states and dashed placeholders; compact cards (company, role, risk tag, one "Move →" + a "…" menu with Edit and Delete-with-Undo) | M | L | L |
| Interview setup | ★ Round cards (title, ~minutes, what you'll practice, what feedback you get) instead of pills; pre-filled from the report | H | L | L |
| Live coding | ★ 1200 px split pane at ≥1024 px (problem left; editor and console right); de-duplicate "6 of 6" (S10); accessible dark syntax theme with no purple (S11) | H | M | M |
| Boards | 14 px node labels, 8 px snap and a dot grid, bigger default nodes; keep the Boxes/Arrows list for screen readers only (S12) | M | M | L |
| Feedback | ★ Scorecard at the top: rubric rows ✓ / – (the "Checked by code" items moved up), "One thing to try next" highlighted, and quotes highlighted *inside the user's answer* with the same mark system as the report (S13) | H | M | L |
| Feedback | Light momentum: "3 rounds practiced this week" from localStorage; no streaks, badges or confetti | L | L | L |
| Errors | Copy rewrite (§8); keep the pasted text; errors inline next to their cause | M | L | L |

---

## 14. Prioritized plan: Thu Oct 22 (after the 3 PM ET review) → Mon Oct 26, 5 PM ET

For 1 dev with AI coding agents. After each block, run Playwright screenshots at 1440 and 390 in light, dark and reduced motion, and keep the 641 tests green.

**Thu evening, Day 0 (about 3 h): foundations, low risk**
1. Remove scroll-reveal and make evidence always visible. **P0, about 30 min.**
2. Swap in the Direction A tokens and the dark elevation steps; fix the input borders and the container alignment.
3. Typography details: opsz, tabular-nums, balance/pretty, curly quotes.
4. `npm i motion`; set up `LazyMotion` + `MotionConfig reducedMotion="user"`; add the motion tokens to `@theme`.

**Fri, Day 1: the hero report**
5. Ring v2: coverage ticks, 56 px tabular number, the good-state dot, reveal choreography, skippable.
6. Verdict action line + top-3 reasons + one severity-sorted evidence list; collapse good signs and Couldn't check.
7. Footer: one primary + a secondary row; hide the tier buttons on high risk.
8. Quick-question score animation + delta chip + live region.

**Sat, Day 2: the signature and the wait**
9. Annotated-message view with two-way linked marks (from the existing quote offsets); unify the quote style.
10. Checking screen inside the report frame; checklist → coverage morph; real per-step outcomes replayed from the final payload (streaming is post-hackathon); timing hygiene and slow-step copy.
11. Check screen: submit enabled, progressive Sender and Company, optional context collapsed.

**Sun, Day 3: career tools that feel like products**
12. Live coding split pane + fixed dark syntax theme + de-duplicated status.
13. Interview round cards + a feedback scorecard with highlighted answer quotes.
14. Tailor side-by-side diff + Accept morph + sticky download bar.
15. Tracker empty states, compact cards, Undo on delete.
16. Intro asymmetric hero with the live mini report; profile asked lazily.

**Mon, Day 4 (freeze at about 2 PM ET): polish and proof**
17. Brand: ring mark, favicon set, OG image.
18. Error copy pass. Accessibility pass: axe or Lighthouse, a keyboard-only run through the report, a reduced-motion run, 200% zoom and 390 px reflow, print.
19. Run the §9 checklist on every screen; record the demo (the reveal and the annotated message are the money shots).
20. 2–5 PM: buffer, the Devpost write-up, final screenshots.

**If time runs short, cut in this order:** 16 → 14 → 17 → 15. **Never cut** 1, 5, 6 or 9.

**Post-hackathon:**
- Real NDJSON streaming of check stages.
- React `<ViewTransition>` screen morphs.
- A fully custom icon set on one grid.
- A Direction B serif experiment on the report.
- A high-contrast theme generated from the OKLCH tokens (Linear's "contrast" input).
- Board auto-layout and templates.
- A practice history timeline.
- Testing with screen-reader users.
- Subtle grain on the intro.

---

## 15. Pitfalls to avoid, and licensing flags

**Pitfalls:**
- Animating everything once a library is installed. Only the report reveal is expressive.
- Bounce on a scam result.
- A celebratory "safe" moment.
- Any scroll-reveal.
- Count-ups when reduced motion is on.
- `transition: all`.
- Animating `width` or `height` in CSS. Use Motion layout animations or `grid-template-rows: 0fr → 1fr`.
- Color-only marks.
- Accent blue on non-interactive highlights.
- "Adding design" by adding more cards. Take borders away and use spacing first.
- Shadows in dark mode. Use surface steps instead.
- Purple anywhere, including the syntax theme.
- Stock shield icons and shadcn defaults.
- Mixing Motion layout animations and View Transitions on the same element.
- Spinners without a show delay, which makes fast steps flicker.
- Fake progress. When steps are replayed from the final payload, the outcomes must be real.

**Licensing and paid flags:**
- **Free (SIL OFL):** Inter, Geist and Geist Mono ([Google Fonts](https://fonts.google.com/specimen/Geist)), Instrument Sans, Newsreader, [IBM Plex](https://github.com/IBM/plex).
- **Free icons:** Lucide (ISC), [Phosphor](https://phosphoricons.com/) (MIT).
- **Söhne is paid** (Klim; [licensing](https://klim.co.nz/retail-fonts/soehne/)). Not recommended.
- **General Sans** uses the Fontshare / ITF Free Font License ([link](https://www.fontshare.com/fonts/general-sans)). It's free to use but not OFL, so check the redistribution terms before self-hosting.
- **SF Pro** can't be embedded as a web font. Use the system stack only.
- **Motion** is MIT. The paid "Motion+" add-on isn't needed.
- **View Transitions** (React / Next) are free.

Nothing in this plan needs a paid tool or an account.

---

## 16. Source list (all checked Oct 22, 2026)

**Platform guidelines**
- Apple HIG: [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) · [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) · [Color](https://developer.apple.com/design/human-interface-guidelines/color) · [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- Material 3: [Easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs) · [Transition patterns](https://m3.material.io/styles/motion/transitions/transition-patterns)
- [Fluent 2 Motion](https://fluent2.microsoft.design/motion) · [IBM Carbon Motion](https://carbondesignsystem.com/elements/motion/overview/)

**Motion and View Transitions**
- Motion: [install](https://motion.dev/docs/react-installation) · [bundle size](https://motion.dev/docs/react-reduce-bundle-size) · [spring](https://motion.dev/docs/spring) · [accessibility](https://motion.dev/docs/react-accessibility) · [layout](https://motion.dev/docs/react-layout-animations) · [AnimatePresence](https://motion.dev/docs/react-animate-presence) · [MotionConfig](https://motion.dev/docs/react-motion-config)
- [Next.js view transitions guide](https://nextjs.org/docs/app/guides/view-transitions) · [React `<ViewTransition>`](https://react.dev/reference/react/ViewTransition) · [Next.js 16 release](https://nextjs.org/blog/next-16)
- [web.dev: same-document VT Baseline](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available) · [Chrome: View Transitions](https://developer.chrome.com/docs/web-platform/view-transitions) · [caniuse: View Transitions](https://caniuse.com/view-transitions)

**Practitioner essays**
- Emil Kowalski: [Great animations](https://emilkowal.ski/ui/great-animations) · [You don't need animations](https://emilkowal.ski/ui/you-dont-need-animations) · [Building a toast component](https://emilkowal.ski/ui/building-a-toast-component) · [Sonner](https://sonner.emilkowal.ski/)
- [Rauno Freiberg: Invisible details of interaction design](https://rauno.me/craft/interaction-design)
- Josh Comeau: [Spring physics](https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/) · [Reduced motion in React](https://www.joshwcomeau.com/react/prefers-reduced-motion/)
- [auto-animate](https://auto-animate.formkit.com/) · [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) · [Geist](https://vercel.com/geist/introduction) · [Linear UI redesign](https://www.linear.app/now/how-we-redesigned-the-linear-ui) · [Refactoring UI](https://www.refactoringui.com/)

**Type and color**
- [Inter](https://rsms.me/inter/) · [Inter 4.0 release](https://github.com/rsms/inter/releases/tag/v4.0) · [Google Fonts: opsz](https://fonts.google.com/knowledge/glossary/optical_size_axis) · [Geist](https://fonts.google.com/specimen/Geist) · [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) · [Newsreader](https://fonts.google.com/specimen/Newsreader)
- [Radix Colors](https://www.radix-ui.com/colors) · [Radix: understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) · [oklch.com](https://oklch.com/) · [Evil Martians: OKLCH in CSS](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl) · [MDN: oklch()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch)
- Tailwind: [colors](https://tailwindcss.com/docs/colors) · [theme](https://tailwindcss.com/docs/theme)
- [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/) · [APCA](https://apcacontrast.com/)
- MDN: [text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) · [font-variant-numeric](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric) · [hanging-punctuation](https://developer.mozilla.org/en-US/docs/Web/CSS/hanging-punctuation)

**Accessibility (WCAG 2.2)**
- [Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) · [Focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) · [Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) · [Use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) · [Status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) · [Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [caniuse: Vibration](https://caniuse.com/vibration)

**UX research and content design**
- NN/g: [Response times](https://www.nngroup.com/articles/response-times-3-important-limits/) · [Progress indicators](https://www.nngroup.com/articles/progress-indicators/) · [Long waits](https://www.nngroup.com/articles/designing-for-waits-and-interruptions/) · [Skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) · [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) · [Empty states](https://www.nngroup.com/articles/empty-state-interface-design/) · [Error messages](https://www.nngroup.com/articles/error-message-guidelines/) · [Onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/)
- GOV.UK: [Error message](https://design-system.service.gov.uk/components/error-message/) · [Validation](https://design-system.service.gov.uk/patterns/validation/)
- [Polaris empty states](https://polaris-react.shopify.com/patterns/empty-states) · [Mailchimp voice and tone](https://styleguide.mailchimp.com/voice-and-tone/)

**Report-pattern references**
- [Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring) · [VirusTotal](https://www.virustotal.com/) · [Dependabot alerts](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts) · [Snyk](https://snyk.io/) · [Grammarly](https://www.grammarly.com/) · [Have I Been Pwned](https://haveibeenpwned.com/) · [Google Security Checkup](https://myaccount.google.com/security-checkup)

**Brand and implementation**
- [Favicons: six files (Evil Martians)](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) · [Next app icons](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons) · [Next OG image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- [CodeMirror One Dark](https://github.com/codemirror/theme-one-dark) · [Lucide](https://lucide.dev/) · [Phosphor](https://phosphoricons.com/)
- [Apple fonts (SF license)](https://developer.apple.com/fonts/) · [Söhne (paid)](https://klim.co.nz/retail-fonts/soehne/) · [General Sans (Fontshare license)](https://www.fontshare.com/fonts/general-sans)

**Reference products:** see the links in §3.
