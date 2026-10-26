---
doc: submission-draft
status: ready-for-owner-review
---

# InternShield submission draft

**Publication state:** local build verified; live deployment, demo video, and Devpost submission are pending. Replace placeholders only after each item exists and has been checked.

- Live app: **[deployment URL pending]**
- Demo video: **[recorded video URL pending]**
- Source repository: **[public release URL pending owner review]**

## Short description

InternShield helps internship seekers check suspicious job messages, carefully tailor an existing resume, and practice interviews in one connected workflow.

## Project story

Job seekers often have to judge a recruiter message before they know whether to spend time on an application. A convincing message can still ask for money, personal details, or a move to an unverifiable channel. InternShield starts with the message and shows *why* it deserves caution: source quotes, rule-based warning signs, checks that ran, and checks that could not be completed. Its risk score is a decision aid, not a probability or a guarantee that an offer is genuine.

From that report, the user can continue with the same role in Tailor and Practice. Tailor starts with the user's original PDF or DOCX, suggests limited line edits, rejects common unsupported additions, and lets the user accept, reject, adjust, preview, and download. Practice runs a configurable sequence of questions, including coding and SQL exercises with local test results. Discussion answers receive coaching without an unsupported quality grade. Profile and Tracker keep the journey connected in the browser.

We built the app with Next.js, TypeScript, and a responsive design system. A model extracts facts with exact message quotes; deterministic rules set the risk level and explain the scored flags. External lookups can add context, and failed lookups are shown as unavailable. Provider calls have server-side controls. Personal working data is stored in the browser, with a clear-data action.

The hardest product decision was choosing when to say *less*. InternShield does not mark an offer “safe” when no warning signs appear. It holds back resume edits that cannot pass the fact and layout checks. Interview reviews show test results and exact answer excerpts while discarding model-written achievement and STAR claims that a quote alone cannot prove.

Local verification passed lint, type checking, more than 1,250 tests, production build, and browser flows across desktop/phone and light/dark modes. A labeled set of 88 fabricated messages landed in their expected risk levels; a separate held-out set landed 24 of 27. These are fixture results, **not measured real-world scam-detection accuracy**.

Current limits: three held-out cases miss their expected level; one fabricated one-page PDF produced three guarded live edit suggestions, but yield across other resumes is unproven; PDF edits can leave original text extractable and are not redaction; Word edits are deliberately narrow; coding runtimes need public network assets; company-question ranking uses historical lists as a proxy. Users should verify any job through the employer's official channel and review every resume edit before sharing it.

## Suggested tags

Career tools · Job search · Scam awareness · Accessibility · Education

## Before publishing

1. Review this copy against the deployed build and remove any statement that the deployed version does not support.
2. Add only verified app, demo, and public source links.
3. Record the demo with fabricated inputs and confirm no private browser data or provider credentials appear.
4. Submit on Devpost and record the actual submission link and date in the release checklist.
