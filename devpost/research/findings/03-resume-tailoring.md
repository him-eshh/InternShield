# Findings 03: Resume tailoring

*Research for brief 03. Researched Thu Oct 22, 2026, around 1:15–1:20 AM ET. Every link below was opened or checked during this session unless it's marked **[unverified]**. Where I give vendor statistics, I name the vendor, because most resume statistics come from companies that sell resume tools. All examples are made up.*

---

## TL;DR

1. **Fix parsing first (P0).** Real PDF and DOCX uploads probably arrive as one long line, which breaks every later step. Without newlines, nothing else on this list works on real files.
2. **Copy what the best tools share, and do most of it without the LLM:**
   - a keyword-gap panel that separates required from preferred terms
   - **2–3 alternatives** per request
   - an "ask me for the number" flow
   - a "what we didn't add and why" panel

   InternShield already does better than most of them on honesty, because its guard runs in code. Lean on that in the demo.
3. **Don't show an "ATS score".** No ATS vendor publishes a universal score.
   - The "75% rejected by ATS" figure traces back to a 2012 sales claim.
   - Real auto-rejection is set up by the employer through knockout questions.
   - Greenhouse's AI matching is documented as not rejecting anyone.

   Show "6 of 8 required terms found" with honest wording instead.
4. **Guard v2 should stay deterministic and cheap.** Add:
   - an inflated-verb ladder
   - scope words
   - qualifier-drop warnings
   - synonym aliases
   - a "from the posting, not your resume" label
   - a soft-warning tier

   Two 2026 preprints suggest prompt rules alone aren't enough. Code checks plus a human-review diff, which is InternShield's design, are the recommended pattern.
5. **Whole-resume LLM tailoring in one call doesn't fit the Groq free limits** (8K tokens per minute per model). Do section-level work with code instead: reorder skills and bullets with deterministic scoring, and spend one LLM call on the summary. A full LLM pass is post-hackathon work.

---

## Budget reality (affects every recommendation)

**Groq.** The rate-limits page lists the same limits for `openai/gpt-oss-20b`, `openai/gpt-oss-120b` and `qwen/qwen3.8-27b`: **30 RPM, 1K requests/day, 8K tokens/min and 200K tokens/day.** Limits apply **per organization**, so the scam check, rewrites and interviews all share them. Source: https://console.groq.com/docs/rate-limits.
- **Caveat:** the page also says the table shows "base limits for the Developer plan". Check the free-tier numbers on your org's Limits page in the console before tuning the caps **[unverified for free tier]**.

**Groq structured outputs.** `strict: true` uses constrained decoding and guarantees the JSON schema. It's supported on gpt-oss-20b, gpt-oss-120b and qwen3.8-27b. Streaming isn't supported with structured outputs. Source: https://console.groq.com/docs/structured-outputs.

**Vercel Hobby.** Max duration is 300 s, memory is 2 GB, and request and response bodies are capped at 4.5 MB. Source: https://vercel.com/docs/functions/limitations.

**Token estimate (my estimate, using the usual rough rule of 1 token ≈ 4 characters of English, not measured).** Today's rewrite call is about 400 system tokens, up to 500 for the job description, about 150 for the line, plus output, so roughly 1.2–1.6K tokens.
- Returning 3 alternatives in one JSON call adds roughly 200–300 output tokens. It's still about 1.5–2K tokens and only **one request**.
- A whole resume at the 20K-character cap is about 5K tokens. Add the job description and a full rewritten resume as output and you're over 8K tokens, so it doesn't fit one minute's TPM. **A single-call whole-resume pass isn't feasible on the free tier.** A per-section call of about 1.5–3K tokens is.
- The 30/day site cap is self-imposed and could probably go to 60–100 if scam checks stay well under the shared 200K tokens/day. Also cache identical requests (same line + options + job-description hash) in localStorage.

---

## 1. How do best-in-class tailoring tools work?

### What each tool's own documentation says

