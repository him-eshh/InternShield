---
doc: scope
status: approved
---

# InternShield

Paste a job or recruiter message and get an evidence-based scam-confidence report. If the message holds up, find the real posting and act on it.

## The Unique Kernel
**Evidence, not opinion.** The AI never decides whether a message is a scam.
- **AI extracts facts.** It pulls out the company, role, pay, what they're asking you to do, which app they want to move you to, and any pressure tactics.
- **Fixed rules score them.** The score comes from deterministic checks, not the AI.
- **AI explains the result** in plain English, after the score is set.
- **The real posting is cross-checked,** so a legitimate offer isn't thrown out just because it *looks* suspicious. A found posting is evidence, not proof, because scammers copy real postings. A missing posting is neutral.
- **It never says "safe."** It says "no red flags found" and always links the company's official careers page or contact so you can verify for yourself.

## Who It's For
Students and job seekers in any field who get recruiter messages through Handshake, LinkedIn, email, or text. They can no longer tell AI-polished scams from real offers, so they either risk getting scammed or start ignoring *everything*, including real offers. Today they guess, or paste the message into ChatGPT and get an opinion that can hallucinate.

## The Core Loop
A message arrives. They paste three things into the site: the whole message, the sender's contact details, and the company the message claims to be from. They get a score that fills in with evidence cards, green for good signs and red for bad ones. Each card explains *why*, so over time they learn to spot the patterns themselves. If no red flags are found, they follow the official link to the real posting and apply themselves.

On first visit, a quick form asks for their field, level, and skills. That profile, along with any uploaded resume, stays in the browser. There's no login and nothing is stored on a server.

## Inspiration & Identity
- **Look:** clean and calm, with lots of white space and one big clear headline, like Apple's product pages (https://www.apple.com).
- **Motion:** the score counts up or fills in as a ring, and evidence cards appear one at a time.
- **Flow:** moving from the report to the posting to later steps feels like smooth transitions, not page jumps.
- **Mobile:** it has to look good on a phone.

## Why This Matters to the Learner
Himesh is hunting for a summer internship himself. He's seen scam messages get "much more intense," realistic enough to pass as real offers on trusted platforms. He's also seen people on Reddit and elsewhere ignore *real* offers because of all the scams. He wants students to stop missing real offers.

## What "Working" Looks Like
The demo uses two real messages, with the recruiter's personal details blurred:
1. **A scam message he actually received.** The report says it's most likely a scam and shows exactly why, card by card.
2. **A real message from a recruiter.** The report shows no red flags with the evidence behind that, finds the real job posting, and gives the official link to apply.

**The "oh, that's cool" beat:** both messages look equally convincing, but the tool tells them apart and shows its evidence.

**Thursday (Will It Ship review) target:** the full core working on both demo messages. The tailored resume is a bonus if time allows.

**Final deadline:** Monday, Oct 26.

## The POC Boundary
The **Core** is the finish line:
- First-visit profile form (field, level, skills), saved in the browser.
- Resume upload, also saved in the browser. It feeds the level check now and the tailored resume in Tier 2.
- Paste the message, sender contact, and claimed company.
- AI fact extraction. The AI only extracts and later explains; it never scores.
- Rule-based checks:
  - **Sender identity:**
    - Does the sender's email domain match the company's real domain?
    - Is it a free email (like Gmail) from someone claiming to be a recruiter?
    - Was the domain registered recently?
  - **Red-flag requests:**
    - Asking for money, sending a check, or asking you to buy equipment.
    - Moving you to WhatsApp, Telegram, or text-only interviews.
  - **Fit with the role:**
    - Is the role far above the user's level? This uses the uploaded resume plus the level from the profile form.
    - Field-specific scam patterns. The exact patterns get defined in `3-prd`.
  - **Recruiter search:** a web search for the recruiter that shows whether a public profile was found, with the link. Information only.
- Real-posting lookup and cross-check:
  - Does the pay or role match the posting?
  - Does the sender belong to the company?
  - Does the contact method match how the posting says to apply?
  - Not found → say so, and treat it as neutral.
- Animated confidence report with evidence cards, a plain-English explanation, and the official careers or contact link.

## Later
Build these in order, each only after the one before it works:
- **Tier 2:**
  - **Tailored resume:** generated from the uploaded resume as a downloadable PDF. Select a section to request changes. It only rewords real experience and never makes anything up.
  - **Application tracker:** a board for each offer with stages like saved, applied, and interviewing.
- **Tier 3:** a mock interview based on the posting, company, and resume.
  - **Everyone:** recruiter screen and behavioral round.
  - **Tech:** a live coding round with an in-browser editor that runs Python and JavaScript, plus a system design round on a drawing board. These are meant to be the standout.
- **Tier 4:** interview rounds for the other fields:
  - **Business:** case interviews.
  - **Finance:** technical questions.
  - **Design and arts:** a portfolio walkthrough plus a design challenge.

## Explicitly Cut
- **The AI deciding the verdict.** It can hallucinate, and a scammer could hide instructions in the message to manipulate it. The rules decide instead.
- **Calling any message "safe."** No tool can guarantee that. The report says "no red flags found" and points to official channels.
- **Login, accounts, and server-side storage.** They aren't needed. The profile and resume stay in the browser.
