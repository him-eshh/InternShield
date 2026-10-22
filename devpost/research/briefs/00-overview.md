# InternShield: project overview (shared context for every brief)

*Send this first. Briefs 01–06 each cover one area in depth and assume you've read this page.*

## What it is
InternShield is a free web app for **students and early-career job seekers in any field** (tech, business, finance, design and arts, other). They get a recruiter message by email, LinkedIn, Handshake, text or WhatsApp, and can't tell whether it's a real offer or an AI-polished scam. They paste the message, or upload a screenshot of it, and get an **evidence-based scam-risk report**: a 0–100 "Risk" ring, one of three levels ("No red flags found", "Some warning signs", "Strong signs of a scam"), a plain-English explanation, and evidence cards that quote the message word for word. When there are no red flags, it also looks for the **real job posting** on the company's own site and compares it with the message.

There are career tools around the core check. All of them are built and live behind feature flags:
- **Tailored resume:** reword single resume bullets toward a posting, with a guard against invented facts, then download a PDF.
- **Application tracker:** a Saved / Applied / Interviewing board.
- **Screenshot upload:** a vision model copies the text out of a screenshot.
- **Mock interviews:** recruiter screen and behavioral for everyone. Tech gets live coding (Python/JS) and system design. Business gets a case interview. Finance gets technical questions. Design gets a portfolio walkthrough and a timed design challenge.

## Core principle
**The AI extracts and explains. Fixed, transparent rules do the scoring.** An LLM pulls facts out of the message, and each fact must come with an exact quote that's checked word for word. A regex "backstop" scans the raw text too, so prompt injection can't hide a critical flag. A deterministic rule engine computes the score. The LLM then writes a short explanation from the computed flags only. The product never says "safe", "legit" or "guaranteed".

## Status and deadline
- This is a solo hackathon project ("Will It Ship" style), built in about 5 days.
- **Review checkpoint: Thu Oct 22, 2026, 3 PM ET.**
- **Final submission: Mon Oct 26, 2026, 5 PM ET (Devpost).** Anything recommended should be realistic for 1 developer with AI coding agents in about 3–4 days, or clearly marked as "post-hackathon".
- Current state: all tiers are merged. There are 641 unit/UI tests and a 26-message labeled eval set that scores 26/26. A bug-fix and UX-polish pass was just merged.

## Stack
- **Frontend and backend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4. The API routes are Next route handlers. Deployment target is Vercel Hobby (free).
- **LLMs:** Groq API, free tier.
  - `openai/gpt-oss-20b` and `openai/gpt-oss-120b`: extraction and explanation, each falling back to the other.
  - `qwen/qwen3.8-27b`: a **preview** vision model used for screenshots, resume rewording and interviews. Rewording falls back to gpt-oss-20b.
- **Search:** Tavily API, free tier, "basic" depth, max 5 results. Used to find the company's official domain/careers page and the real posting.
- **Domain checks:** RDAP (rdap.org) for domain registration date, and DNS-over-HTTPS MX lookup (Google, then Cloudflare). Hunter.io Email Insight is optional and off without a key.
- **Other libraries:** libphonenumber-js (phone country), tldts (registrable domains), pdfjs-dist and mammoth (resume reading in the browser), pdf-lib (PDF output), CodeMirror 6 (code editor), Pyodide (Python in a Web Worker).
- **Testing:** Vitest, plus a Playwright QA harness with mocked APIs.

## Constraints
- **Free plans only, no credit card.** Groq free-tier token/request limits per model, Tavily free credits, Vercel Hobby (4.5 MB body limit, short function time).
- **Budget guards:**
  - Site-wide daily caps: 120 checks, 80 searches, 30 rewrites, 20 transcriptions, 50 interview calls.
  - Per-visitor limits: 3 checks a minute / 20 a day, and similar for the tiers.
  - The counters are in-memory per server instance (best-effort).
- **No accounts, no database, no server storage.** The profile (field, level, skills), resume text, tracker, tailored lines, interview sessions and theme are saved only in the browser (localStorage). Reports and pasted messages are not saved anywhere, and "Copy report" is the only way to keep one.
- **Privacy line shown to users:** "Your message goes to an AI and a search service for the check. Nothing is stored. Screenshots are read by AI, then discarded."
- All examples and test messages are **made up**. Real recruiter messages are never shipped.

## Users and taste
- Students (often international students, often first-time job seekers), plus career-center staff they share reports with.
- **Look and feel:** Apple-product-page calm, with the system font (Inter as fallback), lots of white space, one soft-blue accent, and green/amber/red used only for results. The creator dislikes the generic "AI/vibe-coded" look and now wants the UI more engaging and polished, with proper motion (see brief 06).

## The briefs
| # | Area |
|---|---|
| 01 | Scam scoring: signals, weights, explainer, eval set |
| 02 | Quick questions and auto gap-filling |
| 03 | Resume tailoring |
| 04 | Interview prep: all rounds, coding runner, grading |
| 05 | Known bugs that still need fixing |
| 06 | UI/UX and visual design |

**For every brief:** please give specific, citable recommendations (link the paper, FTC/FBI/BBB page, product, design system, or docs). Rank them by impact vs effort for a 3–4 day window, and mark anything that needs paid services or accounts.
