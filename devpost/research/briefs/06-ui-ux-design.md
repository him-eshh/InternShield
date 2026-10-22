# Brief 06: UI/UX and visual design

*Context: read 00-overview first. This brief describes the current look, feel, motion and user journey. The creator's verdict after reviewing 40+ screenshots: **it works and it's clean, but it's too generic.** He wants it **engaging, easy to use and polished, with proper animations**, and specifically **not** "vibe-coded" or AI-template-looking. Please find concrete design directions and real references we can learn from, and tell us exactly what to change.*

## 1. The creator's taste (hard constraints)
- **Likes:** an Apple-product-page calm, lots of white space, one idea per screen, big confident type, the system font (SF on Apple, **Inter** fallback), **one** soft accent color, green/amber/red **only for results**, and subtle depth (thin borders, very soft shadows).
- **Dislikes** (the generic AI/"vibe-coded" look):
  - purple/indigo gradients
  - glassmorphism and glowing blobs
  - emoji everywhere
  - cluttered dashboards and too many cards
  - stock illustrations or 3D blobs
  - generic shadcn-template sameness
  - neon colors, bouncy or gimmicky motion
  - wordy UI (copy was just cut on every screen)
- **Wants now:** more personality and craft. Motion that feels intentional, micro-interactions, a memorable hero moment (the risk ring), better onboarding, empty, loading and error states, and an interface that feels **hand-crafted and trustworthy**, because this is a safety tool for stressed students.

## 2. Tech and design tokens today
- **Stack:** Next.js 16 (App Router), React 19, **Tailwind CSS 4** (CSS-first `@theme` tokens). There is **no component library** (all hand-written), **no animation library** (CSS keyframes and transitions only), and inline SVG icons (a small home-made set: shield, check, warning, alert, info, chevron, external, spinner).
- **Font stack:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter (next/font), system-ui`. Body is 17 px with line-height 1.6, antialiased.
- **Type scale:**
  - headline `clamp(36px, 6vw, 72px)`, bold, leading 1.05, tracking −0.025em
  - subhead `clamp(26px, 4vw, 40px)`
  - level label `clamp(32px, 4.6vw, 44px)`
  - card titles 17 px semibold; secondary text 14–15 px muted
- **Colors (light / dark):**
  - background `#ffffff` / `#111113`; soft background `#f7f7f9` / `#161618`; card `#ffffff` / `#1c1c1f`
  - text `#1d1d1f` / `#ececf0`; muted `#6e6e73` / `#9a9aa2`; border `#e5e5ea` / `#2c2c31`
  - **accent `#2a5fb8` / `#6ea0e6`** (darkened so blue on a 10% blue tint passes 4.5:1)
  - good `#2e7d4f` / `#5fae7f`; warn `#9a6200` / `#d4a24c`; bad `#b8382b` / `#d9776b`
- **Shape:**
  - cards are rounded 18 px with a 1 px border and no shadow
  - buttons are full pills, min-height 48 px, 17 px semibold; primary is a solid accent with white text, secondary is bordered on the card color
  - pills (selectable chips) are min-height 40 px; the selected state is an accent border, a 10% accent fill and accent text
  - focus ring is a 2 px accent outline with a 2 px offset
- **Layout:** a centered single column. About 640 px for forms, 960 px for the report (inner 720 px), 1,040 px for the tracker. The header has the logo (shield plus "InternShield" wordmark; the wordmark is hidden on phones), a profile chip and a theme toggle (System / Light / Dark, saved in localStorage, no-flash script).
- **Motion today:**
  - Screen change: the `<main>` remounts with `animate-enter` (fade + 8 px slide up, 320 ms, `cubic-bezier(0.22,1,0.36,1)`).
  - **Risk ring:** an SVG circle (r = 88, stroke 14, round caps). The number counts up from 0 to the score over 900 ms with a cubic ease-out, and the stroke fills in sync. The ring color matches the level, with an icon and the level words below.
  - Checklist lines appear one by one; spinner → green check (or gray info for skipped/failed).
  - Evidence cards fade and slide in on scroll. The posting section expands smoothly when it scrolls into view.
  - Buttons: hover opacity 0.9, active scale 0.99. Pills transition their colors. The profile progress bar animates its width.
  - **Reduced motion:** everything becomes a 200 ms fade; the ring jumps to its final value.
- **Accessibility:** works with the keyboard alone, visible focus, screen-reader announcements of the result ("Strong signs of a scam, risk 100, 7 red flags"), an icon with every result color, contrast checked in both themes, focus moved to the new screen's heading, and print styles.

