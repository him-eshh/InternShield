# Brief 02: Quick questions and automatic gap-filling

*Context: read 00-overview and ideally 01 (the scoring rules). This brief covers how InternShield fills in missing details itself, and how and when it asks the user follow-up questions.*

## 1. Design intent (from the PRD)
- **The report comes first; questions refine it.** Nobody waits on a question to see a result.
- The tool **finds details itself first** and asks only questions whose answer would **change the score**. All of them sit in one box, and each has an "I don't know" option.
- "I don't know" never changes the score. The item is just listed under "Couldn't check".
- Not built: searching a recruiter's public profile (cut for privacy, flaky results and hijacked accounts), VoIP/line-type phone lookups (paid, weak signal), and a numeric "pay too high" check (no reliable free pay data).

## 2. Gap-filling, layer 1: the check form (before the check, pure regex in the browser, `lib/autofill.ts`)
When the user pastes text, the form auto-fills its fields and shows a small "filled from message" tag on each one. The user can edit everything.
- **Sender contact:** the first email in the text (`name@domain.tld`). If there's none, the first US-style phone number (optional +country code, then 3-3-4 digits). If neither is found, the field says "No sender found. Add it if you have it." The check still runs, and the sender checks go under "Couldn't check".
- **Company:** the first of these to match.
  1. A signature line ending in a name after a recruiting word, e.g. "HR Coordinator, Brightline Data Solutions" or "Jane — Acme Recruiting". The name is 1–4 Capitalized words.
  2. "at / with / join <Capitalized Name>".
  3. "<Capitalized Name> (Recruiting) team".
  4. The sender's email domain label, capitalized (if it isn't free email).

  Names starting with The/Our/Your/Hi/Dear/Thanks/Best/etc. are dropped. **Known bug:** "Jordan Lee from the University Recruiting team" fills in "University Recruiting" (see brief 05).
- **Source pills** (Applied on the company site / LinkedIn / Handshake / Email / Surprise text or WhatsApp). Only "thank you for applying / your application" pre-selects one, and it picks "company site". Platform names mentioned in the body are deliberately ignored, because scams say "we found your resume on Handshake" too.
- **Stage pills** (Just got a message / Interviewing / Got an offer / Signed an offer letter). Picked by phrases:
  - signed: "signed the offer", "offer letter signed", "I've signed"
  - offer: "pleased to offer", "offer you", "extend an offer", "offer letter", "congratulations"
  - interviewing: "following our interview", "your interview is/on/with", "schedule an interview", "thanks for interviewing"
- Source and stage are optional. The button only needs text.

## 3. Gap-filling, layer 2: server lookups during the check (see brief 01 for details)
- **LLM extraction** fills in company, role, pay, sender name/email/phone, asks, off-platform app, pressure, interview status, vague duties, "no experience needed", an **employer country hint**, and up to 3 other concerns. Each comes with a verified quote. Extracted values take priority over the form, except the user's sender/company form values, which are added to the prompt as a "Form:" line.
- **Official company website and careers page:** one Tavily search, `"<company> careers"`, with a name-to-domain similarity pick (job boards and ATS hosts are excluded).
- **Real posting:** one Tavily search on the official domain plus Greenhouse/Lever/Workday/Ashby. It must share a role word, and ATS hits must name the company. Pay and location are read from the snippet.
- **Sender domain facts:** free-email list, RDAP creation date, MX record, optional Hunter.
- **Employer country:** the user's answer first, then the LLM's `employerCountryHint`, then the country code of any `+NN` phone number in the text (libphonenumber-js, default region US). This only matters for the off-platform rule: chat apps are softened from 20 to 10 points when the employer is abroad and no money or data is requested.
- **Not looked up:** the recruiter as a person, the company's main phone number, company registration (state/SEC), links inside the message, or the phone number's carrier/line type.

## 4. The quick questions (`lib/scoring/questions.ts`)
Four questions exist, always in this order. Each has "I don't know".

| id | Question | Options | Relevant when… | What the answer changes |
|---|---|---|---|---|
| source | "Where did this message come from?" | I applied on the company's website / Handshake / LinkedIn / An email I wasn't expecting / A text or WhatsApp message | the user didn't pick a source pill | company site or Handshake: −10 good sign ("You applied first"); text/WhatsApp: +25 "surprise text" (and enables the "remote position text" pattern) |
| signed_offer | "Have you signed an offer letter?" | Yes / No | a sensitive-data ask (SSN, bank, ID, password) was found and no stage was picked | yes + HR portal + not a chat channel: the 40-point critical flag becomes a 5-point caution |
| had_interview | "Have you had an interview with them?" | Yes / No | the interview status is unclear, and the text or stage implies hiring ("offer", "hired", "congratulations", "welcome aboard", "start date"…) | no: +20 "You'd be hired without an interview" |
| outside_us | "Is the employer based outside the US?" | Yes / No | a chat-app move was found, no money/data was asked, and the country couldn't be worked out automatically | yes: off-platform 20 → 10 points |

**The selection algorithm (`pickQuestions`):** for each relevant, unanswered question, re-run the whole scoring engine once per real option. The question is shown only if **at least one** option changes the score. Questions that wouldn't move anything are hidden, so they don't add noise. Each question being asked, plus any relevant one answered "I don't know", also gets a "Couldn't check" line, e.g. "Where the message came from: We don't know where this message came from."

