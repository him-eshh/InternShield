---
doc: scope
status: current-v3
---

# InternShield scope

InternShield helps a job seeker check a recruiter or job message, tailor an existing resume to a role, and practice an interview. It has five routes: Home (`/`), Check (`/check`), Tailor (`/tailor`), Practice (`/practice`), and Tracker (`/tracker`), plus an optional Profile (`/profile`). It is a browser-based single-user app with no account or persistent application database.

## Core promise

Check is evidence first: the model extracts facts with message quotes and explains after the score is fixed. Deterministic rules in `lib/scoring` set the risk level. The report separates what was found from what could not be checked, asks targeted quick questions, and can recalculate after the user adds information. A found job posting is evidence, never proof of sender legitimacy; a missing posting is neutral. The app never calls a message “safe.”

Tailor starts with the user's original PDF or DOCX. It proposes a small number of line edits, checks them against the original experience, and lets the user accept or reject them before preview and download. It does not invent qualifications. PDF cover-and-redraw does not remove the old text layer; generated PDFs are not suitable for redaction. DOCX editing is constrained by the original word layout.

Practice supports a configurable multi-question session across recruiter, behavioral, coding, SQL, case, and portfolio-style discussion where available. Code and SQL checks run locally in browser workers, with test results shown before model feedback. Questions and feedback have local fallbacks when a provider or quota is unavailable. Company-specific question ranking uses historical public list metadata as a proxy, not actual employer counts.

Tracker stores application steps locally; Profile preferences can prefill Tailor and Practice. Check reports and Practice summaries can lead into these tools with role and company context.

## Product boundaries

- Risk red, amber, and green belong only to risk results, with both icon and words.
- All example messages, resumes, and demo fixtures are made up.
- No login, account, server-side user record, claim of scam certainty, or “safe” verdict.
- Live provider calls require configured server-side keys and are subject to origin checks, size limits, per-visitor limits, daily instance caps, and provider quotas.
- Local storage holds profile, extracted resume text, last report, tracker, targets, and practice state/history. “Clear my data” removes those values but retains the theme choice.
- Check sends message text to Groq; lookups may use Tavily, Wikidata, RDAP, DNS, and optional Hunter. Tailor sends extracted resume text and posting context to Groq. Practice may send answers and short resume context to Groq. Screenshot transcription sends the browser-compressed image to Groq.

## Source of truth

`prd.md` describes current behavior and acceptance criteria; `spec.md` describes architecture and guards; `checklist.md` tracks verification. The `tier2-spec.md`, `tier3-spec.md`, and `tier4-spec.md` files record historical build plans, with current deviations called out at their tops. Earlier orchestration and stream logs are in `devpost/archive/`.