## 3. The user journey, screen by screen (as built)
1. **Intro** (first visit): the headline "Is this offer real?" centered on a faint, large ring outline in the accent at 12% opacity, the subline "Paste a recruiter message. See the evidence.", a **Get started** pill, and a small privacy line at the bottom.
2. **Profile steps** (one question per screen, thin progress bar, back arrow):
   - **Field:** big tappable cards (Tech / Business / Finance / Design and arts / Other)
   - **Level:** Freshman … New grad
   - **Skills:** a text box that turns entries into chips, plus suggested chips per field
   - **Resume:** a dashed drop zone ("PDF or Word (.docx)"), "Saved on this device.", and "Skip for now"
3. **Check screen:**
   - The headline "Is this offer real?" and one large rounded auto-growing textarea.
   - Sender and Company fields with "filled from message" tags.
   - "Where did it come from? (optional)" source pills and "Where are you with them? (optional)" stage pills.
   - An "Upload a screenshot" control, a big **Check it** pill ("Paste a message first." while disabled), and "Try an example: a scam · a real one" links.
4. **Checking:** the "Checking the message" subhead and a 5-line live checklist with spinners → checks.
5. **Report:**
   1. an "Example" tag, then the **risk ring** (hero), the level words with an icon, and a tappable coverage line ("9 of 14 checks ran · couldn't check …")
   2. a status banner if needed
   3. the "A few quick questions" card
   4. the explanation (AI paragraph(s) with highlighted quotes, or the fallback's "Our take / What stood out / What to do next")
   5. evidence groups **Sender / Message / Offer** with count badges; each card has a colored left bar, icon, bold title, optional "Critical" tag, italic quote, a one-line why and a source link
   6. a collapsed gray "Couldn't check"
   7. **for low risk:** "The real posting" card that expands into a match table ("The message says / The posting says / Matches / Doesn't match") and an official apply button; **for medium/high:** a "What to do now" card, report buttons (FTC, IC3, LinkedIn/Handshake) and **Copy report**
   8. a footer with the official careers link, "Report a scam to the FTC", the tier buttons (Save to tracker / Tailor my resume for this / Practice an interview for this) and **Check another message**
6. **Tailor your resume:** job details, a "How to tailor" options card, a resume list grouped by section with filter pills, an inline note box, a Before/Suggested diff card with Accept / Keep original, and Download PDF.
7. **My applications (tracker):** 3 columns (Saved / Applied / Interviewing) on desktop, stacked on phones. Cards have the company, role, risk tag, link, notes, and move/delete buttons (arrow keys work). There's an "Add an application" form, and the empty state says "None yet."
8. **Practice an interview:** a setup form, then the round screen with a question card and answer box. Live coding has a CodeMirror editor, a language switch, Run examples / Submit / Stop / hint, and an output panel. System design and the challenge use an SVG board with a tools row (add box types, connect, export PNG). Feedback shows a summary, then per-answer cards ("Your answer", "What worked", "Try next time", "Quote from your answer", "STAR check", "Checked by code").
9. **Error and empty states:** calm one-liners ("This doesn't look like a job message" plus Try again; "We're busy. Try again in a moment."; "InternShield is resting for today."; "We couldn't read the message, so this result is incomplete.").

## 4. Honest self-critique (what we think makes it feel generic)
- Every screen is the same centered column with the same headline style, pills and bordered cards. Nothing distinguishes the report from a form, or the core check from the career tools.
- The core check has no clear visual brand beyond a blue shield and a ring. The logo is a stock-style shield icon.
- Motion is a single fade-and-rise everywhere. There's no choreography or shared-element transitions (e.g. the checklist morphing into the report, or the pasted message morphing into the quoted evidence), no satisfying "result reveal", and no tactile feedback on pills and toggles.
- The report is long and text-heavy. The evidence cards all look the same, so it's hard to scan what matters most. Quotes aren't visually tied back to the original message.
- The checking wait (2–8 s) is just a list of spinners.
- The career tools (tailor, tracker, interviews) feel like forms rather than products: no progress, no sense of momentum, no rewarding completion.
- Empty states are bare ("None yet."), and onboarding is plain.
- Dark mode is a straightforward inversion without much character.

## 5. Research questions (please include links and screenshots or descriptions for every reference)
1. **Design directions.** Propose 2–3 distinct directions that fit the taste above (e.g. "editorial calm", "precise instrument / lab report", "warm and reassuring") and suit a **trust and safety tool for students**. For each, give the type pairing (system/Inter vs alternatives like Geist, SF Pro Display, Söhne, IBM Plex, Instrument Sans, General Sans; free licensing only), a color system (one accent plus result colors plus neutrals for light and dark; consider OKLCH and Radix Colors or Tailwind palettes), spacing and radius, iconography (Lucide, Phosphor, SF Symbols-style, custom), illustration (none vs subtle line art), and how the risk ring and evidence would look. Which direction would you pick, and why?
2. **Reference products.** With links, list real sites/apps that nail calm, trustworthy, engaging UI in these spaces:
   - **trust and safety / security:** 1Password, Apple's Privacy pages, Proton, Have I Been Pwned, Google Safety Center, Malwarebytes, Norton Genie, Bitwarden
   - **career tools:** Teal, Simplify, Handshake, LinkedIn's new job-seeker features, Wellfound, Otta/Welcome to the Jungle, Huntr
   - **interview practice:** Google Interview Warmup, Exponent, interviewing.io, Hello Interview, LeetCode's new UI, Yoodli, Final Round AI
   - **finance/health apps that make scores feel clear:** Credit Karma, Monzo, Apple Health/Fitness rings, Oura, Whoop, Copilot Money, Linear's polish, Stripe's dashboard, Arc, Raycast, Things 3, Vercel, Resend

   For each, what specifically should we borrow (layout, motion, copy tone, data viz)?
3. **Motion guidelines.** Concrete motion specs we can implement: durations, easings and springs, and choreography for screen transitions, list stagger, the result reveal (ring and level), the checklist → report handoff, expanding sections, pill selection, toast/confirmations, and the score change after a quick-question answer.
   - Cite **Apple HIG (Motion)**, **Material 3 motion** (easing and duration tokens, container transform, shared axis), **Fluent 2 motion**, IBM Carbon motion, and practitioner sources (Emil Kowalski's articles and Sonner/Vaul, Rauno Freiberg's "Invisible details of interaction design", Josh Comeau on springs, Framer Motion/**Motion** docs, Motion One, React Spring, View Transitions API in Next.js 16 and React 19 `<ViewTransition>`, auto-animate).
   - Recommend one library, with bundle size and React 19 / Next 16 compatibility.
4. **Micro-interactions and the hero moment.** How should the risk ring reveal feel (anticipation → count → settle; sound or haptic on mobile?) without being gimmicky for a serious "you may be scammed" result? How do Apple Fitness rings, Oura scores, Credit Karma and Have I Been Pwned handle good vs bad news emotionally? How should the tone differ between "No red flags found" and "Strong signs of a scam"?
5. **Information design of the report.** Best practice for scannable risk reports: progressive disclosure, a top-3 summary, linking quotes back to a highlighted copy of the original message (an annotated-message view), severity ordering, and showing coverage or uncertainty visually rather than as text. Cite examples like VirusTotal, Google's Security Checkup, Lighthouse reports, Snyk, GitHub Dependabot, and Grammarly's inline suggestions.
6. **Waiting states.** Patterns that make a 2–8 s multi-step check feel fast and trustworthy: skeletons vs step lists, streaming results as each check lands, optimistic partial reports. Cite research (e.g. Nielsen Norman Group on response times and progress indicators) and examples (Perplexity's step streaming, Vercel deploy logs, Arc search).
7. **Onboarding, empty and error states.** Examples of onboarding that's short and delightful without being cute. Good empty states for a tracker or practice history. Error copy that reassures. Cite NN/g, GOV.UK design system patterns, Mailchimp's content style guide, and Shopify Polaris.
8. **Making it feel hand-crafted rather than AI-generated.** What are the tells of AI-generated / template UIs in 2025–2026? Concrete techniques to avoid them:
   - custom iconography or a logo mark
   - an optical type scale and tighter letter-spacing at large sizes
   - deliberate asymmetry
   - real content in examples
   - consistent 4/8 pt rhythm
   - subtle texture or grain
   - custom focus states
   - restrained color
   - copy voice
   - attention to detail (tabular numbers, hanging punctuation, text-wrap: balance / pretty)

   Please cite essays (e.g. Rauno, Emil Kowalski, Linear's design posts, Vercel's Web Interface Guidelines, Refactoring UI) and give a checklist we can apply screen by screen.
9. **Accessibility and reduced motion.** WCAG 2.2 AA items most relevant to our screens. A reduced-motion strategy that still feels polished (e.g. crossfades instead of motion, no count-up). Color-blind-safe result colors (we already pair them with icons). Focus order through the report. Touch targets.
10. **Brand.** A distinctive but simple logo/mark idea and a name treatment that suits "InternShield". Should the ring be the brand mark? Favicon/OG image guidance.

## 6. What we'd like back
- **One recommended direction**, with a short moodboard (links), a token sheet (type scale, colors light/dark with hex/OKLCH, radii, shadows, spacing), and motion tokens (durations, easings/springs).
- **Screen-by-screen change list** for intro, profile, check, checking, report, tailor, tracker, interview and feedback, each item tagged with impact, effort and risk, so we can do the top 10–15 in 2–3 days with Tailwind 4 and one motion library.
- **Pitfalls to avoid** so the result doesn't look like another AI template.