| Tool | What it analyzes | What it generates | How suggestions are shown | Source |
|---|---|---|---|---|
| **Teal** (Job Matcher) | Keywords from the job description, marked present (green) or missing (red). Free users see a limited keyword list. | From a missing keyword: pick the **position** to add it to, pick or add more keywords, then the AI writes bullet **options** ("use bullet" or "regenerate"). The (+) adds the keyword to Skills. | Hover a keyword to scroll to it in the resume, **ignore** it, or create a bullet from it. | https://help.tealhq.com/en/articles/12060992-using-the-job-matcher |
| **Jobscan** (AI Optimize, Premium) | Match Rate from hard skills, soft skills and job title. Its own help page lists keyword presence, frequency/density, exact match and parsing. | In-context suggestions. Click a keyword to get **three bullet options**. | One-click **accept/reject**, Match Rate updating live, a side-by-side **Compare** view, and the original preserved. | https://www.jobscan.co/ai-optimize · https://jobscansupport.frontkb.com/en/articles/11537345 |
| **Jobscan** (target score) | Recommends **80%**, saying users "see success" at 75%. It warns that "over-optimization" (keyword stuffing, skills you don't have) backfires. | — | — | https://www.jobscan.co/blog/what-jobscan-match-rate-should-i-aim-for/ |
| **Rezi** (AI Keyword Targeting) | Job title, company and job description. Shows missing and included keywords (green checks, highlighted in the resume). Experience level is chosen at setup. | Per missing keyword, a new bullet **placed under the best-matching job**, which the user can move. Also accept, regenerate or edit. A "Rezi Score" covers content, format, optimization and readiness. | Missing and included lists in "Finish Up". Keywords tick off automatically when added. | https://www.rezi.ai/rezi-docs/ai-keyword-targeting-explained · https://www.rezi.ai/rezi-docs/the-rezi-score-explained |
| **Kickresume** (Resume Tailoring) | Reads the whole resume "for context" (student vs senior, career changer, tech vs marketing) before tailoring. | Tailors the whole resume at **Conservative / Balanced / Turbo** levels. Says it bans "AI slop" words (its example: "spearheaded"). | A **"What we changed"** panel with every change and its reason. Clicking a keyword lights it up everywhere. **"Things to consider"** lists lines to double-check, cover-letter points, skills to build, and **"things it held back from adding because it couldn't be sure they were true for you."** The original is kept separately. | https://www.kickresume.com/en/resume-tailoring/ |
| **Resume Worded** (Resume Tailor / Targeted Resume) | A Relevancy Score that **weights required qualifications above preferred** ones. Shows matched, missing and "adjacent" skills. "Above 80" means well matched (their scale). | **Deliberately does not inject keywords.** It diagnoses the resume, and the user edits. "AutoFix" rewrites only the lines the user picks, using existing experience. | Required/preferred highlighter that runs in the browser. Advice: "6 to 10" key terms, and **a keyword inside an experience bullet is evidence, while one in a skills list is only a claim.** | https://resumeworded.com/resume-tailor |
| **Enhancv** | A "13-point ATS check" plus a match score. Checks for quantified experience, required skills and grammar. Says to aim for **70%+**. | Mirrors the job description's language, **reorders bullets by relevance**, cuts what's irrelevant, and rewrites the summary. Works from a "master resume". | An inline AI assistant: "one click to apply, one click to undo". Exports PDF and **TXT**. | https://enhancv.com/features/tailor-resume-to-job-description/ |
| **Huntr** (AI Review → AI Tailor) | Job description vs the base resume. Its keyword extractor groups hard skills, soft skills, knowledge, industry and education terms. | Suggested edits to the **summary, skills and experience** sections. | Review, edit or ignore each suggestion. Huntr recommends running AI Review on the base resume first. | https://help.huntr.co/en/articles/11535512-ai-review-ai-tailor-walkthrough · https://help.huntr.co/en/articles/11030569-keyword-extraction-matching |
| **Simplify** (Copilot, Simplify+) | A per-posting "Keywords Score" (about 70% suggested, "guidance rather than a requirement") plus a general resume score. | Reworks bullets to include missing keywords, or builds a fully tailored **separate version**. The original is never changed. | Says outright: "This does not guarantee interviews… not every keyword matters equally." | https://help.simplify.jobs/articles/0515607-auto-tailoring-your-resume-with-copilot · https://help.simplify.jobs/articles/2175778-understanding-the-keywords-score |
| **LinkedIn** (Resume Tips, Premium) | Uploaded resume vs a job posting, through the "Tailor my resume to this job" prompt. Desktop and English only. | Suggestions, and "refine sections… with suggested language". Export, or attach to a LinkedIn application. | LinkedIn itself warns: "verify the Resume Tip's responses for authenticity as they may contain inaccuracies." | https://www.linkedin.com/help/linkedin/answer/a6813101 |
| **Careerflow, Yoodli** | Not researched in depth. **[unverified]** Yoodli is a speaking and interview coach, not a resume tailor, so it's more relevant to brief 04. | | | |

### Patterns almost every tool shares (worth copying)
1. **A keyword gap list split into present and missing**, sometimes with required/preferred weighting (Resume Worded), and usually acted on one keyword at a time (Teal, Rezi, Jobscan).
2. **Start from a missing keyword and pick where it goes.** Teal and Rezi ask which role the new bullet belongs under.
3. **Several options per request.** Jobscan returns 3, and Teal offers options plus regenerate.
4. **Per-change accept/reject plus a compare view.** InternShield already has this through its word diff.
5. **The original is never overwritten.** The tailored version is a copy. InternShield's resume-hash-keyed `is:tailored` already does this.
6. **Strength levels.** Kickresume has three and InternShield has two. Kickresume's "Conservative" maps to InternShield's "Light touch".
7. **Showing what was left out and why.** Only Kickresume's documentation shows this clearly. It's the best fit for InternShield's honesty pitch.

### What users praise and complain about
Praise, from vendor-hosted testimonials (selected by the vendors themselves, so it's weak evidence): speed, and getting interviews after tailoring.

Complaints are reported in Reddit threads that I found through search; I didn't read each thread in full, so treat this as anecdotal **[partly unverified]**:
- invented skills and metrics, plus placeholder numbers
- forced templates that "hijack" the resume
- inconsistent match scores

Examples:
- https://www.reddit.com/r/ResumeCoverLetterTips/comments/1s2zzhg/are_ai_resume_tools_actually_helping_or_just/
- https://www.reddit.com/r/resumes/comments/1ds9l3r/any_good_jobscan_alternatives_that_wont_hijack/

**What InternShield can claim honestly:**
- It keeps the user's own text.
- The fabrication check runs **in code**, not only in the prompt.
- Nothing is stored.
- It's free with no account, while Teal+, Jobscan Premium, Rezi ($29/mo per its docs), Kickresume Premium, Simplify+ and LinkedIn Premium are all paid.

---

## 2. ATS and keyword best practice: evidence vs myths

### Myth: "75% of resumes are rejected by ATS before a human sees them"
- **Origin:** Preptel, a company that sold resume-optimization software, made the claim in 2012. The earliest articles were Computerworld/CIO (Mar 4, 2012) and a Scripps Howard column (Mar 22, 2012) quoting founder Jon Ciampi. Preptel published **no study, sample or method**, and it shut down in 2013. Sources:
  - https://offermic.com/blog/ats-75-percent-resume-rejection-claim
  - https://onecv.work/blog/does-ats-reject-75-percent-of-resumes

  These are secondary sources (both are resume-tool sites) that cite the primary articles. **I didn't open the 2012 originals myself.**
- The number still spreads. CNBC repeated it in 2019 as "a study from… Preptel" (https://www.cnbc.com/amp/2019/02/28/resume-how-yours-can-beat-the-applicant-tracking-system.html). Jobscan's own 2022 blog says "70% of resumes get rejected by the ATS" with no source (https://www.jobscan.co/blog/what-jobscan-match-rate-should-i-aim-for/). **InternShield should never repeat either number.**

### What is real
- **Auto-reject exists, but employers set it up through knockout questions.** Greenhouse Auto-reject rejects applicants based on their *answer to a custom application question* (Yes/No or select), for example "Do you have a Class A CDL?". It's a Plus/Pro feature. https://support.greenhouse.io/hc/en-us/articles/360000653472-Auto-reject
- **AI matching ranks candidates but doesn't reject them (Greenhouse).** Talent Matching sorts candidates into Strong, Good, Partial, Limited or Needs manual review, using recruiter-weighted criteria. It "does not auto-reject or auto-advance any candidate". And "multiple terms can map to the same calibrated skill — so a longer list of matched terms doesn't always mean a higher match score". That's direct vendor evidence against keyword stuffing, and evidence that synonyms are matched. https://support.greenhouse.io/hc/en-us/articles/41131886674075-Talent-Matching-FAQ
- **Over-strict filtering is a real employer concern.** In the HBS/Accenture *Hidden Workers* report (2021), 88% of surveyed employers said qualified high-skills candidates are filtered out because they don't match the exact job-description criteria. This measures executives' beliefs, not counted rejections. https://www.hbs.edu/managing-the-future-of-work/research/hidden-workers-untapped-talent

### How ATSs parse resumes (vendor documentation)
- **Greenhouse.**
  - Accepts .doc, .docx, .pdf, .rtf and .txt.
  - Parses files **only up to 2.5 MB**.
  - Documented causes of a failed or partial parse:
    - letters with spaces between them
    - graphics, photos or word art
    - image-only resumes
    - tables, headers and footers
    - contact info in a header, footer or text box
    - **columned layouts**
    - unclear sections
    - abbreviated titles ("Sr. Account Exec")

  Sources: https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse · https://support.greenhouse.io/hc/en-us/articles/360052218132-Supported-formats-for-resumes-cover-letters-and-other-candidate-uploads
- **Lever.** Parses Word, PDF, RTF, HTML, ODF and WordPerfect. It **can't parse images**, and its quick test is "if you cannot highlight text, the document is likely not parseable". Upload max is 10 MB. https://help.lever.co/hc/en-us/articles/20087345054749-Understanding-resume-parsing
- **Workday.** Parsing results "can vary based on resume format and order of words", and it recommends resumes without images. https://doc.workday.com/admin-guide/en-us/human-capital-management/recruiting/candidates/set-up-prospects-and-candidates/hdc1552497830785.html (title and snippet seen in search; **page not opened**).
- **iCIMS, Taleo, Ashby.** I found no public candidate-facing parsing documentation. iCIMS and Taleo documentation is behind a login **[unverified]**.

### Is "ATS score" a real thing?
Not as one universal number.
- Match scores exist *inside some ATSs* (for example, Greenhouse's match categories), but they're based on criteria each employer configures, and they aren't visible to candidates.
- Jobscan, Teal, Rezi, Resume Worded, Enhancv and Simplify each compute **their own** score, with different targets (70%, 75–80%, "above 80").
- **Recommendation:** label it "Posting match (InternShield's estimate)", show counts rather than a big percentage, and add a one-line disclaimer.

### Formatting must-dos, all backed by the sources above
- One column, or at least never split a section across columns (Greenhouse lists columned layouts as a failure cause).
- Standard section headings.
- No tables, text boxes, images, or header/footer contact info.
- Text-based (selectable) PDF or DOCX. Use whatever format the posting asks for.
  - Greenhouse's candidate FAQ recommends PDF according to a secondary source, https://citedcv.com/en/pdf-or-word-for-ats **[I didn't open Greenhouse's FAQ page]**.
  - Prospects (UK) warns that "Not all ATS' are compatible with a PDF. Check…".
- Fonts: MIT says "no smaller than 10pt" with margins of at least ½ inch (https://capd.mit.edu/resources/resumes/). Prospects says 10–12 pt with 2.5 cm margins, and to use your name as the title (https://www.prospects.ac.uk/careers-advice/cvs-and-cover-letters/how-to-write-a-cv/).

### How recruiters skim
- **Ladders eye-tracking study (2018 update):** the average initial screen took **7.4 s**, up from 6 s in 2012. Recruiters looked longest at **job titles**. The best resumes had simple layouts, clear headers, bold titles, bulleted accomplishments and an overview at the top. The worst had multiple columns, long sentences and keyword stuffing. The sample size isn't published in the PDF **[unverified n]**. https://www.theladders.com/static/images/basicSite/pdfs/TheLadders-EyeTracking-StudyC2.pdf
- **ResumeGo (2018)**, a vendor study with 482 hiring professionals, found two-page resumes preferred overall. The gap was smallest for entry level (1.4×). It compared equally strong resumes, so it doesn't support padding a resume out. https://www.resumego.net/research/one-or-two-page-resumes/ (numbers from the search summary; **page not opened**).

### University guidance (good for in-app copy)
- **Harvard MCS.** Language should be "specific… active… fact-based (quantify and qualify)… for people who / systems that scan quickly". No pronouns, pictures, age or gender. **On AI:** use it to "brainstorm revisions… incorporate keywords… Generative AI should not be the primary author." Includes an action-verb list by category. https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/
- **MIT CAPD.** Keep a master resume, then target each posting. Stick to one page unless you have extensive experience. Say *how* you did things (the language or technique used). Quantify where you can. No age, religion, health or marital status, and "Photos are generally not preferred for U.S. resumes". Employers "may use keyword scanning". https://capd.mit.edu/resources/resumes/

### The Google XYZ formula
Laszlo Bock (then Google's SVP of People Operations), LinkedIn, Sep 29 2014: **"Accomplished [X] as measured by [Y], by doing [Z]."** https://www.linkedin.com/pulse/20140929001534-24454816-my-personal-formula-for-a-better-resume

---

## 3. What customization do students need?

### Options worth adding (fixed lists, written server-side like today)
| Option | Values | What it changes | Why |
|---|---|---|---|
| **Target level** (new) | Internship · New grad · Career changer · Experienced | Verb ceiling (no "orchestrated" or "architected" for interns), a "Projects/Coursework count as experience" hint, and summary framing | Kickresume says senior verbs "sound off" on a first-timer's resume. MIT and Enhancv both say class projects count. |
| **Region** (new) | US résumé · UK CV · Canada · Europe (Europass) · Other | Spelling (optimize/optimise), length tips, a personal-details checklist, wording on the PDF title | US: no photo, age or marital status (MIT). UK: up to 2 A4 pages, no DOB, no photo unless acting or modelling (Prospects). Europass suggests "add a professional photograph" (https://europass.europa.eu/en/create-europass-cv). India and other markets: **I found no authoritative source, so don't hard-code conventions** [unverified]. |
| **Use the posting's words** (new toggle, on by default) | on/off | Prefer the job description's exact phrasing *for terms already in the resume* ("data visualization" → "dashboards" if that's the posting's word) | Enhancv, Kickresume and Rezi all mirror job-description wording. Greenhouse maps synonyms anyway, so this is low risk. |
| **Avoid buzzwords** (new, on by default) | on/off | A banned list in the prompt plus a client-side check: spearheaded, leveraged, synergy, results-driven, passionate, dynamic, go-getter… | Kickresume bans "spearheaded". Prospects says to avoid "team player", "hardworking" and similar. |
| **Emphasis / Tone / Strength / Same length** | keep | — | Already good. Consider renaming "Stronger rewrite" to "Bolder (check carefully)", in line with Kickresume's Turbo warning. |
| **Presets** (new) | Save current options as e.g. "Finance internships" in localStorage | — | Listed as a known limit in the brief. Costs nothing. |
| **Quantify** (new) | "Ask me for numbers" on/off | See below | MIT and Harvard both say quantify, and the guard forbids guessing. |

**By field.** Profile.field already exists, so use it for verb lists and examples:
- **Tech:** name the language or tool (MIT: "say what language you used").
- **Finance/business:** dollar figures, time saved, accuracy.
- **Design:** process and tools, plus a link to the portfolio.

**International students.** Region presets, US-style defaults (no photo, DOB or marital status), and spelling consistency. Possibly a note that work-authorization questions usually come up in the application form rather than on the resume. **Only add that once a university source has been checked [unverified]**.

### Handling a number the user wants but hasn't given ("ask, don't guess")
1. The model never invents numbers. When a metric would help, it returns a **slot** instead, for example `{"slot_question": "About how many students used the dashboard?", "slot_unit": "students"}` with the text "…used by [N] students".
2. The UI shows the slot as an inline input: "About how many students? (we won't guess)". There are also **"I don't know"** and **"Skip"** options, which remove the clause.
3. Values the user types are saved as **user-confirmed facts** (localStorage, keyed to the resume hash). The guard treats them like resume text, so the number passes.
4. The PDF export **refuses unfilled slots**. This prevents the "placeholder revenue figure" failure reported on Reddit.

Fictional example: the original line "Helped build a dashboard for the campus food pantry using Python and Flask" becomes "Built a Python/Flask dashboard for the campus food pantry used by **[N]** volunteers…", and the app asks "How many volunteers used it?".

---

## 4. Improving the guard

### What the research says
| Method | What it is | Practical for InternShield now? |
|---|---|---|
| **FactCC** (Kryściński et al., 2019/EMNLP 2020), https://arxiv.org/abs/1910.12840 | A BERT classifier trained on synthetic rule-based corruptions (entity, number, pronoun swaps) | No. You'd need to host the model. Its *idea*, testing number and entity swaps, is what the current guard already does in code. |
| **SummaC** (Laban et al., TACL 2022), https://arxiv.org/abs/2111.09525 | Sentence-level NLI, aggregated | The idea fits (one bullet is one sentence). See NLI-in-browser below. |
| **QAFactEval** (Fabbri et al., NAACL 2022), https://arxiv.org/abs/2112.08542 | Question generation plus QA consistency | No. Too heavy, with several models involved. |
| **AlignScore** (Zha et al., ACL 2023), https://arxiv.org/abs/2305.16739 | A unified alignment model (RoBERTa) | Post-hackathon. You'd need to host it. |
| **MiniCheck** (Tang, Laban, Durrett, EMNLP 2024), https://arxiv.org/abs/2404.10774 | Small fact-checkers on grounding documents, GPT-4-level at much lower cost (per the paper) | Post-hackathon. You'd need to host it. |
| **FActScore** (Min et al., 2023), https://arxiv.org/abs/2305.14251 | Break the output into atomic claims, then check each one | **Yes, the idea:** claim-level grounding through quotes (below). |
| **SelfCheckGPT** (Manakul et al., 2023), https://arxiv.org/abs/2303.08896 | Consistency across sampled outputs | No. It needs several calls. |
| **HHEM-2.1-Open** (Vectara), https://huggingface.co/vectara/hallucination_evaluation_model | T5-base premise/hypothesis consistency score, under 600 MB RAM, about 1.5 s per 2K tokens on CPU (per the model card). Needs `trust_remote_code`. | Post-hackathon. I found no verified browser (ONNX) port. |
| **NLI in the browser:** `Xenova/nli-deberta-v3-xsmall` (Transformers.js, Apache-2.0), https://huggingface.co/Xenova/nli-deberta-v3-xsmall | Labels each pair as entailment, contradiction or neutral. 91.6% on SNLI and 87.8% on MNLI-mm, per the base model card. | **Optional and post-hackathon.** The quantized ONNX file is about **87 MB**, which is heavy for a demo, and it was trained on general NLI rather than resume text. If you add it, lazy-load it behind a "Deep check" button. |

**Resume-specific research (recent arXiv preprints, not peer-reviewed):**
- **Grounded Optimization** (Jul 2026), https://arxiv.org/abs/2607.01457.
  - Failure types it names: **anachronistic technology** (tools that didn't exist at the dated job), **cross-domain terminology contamination**, structural mutation, and fabrication.
  - Undefended baselines produced 2.48–5.36 detected hallucinations per resume.
  - Prompt grounding alone reached zero only with a capable model at low temperature. Weaker models and higher temperatures needed **deterministic layers**.
- **Mitigating Fabrication in Multi-Stage LLM Pipelines for Hiring** (Jul 2026), https://arxiv.org/abs/2608.26171, run on 180 synthetic resumes.
  - Baseline: 96.7% of outputs contained an unsupported claim.
  - Prompt guardrails cut fabrication density by 86%, **but 50% of outputs still had one.**
  - A human checkpoint removed identity fabrications. **Subtle qualifier drops and plausible new claims survived human review about half the time.**
  - "JD-embedded trap requirements" (job-description terms leaking into the resume) were caught 47% of the time without mitigation and dropped to 2% with the checkpoint.
  - What this means for InternShield: keep the code guard, **add qualifier-drop and job-description-leak detection**, and make the diff point at subtle changes so the human review is easier.
- **ResumeFlow** (2024), https://arxiv.org/abs/2402.06221: proposes metrics for alignment versus hallucination in resume tailoring.

### Recommended Guard v2 (all client-side, deterministic, 0.5–1 day)
Split the result into **Block** (red, can't accept), **Check** (amber, can accept after reading the highlighted words) and **OK**.
1. **Job-description leak (Block).** Any skill, tool or proper noun that appears in the posting but not in the resume or the user-confirmed facts. Show "**From the posting, not your resume:** Tableau", then offer "I have used Tableau" (it becomes a user-confirmed fact and the request re-runs) or "Leave it out".
2. **Inflation ladder (Check).** Map low-ownership verbs (helped, assisted, supported, contributed to, participated in, worked on, was part of) to high-ownership ones (led, spearheaded, owned, drove, headed, directed, managed, architected, founded, launched, single-handedly). If the original's strongest verb is lower than the new one, flag it. **Also flag dropped qualifiers:** "co-", "helped", "with a team of", "assisted" disappearing.
3. **Scope inflation (Check).** New scope words not in the original: company-wide, organization-wide, end-to-end, cross-functional, enterprise, global, entire, all, every, sole, first-ever, award-winning, production, at scale.
4. **Seniority words (Check)** when Target level is Internship or New grad: architected, orchestrated, mentored a team, managed.
5. **Fixes for current false positives:**
   - a hyphen-compound whitelist (double-checked, one-on-one, first-year, third-party, end-of-day, 24/7)
   - an **alias map** for skills (ML ↔ machine learning, JS ↔ JavaScript, Postgres ↔ PostgreSQL, k8s ↔ Kubernetes, GCP ↔ Google Cloud, Excel ↔ Microsoft Excel). Normalize both sides before diffing.
6. **Multi-word titles.** Compare head nouns plus modifiers as a set ("software engineering intern" vs "intern, software engineering").
7. **Claim-support quotes (Check if missing).** In the JSON response, for each option the model lists `supports: [{ "phrase": "<span in the new text>", "quote": "<exact words from the original line>" }]`. The client checks every `quote` word for word against the original. That's the same pattern as the scam extractor, adapted from FActScore. New content words (lemmatized, minus stop words and the posting's soft words) that aren't covered by a verified quote get the amber highlight.
   - Lemmatizing: `compromise` (MIT) or `wink-nlp` (MIT) both run in the browser.
8. **Anachronism (post-hackathon).** Compare dates on the role line with a tiny "tool release year" table (from Grounded Optimization).
9. **Optional LLM verifier (post-hackathon, or only in "Bolder" mode).** A second gpt-oss-20b call at temperature 0 with strict JSON `{unsupported_claims:[{text, why}]}`. It doubles the cost per suggestion, so keep it off by default.

**Test it:** add a guard eval of about 40 **fictional** pairs (original → rewrite → expected Block/Check/OK). Cover each rule, the inflation cases and the known false positives. It's cheap, and judges respond well to "26/26-style" numbers.

---

## 5. Resume parsing (the P0 bug)

**Confirm the bug first.** Upload one real (fictional-content) PDF and one DOCX, and check whether `is:resume` contains `\n`. The brief's suspicion is plausible:
- mammoth's `extractRawText` **does** emit two newlines after every paragraph, per its README: https://github.com/mwilliamson/mammoth.js.
- So if lines are being lost, it's InternShield's whitespace collapse that loses them.

**Fix (about half a day):**
- **Collapse only spaces and tabs**: `/[^\S\n]+/g` → " ". Normalize `\r\n` and keep line breaks. Then collapse 3+ newlines into 2.
- **PDF (pdf.js `getTextContent`).** Each `TextItem` has `str`, `transform` (x = `transform[4]`, y = `transform[5]`), `width`, `height`, `fontName` and **`hasEOL`** (pdf.js `src/display/api.js`, TextItem typedef).
  1. For each page, sort items by y descending, then x.
  2. Start a new line when |Δy| is more than about half the item height, or when the previous item has `hasEOL`.
  3. Join items on a line with a space only when the x-gap is larger than about the average character width.
  4. Keep the font name so the bold heuristic below can use it.

  This is the same approach as OpenResume's documented algorithm: group items into lines, then lines into sections, detect section titles as bold, ALL-CAPS and alone on their line with a keyword fallback, and start a new subsection when the line gap is more than 1.4× normal. https://www.open-resume.com/resume-parser
- ⚠️ **License: OpenResume is AGPL-3.0** (GitHub API: xitanggg/open-resume). InternShield's repo is MIT, so **don't copy OpenResume code.** Reimplement from the published description; the ideas themselves aren't copyrighted.
- **DOCX:** to keep list structure, switch to `mammoth.convertToHtml`. `<li>` becomes a bullet, `<h1–h3>` or a bold-only `<p>` becomes a heading. Fall back to `extractRawText` when the HTML is empty.
- **Two-column PDFs:** if one page has two clusters of x-start positions with a gap of 30% or more of the page width, read the left column first and then the right, and show "We read this as two columns — check the order."
- **Add a parse preview step**: "We read 42 lines, 6 sections. Fix anything wrong." Each line gets a small kind toggle (heading / role / bullet / contact). This is cheap and fixes the long tail.
- Optional: an "ATS parse preview" that tells the user what parsers commonly miss (the Greenhouse list above). Phrase it as "common parser problems" and never claim it's what Workday or Greenhouse actually sees.
- pyresparser is Python and server-side, so skip it. The Affinda/Sovren-style schema is a commercial API (**paid**), so skip it too.

---

## 6. Output (PDF / DOCX)

**Recommendation: regenerate from a clean template rather than editing the original file.**
- You can't reliably edit text inside an existing PDF.
- DOCX run-level text swapping is possible but fragile with styles. It's post-hackathon work, and only for DOCX originals.

**Upgrade the existing pdf-lib output (about half a day):**
- Embed a TTF with `@pdf-lib/fontkit` (MIT; `pdfDoc.registerFontkit`, per the pdf-lib README). That ends the "?" for non-WinAnsi characters, which matters for international names.
  - Use an SIL OFL font (Inter, Source Sans 3 or Noto Sans) **[check the font's license file before bundling]**.
- **Name as the title, with the contact line under it** (Prospects: your name is the title). These come from the detected contact block and stay local.
- **Bold job titles and organization lines** (Ladders: titles get the most attention).
- Section headings with a thin rule. One column. Real bullets. A selectable text layer.
- File name `Firstname-Lastname-Resume.pdf` (Prospects).
- Layout reference: Jake's Resume (LaTeX, **MIT**, https://github.com/jakegut/resume). Copy the look, not the LaTeX.

**Other exports:**
- **Copy as plain text** (1 hour; Enhancv exports TXT). Lets users paste into application forms.
- **DOCX** through `docx` (MIT, https://docx.js.org), about 0.5–1 day. It helps when a posting asks for Word.
- react-pdf (`@react-pdf/renderer`, MIT) is an alternative, but you already have pdf-lib.

---

## 7. Prompting

**Use strict JSON** with gpt-oss-20b or qwen, which constrains the output to the schema. Return **3 options in one call**. Suggested schema:
```json
{ "options": [ {
    "label": "closest | results_first | posting_words",
    "text": "string",
    "supports": [ { "phrase": "string", "quote": "string" } ],
    "posting_terms_used": ["string"],
    "slot_question": "string|null"
} ], "held_back": [ { "term": "string", "reason": "not_in_resume" } ] }
```
- **Option 1, "Closest":** minimal edit, original verbs kept.
- **Option 2, "Results first":** XYZ order (result → how → tools), using only existing numbers, with a slot when none exist.
- **Option 3, "Posting's words":** swaps synonyms for the posting's wording, *only for concepts already in the line*.
- `held_back` drives a Kickresume-style **"Not added because it's not in your resume"** list, each item with an "I have this" button.

**System prompt sketch:**
> You rewrite ONE resume bullet. Use ONLY facts in ORIGINAL and USER_FACTS. Never add numbers, tools, skills, employers, titles, dates, team sizes, scope ("company-wide", "end-to-end") or stronger ownership verbs than ORIGINAL implies (helped ≠ led). If a number would help and none exists, put [N] in the text and write slot_question. If a POSTING term isn't supported by ORIGINAL/USER_FACTS, do not use it — list it in held_back. Start with a past-tense action verb (present tense if the role is current). No pronouns. No buzzwords: {banned list}. Level: {internship → plain verbs: built, analyzed, wrote, tested}. Region: {US spelling}. For each option, list each new phrase with the exact ORIGINAL words that support it.

**Fictional few-shot example:**
- Original: "Helped make a Python script that cleaned survey data for the psych lab."
- Posting (Northwind Analytics, Data Analyst Intern): SQL, data cleaning, Tableau.
- Good: "Helped build a Python script to clean survey data for the psychology lab, cutting manual cleanup to [N] hours a week". The slot asks "About how many hours did it save each week?".
- `held_back`: SQL, Tableau.
- Bad (blocked): "Led development of an automated SQL/Tableau data-cleaning pipeline", because it inflates "helped" to "led", leaks SQL and Tableau from the posting, and adds the scope word "automated pipeline".

**Bullet frameworks:**
- **XYZ** (Bock) for results.
- **STAR** compressed into Action + Result for bullets. Keep full STAR for interviews (brief 04).
- Harvard's action-verb list, grouped by category, is a good verb source with a link.

**Should it return 2–3 alternatives?** **Yes, 3 per call.** Jobscan returns 3, and Teal offers options plus regenerate. With one call, the budget stays flat, and the user picking among options is the human-in-the-loop step the 2026 fabrication paper recommends.

---

## 8. Ethics, and whether employers penalize AI-written resumes

**Guidance:**
- **Harvard:** AI "should not be the primary author". Use it to brainstorm, add keywords and improve what you have.
- **Prospects:** don't use AI to "invent or embellish details". It also says "lying on your CV is a criminal offence" (UK context, quoted as Prospects wrote it). Ask "can I see myself in this CV?".
- **LinkedIn** tells users to verify its own AI resume tips for accuracy.

**Surveys. All are vendor-run, so treat them as directional:**
- **Resume.io (Jan 2025, n = 3,000 hiring managers):** "49% of AI-generated resumes are automatically dismissed." The wording is ambiguous, and the method isn't published on the page. https://resume.io/blog/resume-rejections
- **TopResume (May 2025, n = 600 US hiring managers, Pollfish):**
  - 19.6% would reject a fully AI-generated resume or cover letter.
  - 52% say AI for proofreading or drafting help is acceptable.
  - Only **33.5%** correctly spotted the AI-written resumes in their test, so detection is unreliable.
  - 19.2% use AI for resume screening.

  https://topresume.com/career-advice/ai-in-hiring-survey
- **Resume Now:** "62% reject AI resumes without personalization", found through search; **not opened [unverified]**.

**Product stance (it also makes a strong pitch line):** "InternShield rewords; it doesn't invent. Every line must be something you can explain in an interview." Show that sentence next to the Accept button. Keep a visible "Why we blocked this" for every Block.

---

## Q (5): Is whole-resume or section-level tailoring worth it within the constraints?

| Approach | Fits free tier? | Verdict |
|---|---|---|
| Whole resume in one LLM call | **No.** About 5K tokens of resume input plus a full rewrite comes to more than 8K tokens/min (estimate). It would also burn the shared daily tokens. | Post-hackathon, and only as queued per-section calls |
| **Deterministic section work (no LLM)** | Yes, with 0 tokens | **Do it:** (a) reorder Skills so posting-matched skills come first; (b) rank bullets within each role by number of posting terms matched and offer "Move to top"; (c) "Top 3 bullets for this job" chips that open the rewrite flow. Enhancv and Rezi both recommend relevance ordering. |
| **Summary/profile generator** (1 call) | Yes, about 1.5–2K tokens | **Do it if time allows.** Input: the top 5 relevant bullets, the target level and the posting role. Same guard. It's the section Enhancv calls "the most important… to customize". Hide it for Internship level unless the user asks. |
| "Tailor all selected bullets" batch | Partly. Sequential calls with a 1–2 s gap, max 5 per batch, counting 5 against the cap | Post-hackathon, or a stretch goal |
| Cover letter | Same budget concerns | Post-hackathon |

---

## Ranked plan (impact vs effort for 1 developer with AI agents; deadline Mon Oct 26, 5 PM ET)

| # | Change | Effort | User impact | Paid? |
|---|---|---|---|---|
| 1 | **Fix parsing so line breaks survive**: whitespace fix, pdf.js y-grouping with `hasEOL`, mammoth HTML lists, and a parse-preview with kind toggles. Reimplement; don't copy AGPL OpenResume. | 0.5–1 day | **Critical.** Tailoring is broken on real files without it. | Free |
| 2 | **Keyword-gap panel (no LLM)**: posting terms from the existing skill list plus an alias map (optionally a curated slice of O*NET Software Skills, CC BY 4.0 with attribution: https://www.onetcenter.org/license_db.html). Split into **Required / Preferred** using cue phrases (must, required, minimum vs preferred, plus, nice to have). Three buckets: *In your resume* · *Same idea, different words* · *Not found — add only if true*, each with "I have this" or "Leave out". Show counts, not an "ATS score". | 1 day | **High.** Every competitor has this, and it's demo-friendly. | Free |
| 3 | **3 options per request** via strict JSON, plus a `held_back` "Not added" list | 0.5 day | High, and costs no extra budget | Free |
| 4 | **Guard v2**: job-description-leak label, inflation ladder, scope and seniority words, qualifier drop, alias map, hyphen whitelist, quote-verified `supports`, Block/Check/OK tiers, and a 40-pair fictional guard eval | 1 day | High for trust, and backed by the 2026 papers | Free |
| 5 | **Ask-for-the-number slots** plus user-confirmed facts, with export blocked while slots are empty | 0.5 day | High. It's a distinctive feature: "we won't guess". | Free |
| 6 | **New options**: Target level, Region, Use the posting's words, Avoid buzzwords, and saved presets | 0.5 day | Medium-high, and directly answers the owner's ask | Free |
| 7 | **Deterministic reordering**: skills first, bullets ranked within each role, "Top 3 for this job" | 0.5 day | Medium-high, with 0 tokens | Free |
| 8 | **PDF v2**: name header, bold titles, embedded Unicode font, proper file name, plus **Copy as plain text** | 0.5 day | Medium (Design is the tie-breaker criterion) | Free |
| 9 | Raise the rewrite cap to about 60–100/day after checking the org Limits page, plus a localStorage cache of identical requests | 1–2 h | Medium for the demo | Free |
| 10 | Summary generator (1 call, guarded) | 0.5 day | Medium | Free |
| — | DOCX export (`docx`, MIT) | 0.5–1 day | Medium | Free. Stretch goal. |
| — | **Post-hackathon:** browser NLI "Deep check" (about 87 MB model), HHEM/MiniCheck/AlignScore hosting, LLM verifier pass, anachronism table, batch and whole-resume tailoring, cover letter, editing original DOCX files in place | — | — | Hosting may need paid compute |

**Suggested order if time is short:** 1 → 3 → 4 → 2 → 5 → 6 → 8. About 4 days of work, so items 7, 9 and 10 fit only if the agents run in parallel.

**Paid services flagged:** none of the recommendations need a paid service. The competitors' tailoring features are paid (Teal+, Jobscan Premium, Rezi, Kickresume Premium, Enhancv Pro, Simplify+, LinkedIn Premium). Affinda/Sovren-style parsing APIs are commercial, so avoid them. The ESCO API is free (https://esco.ec.europa.eu/en/use-esco/download), but O*NET's static file is simpler.

## Unverified or open items
- Free-tier Groq limits vs the "Developer plan base limits" wording on the rate-limits page. Check the org's Limits page.
- Token-per-call figures are estimates. Log `usage` from Groq responses to measure them.
- The Ladders sample size; the ResumeGo, Workday and Resume Now pages (search snippets only); iCIMS, Taleo and Ashby parsing docs; India-specific resume conventions; and the international-student work-authorization advice.
- Reddit complaints are anecdotal.
- Whether the parsing bug actually happens. Reproduce it with a fictional PDF and DOCX before fixing.
- Font license for the embedded font.