## 5. UI flow (`components/report/QuickQuestions.tsx`, `Report.tsx`)
1. The report renders with its score straight away. If any questions qualify, a rounded soft-gray card titled **"A few quick questions"** (info icon) sits **above the explanation**, under the risk ring and any banner.
2. Each question is a fieldset: the question text, then pill buttons for every option (`aria-pressed`).
3. Tapping an answer re-scores **locally** (no network). The ring animates from the old number to the new one, the cards and groups update, and `describeChange` writes one line for the biggest change, e.g. "Score went up because this came as a surprise text" or "Score went down because you applied first through an official channel".
4. A confirmation appears **directly under the answered question**: "Thanks. Score updated: <reason>" or "Thanks. The score didn't change." A screen-reader live region announces "<chosen answer>. <message>".
5. The list of questions is fixed when the report first renders, so answered questions stay visible with the chosen pill highlighted, and the user can change an answer.
6. If the **level** changes, the explanation is fetched again. Otherwise it stays as it was.
7. The heading never changes. Earlier versions put "Thanks…" in the heading or at the bottom of the box, which read as if the user were thanked before answering. That was fixed last night.

## 6. Known issues and doubts
- **Coverage:** only 4 questions exist. Many unknowns that matter aren't asked, for example:
  - "Did you reach out first, or did they?" (on LinkedIn/email)
  - "Did they ask you to pay for anything or deposit a check?" (in case it happened in a call or attachment, not in the pasted text)
  - "Is the recruiter's email the same as on the company's site?"
  - "Was the interview on video, phone, or chat only?"
  - "Did they send a check, equipment, or a link to install something?"
  - "Have you shared any personal info yet?" (this would switch to recovery advice)
- **Wording and placement:** "Where did this message come from?" overlaps with the source pills on the check form. The answer options are long on phones. The box appears above the explanation, which may make the report feel unfinished.
- **Heuristic gaps:** the stage and source regexes are thin and English-only. The company guess is regex-based. The phone regex is US-centric.
- **Abroad logic:** a +country code doesn't prove the employer is abroad (scammers use foreign or virtual numbers, real US recruiters travel). The `employerCountryHint` comes from the LLM and isn't quote-verified.
- **Answers don't feed the lookups:** answering doesn't trigger a new company or posting search. For example, if the user corrects the company name in the form after the check, they have to run it again.
- Nothing helps users verify things **themselves** (e.g. a "look up the recruiter on the company's LinkedIn page" checklist link). The PRD considered this.

## 7. Research questions
1. **What should we ask, and how?** Which follow-up questions do fraud teams, career centers and scam-check tools use to tell a real recruiter from a scam? Sources could include the FTC job-scam checklist, BBB Scam Tracker intake questions, university career-office "is this a scam?" forms, Handshake/LinkedIn reporting flows, and bank fraud-interview scripts. Which 3–6 have the highest value of information for our rule set? Suggest exact wording that a stressed 19-year-old understands in under 3 seconds.
2. **Choosing questions.** Is "ask only if an answer changes the score" the right policy? Should we rank by expected score change or information gain, cap at 2–3 questions, or ask adaptively one at a time? Is there research on progressive disclosure and question fatigue in risk checkers, or on adaptive questionnaires (computerized adaptive testing, value-of-information)?
3. **Automatic lookups we're missing.** What else can be found automatically on free tiers?
   - verifying that a recruiter name appears on the company's own site or press pages
   - the company's main phone or contact page
   - company registration (OpenCorporates free API, SEC EDGAR, state registries)
   - WHOIS privacy and registrar reputation
   - link expansion and reputation for URLs in the message (Google Safe Browsing, URLhaus, PhishTank, urlscan.io free tiers)
   - BBB business profile
   - Glassdoor/Indeed "interview scam" reports

   For each, give its terms, rate limits, and whether it's reliable enough to show.
4. **Phone numbers.** What can we responsibly infer from a phone number for free (country, region, toll-free, short code, possibly VoIP)? What do the FTC/FCC say about job-scam texts from long codes and short codes? Is "employer abroad = chat apps OK" defensible? Which countries routinely use WhatsApp for business hiring (with sources)?
5. **"I don't know" handling.** Best practice for unknowns in risk tools: should an unknown widen an uncertainty band, lower a confidence indicator, or stay neutral as now? How do other tools display "we couldn't check this"?
6. **Where the user is in the scam.** Should the questions detect that a user has *already* paid, deposited a check or shared their SSN, and switch to recovery steps (FTC IdentityTheft.gov, bank, IC3 report, credit freeze)? What does the FTC recommend, in what order?
7. **UI.** Is a single question card at the top of the report the best pattern? Alternatives: inline chips on the relevant evidence card, a stepper before the report, or a side panel on desktop. Please cite examples from real products: TurboTax-style interviews, Typeform, Stripe Radar rules UI, Google's security checkup, credit-karma style "improve your result".
8. **Auto-fill.** Better free or local ways to extract company and sender reliably: named-entity recognition in the browser (compromise.js, wink-nlp, transformers.js NER models), the LLM step itself, or signature-block parsers like Talon or email-reply-parser. How do we avoid picking team or department names ("University Recruiting", "Talent Acquisition") as the company?

Please end with a concrete proposal: the final question set (wording, options, trigger, score effect), the lookups to add, and the UI placement, ranked by impact vs effort for a 3–4 day window.
