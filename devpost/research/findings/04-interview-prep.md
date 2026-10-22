# Findings 04: Interview prep (all rounds, coding runner, grading)

*Research for brief 04. Compiled Thu Oct 22, 2026, about 1:45 AM ET. Each claim carries a source. Labels used: **[official]** is a company's own page; **[guide]** is a well-known third-party guide; **[self-reported]** is candidate reports (Glassdoor, Reddit, blogs); **[vendor claim]** is a product's statement about itself; **[UNVERIFIED]** means I could not confirm it from a primary source. I have not tested anything in a browser unless the text says "measured".*

---

## 0. TL;DR (read this if nothing else)

1. **Top-company coding loops use the same 4 axes.** They are communication, problem solving, coding, and verification/testing. Meta's official guide names exactly these 4, and the MIT-licensed Tech Interview Handbook publishes a 4-band rubric for each. **Adopt it as the scoring spine for every tech round**, and fill as much of it as possible from code-measured signals.
2. **Hosted code runners are a dead end for a free hackathon build.**
   - The public Piston API has been **whitelist-only since Feb 15, 2026**, and its rules exclude "temporary", "individual" and "portfolio" projects.
   - Judge0's free RapidAPI plan is reportedly **50 submissions a day**. Self-hosted Judge0 had **CVSS 10 sandbox escapes in 2024** and runs privileged Docker.
   - JDoodle's free plan is **20 runs a day**.
   - **Stay in the browser.**
3. **What to add in 3–4 days, all client-side and free:**
   - **SQL**, using sql.js (MIT, about 320 KB brotli, measured)
   - **TypeScript**, with the TS compiler's `transpileModule` in the existing JS worker (about 1.1 MB brotli, measured)
   - **Java** as a flagged stretch goal, using TeaVM's in-browser javac. The `compiler.wasm` is 4.1 MB, about 1.6 MB gzipped (measured), and it needs WasmGC. Its license status is unclear (§3).
   - C/C++ in the browser via Wasmer clang is about 30 MB compressed and needs COOP/COEP. That is post-hackathon work.
4. **The highest-value new rounds can be graded fully by code** and reuse what already exists:
   - **Debugging** (planted bugs plus failing tests)
   - **SQL** (compare result sets)
   - **Code review** (match planted issues by line)
   - **Amazon-LP behavioral** (code-checked STAR signals: "I" vs "we", a metric in the result, LP tags)
5. **Load-balance the free Groq tier.**
   - qwen3.8-27b, gpt-oss-20b and gpt-oss-120b each list 30 RPM, 1K RPD, **8K TPM** and **200K TPD**, and each model has its own bucket.
   - One interview session costs about 10–14K tokens (my estimate), so one model supports about 15–20 sessions a day.
   - Put question generation on gpt-oss-20b and feedback on qwen or 120b, add a fallback, and honour `retry-after`.
6. **Question sources you can legally adapt:**
   - Exercism problem-specifications (MIT, 152 exercises with JSON test data)
   - Tech Interview Handbook (MIT)
   - System Design Primer (**CC BY 4.0**, not BY-SA)
   - OWASP Top 10:2025 (CC BY 3.0)
   - Kubernetes docs (CC BY 4.0)
   - Chinook (MIT), Pagila (PostgreSQL license) and SQL Murder Mystery (MIT) for SQL
   - **Don't copy LeetCode**: its ToS bans scraping and copying its content.

---

## 1. What real top-company loops include, by role (Q1)

### 1a. Verified official facts by company

| Company | What the company itself says | Source |
|---|---|---|
| **Google** (all roles) | Recruiter chat, then phone or video interviews specific to the job (coding for tech roles), then **usually four 45-minute interviews**. Interviewers are trained and use **standardized rubrics**. **No brainteasers.** Four attributes are scored: **general cognitive ability, role-related knowledge, leadership, Googleyness** ("comfort with ambiguity, bias to action, collaborative nature"). A **hiring committee** reviews the packet. There may be an online assessment or a project first. | [official] "How We Hire at Google" video, https://www.youtube.com/watch?v=zhUgaKb0s5A ; [official page, JS-rendered so I couldn't read the text] https://www.google.com/about/careers/applications/how-we-hire/ ; same text mirrored at https://www.brightnetwork.co.uk/employer-advice/google/google-how-we-hire/ |
| **Google SWE intern** | OA, then **2 × 45-minute technical interviews**, then **host matching** (team calls). Passing doesn't guarantee a match. | [self-reported] https://adaluong.me/blog/google-application-tips/ (not an official page) |
| **Meta SWE** | Coding: **about 2 problems in about 40 minutes**. Interviewers assess **Communication, Problem solving, Coding, Verification** and say "Finding and catching bugs in your code is a positive sign!" They **won't compile your code**, so practise without running it. Use any language. The onsite usually has **2 coding sessions** plus system or product design plus behavioral ("Getting to know you"). Tools: CoderPad and Excalidraw. | [official PDFs hosted by Meta's prep hub] https://d3no4ktch0fdq4.cloudfront.net/public/course/files/Meta_SWE_full_loop_guide.pdf , https://d3no4ktch0fdq4.cloudfront.net/public/course/files/FB_Onsite_guide_-_Software_engineer.pdf ; https://www.metacareers.com/swe-prep-onsite/ |
| **Meta SWE intern** | Tips: talk while coding, practise in CoderPad, start brute force and then optimise, and hints are OK. | [official] https://www.metacareers.com/blog/acing-your-software-engineering-internship-interview-at-meta/ |
| **Meta MLE** | Full loop of **"up to six 45-minute conversations."** | [official] https://www.metacareers.com/ML-prep-onsite/ |
| **Meta PM** | **Product Sense, Analytical Thinking (Execution), Leadership & Drive.** | [official] https://www.metacareers.com/pm-prep-onsite/ , https://www.metacareers.com/blog/product-management-interview-qa-hack-the-initial-interview |
| **Meta Data Scientist** | Initial interview: **45 minutes with a Meta DS**, with analytical and technical parts. | [official] https://www.metacareers.com/ds-prep-initial/ |
| **Amazon SDE** (official SDE II page; university-specific page not found) | **OA: 90 minutes for 2 coding questions, then 20 minutes of system-design scenarios, then an 8-minute Work Style Survey** tied to the Leadership Principles. **Loop: four 55-minute interviews** covering technical and LP competencies, with each interviewer assigned LPs. At least one system-design question; design objectives are practicality, accuracy, efficiency, reliability, optimization, scalability. | [official] https://www.amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep ; hub https://www.amazon.jobs/content/en/how-we-hire/interviewing-at-amazon |
| **Amazon** (all roles) | **16 Leadership Principles.** A **Bar Raiser** is an objective interviewer from outside the hiring team. Prep tips: STAR, say "I" not "we", and use measurable results. | [official] https://www.amazon.jobs/content/en/our-workplace/leadership-principles ; https://www.aboutamazon.com/news/workplace/amazon-bar-raiser ; https://www.aboutamazon.com/news/workplace/amazon-job-interview-questions-tips-bar-raisers |
| **Microsoft** | Usually **2–4 conversations, each up to an hour**, with teammates and cross-functional colleagues. Technical roles cover problem solving, design, coding and testing. | [official] https://careers.microsoft.com/v2/global/en/hiring-tips.html , https://careers.microsoft.com/v2/global/en/hiring-tips/technical-interviewing |
| **Apple** | **No official loop or rubric page found.** | [UNVERIFIED] Glassdoor reports only |
| **Netflix** | No official loop page found. Its interviews are reported to lean heavily on the culture memo. | [UNVERIFIED]; culture: https://jobs.netflix.com/culture |
| **Stripe** | No fixed official round list found. Candidates widely report a **"Bug Squash"** round (debugging a real repo) and an **"Integration"** round (building against an API spec). | [self-reported] https://www.reddit.com/r/leetcode/comments/1mgcc99/stripe_integration_and_bug_bash_rounds_interview/ ; [UNVERIFIED official] |
| **Nvidia, Databricks** | Not researched to primary sources in this pass. | [UNVERIFIED] Glassdoor/Blind only. Don't present these as presets. |
| **Jane Street SWE** | A Zoom technical interview, then in-office finals "mostly, if not exclusively" collaborative coding. **Real code, not pseudocode, in any language. No mental math, puzzles or "algorithm bingo".** No bonus for OCaml. Tips: "Be nice, be clear, know your language, know what you don't know." | [official] https://www.janestreet.com/preparing-for-a-software-engineering-interview/ |
| **Jane Street trading** | Phone interviews, then in-person finals covering **problem solving, probability/statistics, coding, data analysis**, and general interests. | [official] https://www.janestreet.com/trading-interviews/ |
| **Goldman Sachs** (campus) | An **approximately 30-minute video interview (HireVue)**, plus a **HackerRank** test for engineering. Then a **Superday of 2–5 interviews**, depending on the division. | [official] https://www.goldmansachs.com/careers/students/prepare |
| **McKinsey** | **Solve** (a gamified assessment) or a technical assessment. Then a **Personal Experience Interview (PEI)** and a **Problem-Solving (case) interview**, and sometimes an **Expertise interview**. PEI advice: "two personal examples… in each of the four areas", focus on your specific role, "lead with reasoning, not actions", and expect a conversation, not a rehearsed story. Official sample cases: Beautify, Diconsa, Electro-Light, national education system, Talbot Trucks. **AI policy: practising with AI is "Encouraged"; generating real-time answers in an interview is "Not Allowed."** | [official] https://www.mckinsey.com/careers/interviewing |
| **BCG** | An official case prep page. | [official] https://careers.bcg.com/global/en/case-interview-preparation , https://careers.bcg.com/global/en/interview-process (the online "Casey" chatbot case is [UNVERIFIED] here) |
| **Bain** | Consulting: a **digital assessment, then case interview(s)**. All candidates for a role get **the same questions, to reduce bias**. Some roles: portfolio walkthrough, take-home (about 3 days), online assessment. Candidates should explain "why they want to join us specifically." **Bonus for brief 01:** Bain states it never interviews via instant messaging and never asks candidates to buy anything. | [official] https://www.bain.com/careers/hiring-process/interviewing/ , https://www.bain.com/careers/hiring-process/case-interview/ |

### 1b. Role-by-role loop summary

This is a synthesis of the official facts above plus well-known guides. Where only guides back a claim, it's marked [guide] or [self-reported].

| Role | Typical stages (intern / new grad) | Round types | What's graded |
|---|---|---|---|
| **SWE intern** | OA, then 1–2 technical screens, then team or host match (Google) | DSA coding (easy–medium), short behavioral | the 4 coding axes |
| **SWE new grad** | OA, then a phone screen, then a 3–5 round onsite | 2–3 DSA coding rounds, behavioral or LP, light system or OO design at some companies (Amazon OA includes system-design scenarios) | the 4 coding axes, plus LPs or Googleyness |
| **Data scientist** | screen, then technical (SQL/stats), then onsite | SQL, product metrics/A-B testing, statistics/probability, case, behavioral (Meta DS initial is a 45-minute analytical and technical round) | correctness, metric reasoning, communication |
| **Data engineer** | [guide] | SQL (heavy), Python coding, data modeling, pipeline/ETL design | correct SQL, modeling trade-offs |
| **ML engineer** | Meta: up to 6 × 45 minutes | coding, **ML system design**, ML theory, behavioral | problem framing, metrics, data, serving, monitoring |
| **Security engineer** | [guide/self-reported] | coding or scripting, appsec (OWASP), threat modeling, code review for vulnerabilities, incident scenario | depth of knowledge, threat reasoning |
| **DevOps/SRE** | [guide/self-reported] | Linux/networking troubleshooting, scripting, system design for reliability, incident response, Docker/K8s/CI | systematic debugging, reliability trade-offs |
| **Frontend** | [guide] | JS fundamentals, UI building (DOM/React), accessibility, front-end system design | working UI, a11y, state management |
| **Mobile** | [guide] | platform coding (Swift/Kotlin), mobile system design | platform knowledge |
| **PM / APM** | Meta: Product Sense, Analytical/Execution, Leadership & Drive | product sense, metrics/execution, estimation, behavioral | user empathy, prioritisation, metric choice |
| **Product designer** | Bain: portfolio walkthrough and take-home | portfolio walkthrough, whiteboard or app critique, take-home presentation | process, rationale, collaboration |
| **IB / finance** | GS: HireVue, then a Superday of 2–5 interviews | technicals (accounting, DCF, EV, LBO), fit/behavioral, "why GS / why banking" | technical accuracy, polish |
| **S&T / quant** | Jane Street trading: phone, then finals | probability/statistics, mental math (trading only), coding, markets | rigorous reasoning, correcting mistakes |
| **Consulting (MBB)** | McKinsey: Solve, then PEI plus case; Bain: digital assessment, then cases | case with exhibits and math, market sizing, PEI/fit | structure, math, synthesis, specific-role stories |

**Interns vs new grads:** intern loops are shorter (Google: 2 technical interviews, then host matching [self-reported]) and are almost purely DSA plus light behavioral. System design is rarely asked of interns or new grads. When it is, it's an Amazon-style "scenario" or OO-design level, not distributed-systems depth [Hello Interview leveling guide: https://www.hellointerview.com/blog/the-system-design-interview-what-is-expected-at-each-level].

---

## 2. Grading rubrics, and how to grade fairly with a small free LLM (Q2)

### 2a. Publicly described rubrics
- **Meta coding (official):** Communication, Problem solving (multiple approaches, data structures, complexity, optimisation), Coding (executable, organised), Verification (test cases, finding your own bugs). PDFs cited above.
- **Google (official):** GCA, RRK, Leadership, Googleyness, with standardized rubrics and a hiring committee.
- **Amazon (official):** each interviewer is assigned specific LPs. The design objectives are practicality, accuracy, efficiency, reliability, optimization, scalability. A Bar Raiser sits in the loop.
- **Tech Interview Handbook (MIT, by an ex-Meta engineer)** has a full 4-axis rubric: **Communication, Problem Solving, Technical Competency, Testing**. Each axis has basic and advanced signals and 4 bands (Strong hire / Leaning hire / Leaning no hire / Strong no hire). https://www.techinterviewhandbook.org/coding-interview-rubrics/ **Because it's MIT, you can adapt it directly with attribution.**
- **interviewing.io:** interviewers rate **technical ability, problem solving and communication on a 1–4 scale**, plus a yes/no on advancing. 3+ generally means advance. https://interviewing.io/blog/there-is-a-real-connection-between-technical-interview-performance-and-salary-heres-the-data ; on communication: https://interviewing.io/blog/does-communication-matter-in-technical-interviewing-we-looked-at-100k-interviews-to-find-out
- **System design, Hello Interview "Delivery Framework" [guide]:** requirements (about 5 min), core entities (about 2), API (about 5), optional data flow, high-level design (10–15), deep dives (about 10). https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery
- **Case interviews (McKinsey/BCG/Bain official pages):** structure, hypothesis, math, synthesis, communication. Bain uses **identical questions per role** to reduce bias.

### 2b. Recommended grading design: the "code first, LLM explains" pattern, same as the scam core
1. **Per round, a fixed rubric of 3–5 axes, each with 4 bands and level descriptors.** Use TIH bands for tech, but relabel them so no "hire" wording reaches students: *Strong / Solid / Developing / Not yet*.
2. **Fill axes with code-measured signals wherever possible.** For coding:

   | Axis | Code-measured signals |
   |---|---|
   | Verification | ran examples before submitting; added own tests; hidden tests passed |
   | Technical | compile or syntax errors count; tests passed |
   | Problem solving | hint count; whether the optimisation follow-up was answered; time to first passing solution |
   | Communication | whether the "plan" box was filled before coding; complexity stated (regex for `O(`) |

   Show these in the "Checked by code" row the app already has.
3. **The LLM only grades what code can't**, such as quality of reasoning or clarity of trade-offs, and **must return a verbatim quote as evidence for each band** (the existing quote check). **If a quote is missing, cap that axis at "Developing" and label it "not enough evidence".** Prometheus-style analytic rubrics (a per-criterion rubric plus an optional reference answer, then a score) are the evidence-backed approach: https://arxiv.org/abs/2310.08491 . G-Eval (generated evaluation steps plus form filling): https://arxiv.org/abs/2303.16634
4. **Calibration:** keep a tiny golden set of 2 made-up answers per round per band. Himesh labels them. Add a Vitest/eval script that checks the model's band agrees within ±1 before shipping a prompt change. This mirrors the 26-message scam eval.
5. **Fairness for non-native speakers (many of the users are international students):**
   - LLM essay scoring shows measurable bias against English-language learners: https://aclanthology.org/2024.bea-1.7.pdf ; https://doi.org/10.1016/j.caeai.2024.100234 ; a 2025 follow-up found GPT-4o errors rose when it inferred non-native writers: https://arxiv.org/abs/2504.21330
   - Mitigations:
     - (a) The prompt says: "Ignore grammar, spelling, accent and idiom. Grade content against the rubric only."
     - (b) No "clarity of English" axis.
     - (c) Prefer code-measured signals.
     - (d) Add 2 golden-set answers written in deliberately non-native but correct English, and assert they get the same band as fluent versions.

---

## 3. Languages in live coding: which, and how to run them (Q3)

### 3a. Which languages matter
- **interviewing.io:** no statistically significant overall pass-rate difference between Python, Java and C++ [https://interviewing.io/blog/we-analyzed-thousands-of-technical-interviews-on-everything-from-language-to-code-style-here-s-what-we-found]. **Meta and Jane Street (official):** use your strongest language. Meta notes scripting languages "tend to be easier."
- **Stack Overflow 2025 survey (all respondents, "extensive work"):**

  | Language | Share |
  |---|---|
  | JavaScript | 66% |
  | SQL | 58.6% |
  | Python | 57.9% |
  | Bash | 48.7% |
  | TypeScript | 43.6% |
  | Java | 29.4% |
  | C# | 27.8% |
  | C++ | 23.5% |
  | C | 22% |
  | Go | 16.4% |
  | Rust | 14.8% |
  | Kotlin | 10.8% |
  | Swift | 5.4% |

  https://survey.stackoverflow.co/2025/technology
- **LeetCode or HackerRank per-language interview stats:** no public primary source found [UNVERIFIED].
- **Priority for InternShield:**
  - Python and JS (done)
  - **SQL** (data, DS, DE and backend roles; huge share)
  - **TypeScript** (nearly free to add)
  - **Java** (the most common university language; a top interview language)
  - **C++**
  - then Go, C#, Kotlin, Swift and Rust, post-hackathon

### 3b. In-browser options

Sizes marked "measured" were fetched from jsDelivr or teavm.org on Oct 22, 2026.

| Language | Best option | Size / cold start | License | Maturity / notes | Verdict |
|---|---|---|---|---|---|
| Python | Pyodide (done) | `pyodide.asm.wasm` 2.67 MB brotli (measured, v0.28.0) | MPL-2.0 | mature | keep |
| **TypeScript** | `typescript.js` `transpileModule` in the JS worker (strips types, reports syntax errors, no type check); alternative Sucrase (MIT, tiny, no diagnostics) | 1.13 MB brotli (measured, 5.6.3) | Apache-2.0 | mature | **add now (S)** |
| **SQL** | **sql.js** (SQLite) in a worker; alternatives **PGlite** (real Postgres, 3.38 MB brotli measured, Apache-2.0/PostgreSQL) and **DuckDB-WASM** (MIT, about 3.2 MB compressed [guide]) | sql.js wasm 320 KB brotli (measured, 1.11.0) | MIT | mature; SQLite has window functions and CTEs | **add now with sql.js (M)**; offer PGlite later for "Postgres dialect" |
| **Java** | **TeaVM javac playground**: OpenJDK javac plus TeaVM compiled to one Wasm module; compiles Java source to Wasm in the browser | `compiler.wasm` 4.13 MB (1.57 MB gzipped), plus `runtime-classlib-teavm.bin` 2.38 MB and `compile-classlib-teavm.bin` 0.2 MB (all measured) | TeaVM is Apache-2.0. **The `teavm-javac` repo shows no license via the GitHub API**, and javac itself is GPLv2+Classpath Exception | active (pushed Oct 2026). Needs **WasmGC** browser support ([UNVERIFIED] minimum versions; test Safari) | **stretch behind a flag**. Self-host the files and ask the author about licensing first |
| Java (alt) | CheerpJ 4 | — | **Free only for personal, FOSS and one-person companies; commercial needs a license.** It's a JVM runtime and needs a separate compiler | https://cheerpj.com/docs/licensing | not now |
| C / C++ | **Wasmer SDK plus `clang/clang`** | about 100 MB uncompressed, **about 30 MB compressed** [vendor claim] | Wasmer SDK: modified MIT; clang: Apache-2.0 w/ LLVM exception | needs **COOP/COEP cross-origin isolation** (SharedArrayBuffer): https://docs.wasmer.io/sdk/wasmer-js/explainers/troubleshooting/ . Alternative browsercc (MIT; clang.wasm 43 MB, lld 23 MB, sysroot 29 MB) | **post-hackathon**, or an opt-in "download 30 MB" toggle |
| C++ (alt) | JSCPP (interpreter of a C++ subset) | small | MIT | **last push 2021**, incomplete STL | no |
| Go | Yaegi (Go interpreter) compiled with GOOS=js | [UNVERIFIED size, likely 10+ MB] | Apache-2.0 | no official browser build | post-hackathon |
| Ruby / PHP | ruby.wasm (MIT) / php-wasm (Apache-2.0) | [UNVERIFIED sizes] | permissive | active | low priority for interviews |
| Rust, Swift, C#, Kotlin | no practical client-side compiler. Swift/C# wasm targets need a server-side compiler; Kotlin Playground uses JetBrains servers ([UNVERIFIED] terms) | — | — | — | post-hackathon via a server runner |
| Bash | v86 (BSD-2) or WebVM (Apache-2.0, **but CheerpX is free only for individuals; any organisational use needs a license**) | tens of MB [UNVERIFIED] | see note | heavy | use scripted shell scenarios instead (§4) |

### 3c. Hosted runners: why none fits a free hackathon build

| Service | Free tier | Terms / security | Verdict |
|---|---|---|---|
| **Piston public API (emkc.org)** | **Closed. Whitelist-only since Feb 15, 2026**, and unauthorised calls get 401. Keys are not granted for "temporary", "individual", "portfolio", college or "vibe-coded" projects. https://github.com/engineer-man/piston | MIT (self-host OK) | **no** |
| **Judge0 CE via RapidAPI** | Basic plan reportedly **50 submissions a day** [guide: https://agentgid.com/apis/judge0/ ; RapidAPI page https://rapidapi.com/judge0-official/api/judge0-ce/pricing]. Pro is €27/month for 2,000 a day **(PAID)**. Needs a RapidAPI account | GPL-3.0 self-host. **CVE-2024-28185/28189/29021: critical sandbox escapes (CVSS 10)**, fixed in v1.13.1; its compose file runs privileged containers. https://github.com/judge0/judge0/security/advisories/GHSA-h9g2-45c8-89cf | 50 a day is too few for a site; self-host needs a VM (usually paid) and careful hardening. **no** |
| **JDoodle API** | **20 credits a day**, one per run. https://www.jdoodle.com/docs/api/credits | account | too small |
| **Compiler Explorer (Godbolt) API** | free, **no enforced rate limit today** ("there may be some form of rate-limiting… authentication might be required"). Supports **execution** (`executorRequest`, `filters.execute`) | https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/API.md . A shared, donation-funded community service. **Ask the CE team before relying on it in a product** (my recommendation; no explicit ToS found). Code leaves the user's browser, so update the privacy line | only **post-hackathon, with permission**, as a server-proxied runner for C++/Go/Rust etc. with strict per-visitor caps |
| OnlineCompiler.io (Piston-compatible) | "free key for 10k runs/month" [vendor claim] | third party, account | [UNVERIFIED]; not for the demo |
| Glot.io, Sphere Engine, OneCompiler | not verified | — | [UNVERIFIED] |
| Self-run Firecracker / gVisor / nsjail | needs a Linux VM or Fly/Render-type host; not possible on Vercel functions | strongest isolation, but ops-heavy | post-hackathon |

### 3d. Recommended runner architecture (deliverable b)
```
Editor (CodeMirror 6, add lang-sql, lang-java, TS via javascript({typescript:true}))
   │  postMessage({lang, files, tests[] (JSON), limits})
   ▼
RunnerHost (main thread): picks a per-language worker, starts timeout, kills worker on timeout/size cap
   ├─ py.worker  – Pyodide (existing)
   ├─ js.worker  – existing; TS = typescript.transpileModule() → JS → same harness
   ├─ sql.worker – sql.js; seeds schema+data per problem; returns rows as JSON
   └─ java.worker (flag) – TeaVM javac → wasm → run wrapper main()
   ▼
Grader (pure TS, shared, unit-tested): deep-equal / result-set compare → "passed X of Y" + per-test diff
```
- **Harness protocol (language-agnostic):**
  - Each problem has a `spec.json`: function name, typed signature, and test cases as `{input:{...}, expected}`. This mirrors **Exercism's `canonical-data.json`** format (MIT; verified with `two-fer`).
  - Per language, a **generated wrapper** reads one JSON line per case, calls the user function, and prints one JSON result line per case, with markers like `<<<IS_RESULT 3>>>`.
  - **Batch all cases into one run.** That means one compile, which matters for Java.
  - For typed languages, limit signatures to a small type set (`int, long, double, bool, string, int[], string[], int[][]`, and `List<...>`). That keeps the wrappers simple and needs no JSON library: write a 60-line mini parser per language.
- **Class or "design" problems (LRU cache, rate limiter, OOD):**
  - Use an **operation-sequence** test format: `{ops:["LRUCache","put","get"], args:[[2],[1,1],[1]], expected:[null,null,1]}`.
  - This one harness covers LLD-lite.
- **SQL grading:**
  - Run the user query and the reference query on the same seeded DB.
  - Compare **as multisets of rows**, with column order normalised by name, numbers within 1e-9, and order only if the problem says `ORDER BY` matters.
  - Show the first 5 differing rows.
- **Security:**
  - Each worker gets a CSP of `connect-src 'none'` on its script response (the same approach as the existing Pyodide worker).
  - Add output caps and hard termination.
  - Also fix the known `WorkerGlobalScope.prototype` gap by deleting from the prototype, or by running JS/TS in a sandboxed `iframe` worker with an opaque origin.
  - A C++ build later needs COOP/COEP on the `/interview` route only. COEP `require-corp` can break cross-origin images and scripts elsewhere, so scope the headers.

---

## 4. Missing round types: minimum viable format plus code-gradable parts (Q4)

| Round | MVP format | Graded by code | Graded by LLM (with quotes) | Effort |
|---|---|---|---|---|
| **Debugging / "bug squash"** | 30–60 line program (Py/JS/TS) with **1–3 planted bugs** plus visible failing tests; candidate fixes and explains | **hidden tests pass**; diff size (lines changed); time | explanation of root cause | **S–M (reuses runner)** |
| **SQL** | schema diagram plus 3 questions (join, group/having, window/CTE) on made-up data | **result-set match** (above) | explanation of approach and indexes | **M** |
| **Code review** | 40–80 line diff with **N planted issues** tagged `{lines, category: bug/security/perf/readability/test}`; candidate leaves line comments | **match comments to planted issues by line overlap ±2 plus category**, giving recall and precision | tone and helpfulness of comments | **M** |
| **OOD / LLD** | prompt (parking lot, LRU cache, rate limiter, library system); add a "Class" box type to the existing SVG board, plus optional code | operation-sequence tests for runnable ones (LRU, rate limiter); board has ≥N classes and relationships | responsibilities, SOLID, extensibility follow-up ("add EV charging spots") | M |
| **Security** | (1) deterministic quiz on **OWASP Top 10:2025**; (2) "spot the vuln" code snippets (SQLi, XSS, IDOR, SSRF, hard-coded secret) using the code-review engine; (3) STRIDE threat model of a board diagram | quiz answers; planted-vuln matching; STRIDE category keyword rubric (existing stemmer) | threat reasoning | M |
| **DevOps / SRE** | (1) **Dockerfile review**: lint in browser with `dockerfile-utils` / `dockerfile-language-service` (MIT, JS; [UNVERIFIED] rule coverage vs hadolint, which is GPL-3.0 Haskell with no official wasm); (2) **K8s YAML**: js-yaml plus ajv against Kubernetes JSON schemas ([UNVERIFIED] schema-repo license; kubeconform itself is Apache-2.0), with checks for `resources.limits`, probes and image tag ≠ `latest`; (3) **scripted incident**: logs/metrics exhibit, then pick the next command or step (branching script) | lint rule hits; schema validity; scripted branch correctness | postmortem quality | M each; do one |
| **ML system design** | board plus 3 scripted stages: framing and metrics, data/features/model, serving and monitoring | rubric stems (offline vs online metric, label source, baseline, latency, drift, A/B) via existing keyword stemmer | trade-off depth | S (reuses system-design and scripted engine) |
| **Data science / stats** | A/B test case: metric choice, sample size and significance numeric, interpretation | `extractNumber` with tolerance (fix the unit bug first, brief 05) | interpretation | S–M |
| **Frontend** | JS utility problems in the existing worker (debounce with fake timers, deep clone, flatten, event emitter) plus an a11y quiz; full DOM/React UI building later in a sandboxed iframe | hidden tests | — | S (utility) / L (DOM) |
| **PM** | product sense, metrics/execution and estimation as a scripted case (like the business case) | estimation number with a range tolerance; rubric stems (user segment, pain point, prioritisation, north-star and guardrail metrics) | product judgment | S–M |
| **Consulting (MBB)** | case with an **exhibit table** (render data as a table), market sizing, synthesis; plus a **PEI** mode | numbers; rubric stems | structure and synthesis | M |
| **Finance depth** | add LBO-lite numerics (MOIC/IRR), EV bridge, accretion/dilution sign; S&T/quant probability numerics (expected value, conditional probability) | numbers with tolerance | explanations | S (append-only banks) |
| **Phone screen** | 25-minute timer: 1 easy coding problem plus 2 concept questions ("what is a hash map's worst case?") | tests plus quiz | — | S |
| **Company loop presets** | sequence existing rounds with official facts (e.g. "Amazon-style OA: 2 problems / 90 min + LP survey-style questions"; "Meta-style: 2 problems in 40 min, no running code until the end"; "Google-style intern: 2 × 45-min coding"; "McKinsey-style: PEI + case"; "Goldman-style: 30-min video-style answers + Superday") and **show the source link** on the preset | inherited | inherited | **S–M, big demo value** |

### Where to source questions (licenses)

| Source | License | Use |
|---|---|---|
| Exercism problem-specifications (152 exercises, JSON canonical tests) | **MIT** (verified) | adapt problems and test data directly, with attribution |
| Tech Interview Handbook (topics, rubrics, behavioral lists) | **MIT** (verified) | rubric text, topic lists. Its "Grind 75" list **names LeetCode problems; don't copy LeetCode statements** |
| trekhleb/javascript-algorithms; TheAlgorithms/Python; kdn251/interviews | MIT (verified via GitHub API) | reference solutions, topic coverage |
| donnemartin/interactive-coding-challenges | Apache-2.0 (verified) | problems plus tests |
| System Design Primer | **CC BY 4.0** (verified in README; *not* BY-SA as the request assumed) | system-design prompts and reference notes, with attribution |
| ashishps1 awesome-low-level-design / awesome-system-design-resources | **GPL-3.0** | read for ideas; don't copy into the MIT repo |
| alexeygrigorev/data-science-interviews | **CC BY 4.0** (verified) | DS/ML theory questions |
| OWASP Top 10:2025 | **CC BY 3.0 Unported** (site footer) | security quiz content |
| OWASP Juice Shop | MIT | inspiration for vuln snippets |
| Kubernetes website docs | **CC BY 4.0** (verified) | DevOps questions |
| Chinook DB | MIT-style (verified LICENSE.md) | SQL datasets |
| Pagila | PostgreSQL license | SQL datasets |
| SQL Murder Mystery (NUKnightLab) | MIT | SQL datasets |
| Amazon LPs, McKinsey sample cases, Meta/Google guides | copyrighted | **link and quote briefly; don't bundle** |
| LeetCode | ToS bans scraping and copying Content (questions and solutions). https://leetcode.com/terms/ | **don't use** |
| BIWS / Wall Street Oasis, CTCI (crackingthecodinginterview.com), Alex Xu books, Exponent, Hello Interview | copyrighted / paid | **reference only** in a "Further reading" list |

**Practical path:** have AI agents write **original** problems in each Blind-75-style category (arrays/hashing, two pointers, sliding window, stack, binary search, linked list, trees, heap, graphs, DP, intervals). **Each must ship with a reference solution that passes its own tests in CI.** That single rule catches most AI-generated test errors. Tag difficulty, append-only.

---

## 5. Behavioral by company (Q5)
- **Amazon:** **16 LPs** (official list, verified above, from Customer Obsession to Success and Scale Bring Broad Responsibility). Tag each prompt with 1–2 LPs, and offer a preset of 4 questions that rotates through the LPs. Bar Raiser guidance (official): STAR, "I" not "we", measurable results, and deep follow-ups. Add a "drill-down" follow-up mode: "What exactly did *you* do?", "What data did you use?", "What would you do differently?"
- **Google:** questions mapped to **Leadership** and **Googleyness** (ambiguity, bias to action, collaboration) from the official video.
- **Meta:** PM "Leadership & Drive" (official). For SWE, the "Getting to know you" section of the official PDF.
- **Microsoft, Apple:** no official framework found [UNVERIFIED], so only offer generic presets.
- **McKinsey PEI (official):**
  - Expect detail on your specific role, "lead with reasoning", a conversation and not a rehearsed story, and 2 examples in each of four areas.
  - The four area names are on the page as clickable themes, but I couldn't read their text. Third parties name them Inclusive Leadership, Courageous Change, Personal Impact and Entrepreneurial Drive [UNVERIFIED].
  - PEI interviewers drill deep, so use drill-down mode.
- **Bain:** asks "why Bain specifically" (official), which is a good "why this company" rubric item.

**More reliable STAR(L) grading than LLM booleans:**
1. **LLM segments, code decides.** Ask the LLM only for **verbatim spans** for S, T, A, R and L. Verify each span with the existing quote check. A STAR box is ticked only if a verified span exists. That makes it explainable: hovering shows the quote.
2. **Deterministic signals:**

   | Signal | How it's computed |
   |---|---|
   | **"I" vs "we" ratio** | count first-person singular vs plural pronouns in the Action span; flag when "we" exceeds "I" |
   | **Result has a number** | reuse `extractNumber` on the R span (%, $, time saved, users) |
   | **Specificity** | named tool, team size or date; past tense |
   | **Balance** | proportion of words in Action (guides recommend Action be the largest part [guide, UNVERIFIED as a fixed ratio]) |
   | **Learning sentence** | present for STAR-L |
   | **Length** | 1–3 minutes spoken, about 150–400 words [guide] |

3. **Story bank** (localStorage): save a polished story, tag it with LPs or themes, and show a **coverage grid** ("you have no story for Disagree and Commit").

---

## 6. Feedback quality research (Q6)
- **LLM-as-judge pitfalls:**
  - **position bias, verbosity bias, self-enhancement bias**, and limited reasoning on math. Zheng et al. 2023 (MT-Bench), https://arxiv.org/abs/2306.05685
  - Reliability varies by task, so validate against human labels per task: Judge-Bench, https://arxiv.org/abs/2406.18403
  - Survey: https://arxiv.org/abs/2411.15594
- **Mitigations that fit InternShield:**
  - analytic per-criterion rubrics with level descriptors (Prometheus)
  - temperature 0 (already)
  - evidence quotes (already)
  - **code-computed facts passed in as facts** (already for tests and numbers)
  - no overall 1–10 score
  - **ignore length**: add "longer answers are not better" to the prompt, and cap answers (already ≤1,200 chars)
  - a golden set
  - a visible note: "AI feedback can be wrong; the 'Checked by code' row is exact."
- **Make feedback actionable:**
  - (a) **top 3 fixes**, each tied to a quote and a rubric axis
  - (b) **one rewritten "stronger version"** of the weakest answer that **reuses only facts from the candidate's answer**, with the same invented-facts guard as resume tailoring (brief 03), labelled "Example".
  - (c) a **"Next drill"** chosen by code from the weakest axis (e.g. Verification weak → "Debugging round"; Result lacks numbers → "Behavioral: quantify results").
- **Voice vs text:**
  - **No strong head-to-head evidence found.**
  - Practice plus feedback improves interview performance: Clemson thesis and dissertation: https://open.clemson.edu/cgi/viewcontent.cgi?article=1477&context=all_theses , https://open.clemson.edu/all_dissertations/1009 [UNVERIFIED details].
  - A conversational-AI practice study with ESL students reported improved speaking performance without a significant drop in anxiety: https://academiccommons.columbia.edu/doi/10.7916/xm8w-px11 [UNVERIFIED details].
  - Verdict: voice is "nice to have." **Groq's free tier includes whisper-large-v3 / -turbo** (20 RPM, 2K RPD, 7.2K audio-seconds/hour), so voice-to-text answers are feasible later at no cost. **Post-hackathon** (privacy copy plus effort).

---

## 7. Free-tier feasibility (Q7)
- **Groq rate-limits page, read Oct 22, 2026:** `qwen/qwen3.8-27b`, `openai/gpt-oss-20b` and `openai/gpt-oss-120b` each show **30 RPM, 1K RPD, 8K TPM, 200K TPD**. https://console.groq.com/docs/rate-limits
  - Limits are **per organisation and per model**.
  - ⚠️ The page says the table shows "base limits for the Developer plan". **Check the console Limits page for the actual free-tier numbers** [UNVERIFIED which plan the table reflects].
- **Session cost estimate (mine, not measured):**
  - A question call is about 1.5–2.5K tokens: system prompt, role/JD/resume context (up to about 900 tokens), growing transcript, and 150 out.
  - Feedback is about 3–5K in plus up to 900 out.
  - A 4-question session plus feedback comes to about **10–14K tokens**.
  - At 200K TPD, that's **about 15–20 sessions a day per model**.
  - **8K TPM means about one feedback call per minute per model, site-wide.** That's the real bottleneck during a judge demo.
- **Recommendations:**
  1. **Split by model:**
     - questions and hints → `gpt-oss-20b`
     - feedback → `qwen3.8-27b` (or `gpt-oss-120b` for scripted rounds, which need no vision)
     - each with the other as fallback
     - This roughly triples token capacity, since each model has its own bucket.
  2. **Shrink context:** send JD and resume only on the first call. Keep a 300-token "context summary" afterwards.
  3. Read the `x-ratelimit-remaining-tokens` and `retry-after` headers. On a 429, show "Busy, retrying in N s" instead of an error.
  4. **Use the bigger model for feedback?** Yes, where the TPM bucket allows. Feedback is one call per session and is the quality-critical one.
  5. **Server-side session counting:** the server currently trusts the client's call count. Sign a session token (HMAC of sessionId + count) to make the 12-call cap real.
- **Other free LLMs:**

  | Provider | Free tier | Fit |
  |---|---|---|
  | **Gemini API** | free tier exists, no card. Its terms say for Unpaid Services **"human reviewers may read"** content and it's used to improve products: https://ai.google.dev/gemini-api/terms . Per-model RPM/RPD: check AI Studio; https://ai.google.dev/gemini-api/docs/rate-limits | **conflicts with the privacy line if resume text is sent.** Only for non-personal calls, like generating question variants offline |
  | **OpenRouter `:free` models** | **50 requests a day** without credits; buying ≥$10 raises it to 1,000 (**PAID**). https://openrouter.ai/docs/api_reference/limits | too small |
  | **Cerebras** | reportedly **no recurring free tier**: a 30-day trial credit. https://inference-docs.cerebras.ai/support/rate-limits [verify] | not a stable fallback |

---

## 8. Practice UX (Q8)
- **Models to borrow from:**
  - **interviewing.io:** 1–4 on three axes, a written feedback form.
  - **Hello Interview:** a time-boxed delivery framework. Show it as a stage bar with per-stage timers in system design.
  - **Google Interview Warmup:** it gave non-judgmental "insights" (job-related terms used, most-repeated words, talking points covered) instead of grades. **Its old URL now 301-redirects** to a general interview-tips article, so treat it as discontinued (checked Oct 22, 2026).
  - **Yoodli / Big Interview** for speech analytics (post-hackathon).
- **During a session:**
  - (1) a **stage bar** (e.g. Clarify → Plan → Code → Test → Optimise) with optional per-stage timers
  - (2) a **"plan first" box** before the editor unlocks. It's tiny, rewards Communication, and fits the hackathon's plan-first theme.
  - (3) a **hints ladder**: nudge → approach → pseudocode. Each step is logged and shown in feedback ("solved with 1 hint").
  - (4) a Meta-style "no-run mode" toggle, where you can't run until you submit.
- **After a session (results screen):**
  - per-axis band chips (Strong / Solid / Developing / Not yet)
  - the "Checked by code" row
  - **top 3 fixes with quotes**
  - one "stronger version" example
  - a **"Next drill"** button
  - a **progress sparkline per axis** across past sessions (localStorage, already stored)
  - the source links for the rubric used ("Rubric adapted from Tech Interview Handbook (MIT) and Meta's official guide")

---

## (a) Role-by-role coverage matrix (rounds needed vs built)

✅ built · 🟡 partial · ❌ missing · ➕ = recommended in the 3–4 day window

| Role | Recruiter / why-co | Behavioral (co-tuned) | DSA coding | SQL | Debug / code review | System / OO design | Domain round | Loop preset |
|---|---|---|---|---|---|---|---|---|
| SWE intern / new grad | ✅ | 🟡 generic ➕Amazon LP/Google | 🟡 5 problems, Py/JS ➕TS, more problems, (Java flag) | ❌ ➕ | ❌ ➕ debug, ➕ review | 🟡 student-scale | — | ❌ ➕ |
| Data scientist | ✅ | 🟡 | 🟡 | ❌ ➕ | ❌ | — | ❌ stats/A-B (stretch) | ❌ |
| Data engineer | ✅ | 🟡 | 🟡 | ❌ ➕ | ❌ | 🟡 (pipeline design via board) | ❌ | ❌ |
| ML engineer | ✅ | 🟡 | 🟡 | ❌ ➕ | ❌ | ❌ ML design (S, stretch) | ❌ ML theory | ❌ |
| Security | ✅ | 🟡 | 🟡 | ❌ | ❌ ➕ spot-the-vuln via review engine | ❌ threat model | ❌ OWASP quiz (stretch) | ❌ |
| DevOps / SRE | ✅ | 🟡 | 🟡 | ❌ | ❌ | 🟡 | ❌ Dockerfile/K8s/incident (post) | ❌ |
| Frontend | ✅ | 🟡 | 🟡 ➕TS utilities | — | ❌ | ❌ | ❌ DOM/a11y (post) | ❌ |
| Mobile | ✅ | 🟡 | 🟡 (no Swift/Kotlin) | — | ❌ | ❌ | ❌ (post) | ❌ |
| PM | ✅ | 🟡 | — | — | — | — | ❌ product sense/metrics/estimation (stretch) | ❌ |
| Product designer | ✅ | 🟡 | — | — | — | — | ✅ portfolio, ✅ challenge, ❌ app critique | ❌ |
| IB / finance | ✅ | 🟡 | — | — | — | — | ✅ technicals 🟡 depth (➕ append LBO/EV numerics) | ❌ ➕ GS-style |
| S&T / quant | ✅ | 🟡 | 🟡 | — | — | — | ❌ probability numerics (S, stretch) | ❌ |
| Consulting (MBB) | ✅ | ❌ PEI ➕ | — | — | — | — | ✅ case 🟡 (no exhibits/market sizing) | ❌ ➕ McKinsey-style |

## (b) Language-runner architecture
See §3d. In short: **all client-side workers behind one `RunnerHost`, plus one JSON test-spec format (Exercism-style), generated per-language wrappers, and batch execution.**
- **Now:** Py ✅, JS ✅, **TS** (transpile), **SQL** (sql.js)
- **Flag:** **Java** (TeaVM javac)
- **Post-hackathon:**
  - C/C++ via Wasmer clang, with COOP/COEP scoped to `/interview`
  - a server-proxied runner for Go/Rust/C#/Kotlin/Swift: Godbolt with permission, or a self-hosted, hardened Piston/Judge0 ≥1.13.1 on a paid VM **(PAID)**

## (c) Ranked build list and phased plan

### Ranked by impact ÷ effort (3–4 days, 1 dev with AI agents)

| # | Item | Impact | Effort | Risk | Depends on | Paid? |
|---|---|---|---|---|---|---|
| 1 | **Per-axis rubric results screen**: TIH 4-axis (MIT) for tech, round-specific axes elsewhere; code-measured signals; evidence-or-cap rule; top-3 fixes; next drill; progress sparkline | High (Design + Impact) | S–M | Low | existing feedback JSON | no |
| 2 | **LLM load split plus fallback plus 429 handling plus context shrink** (questions → gpt-oss-20b, feedback → qwen/120b) | High (demo reliability) | S | Low | — | no |
| 3 | **Debugging round** (planted bugs plus failing tests, Py/JS/TS) | High | S–M | Low | runner | no |
| 4 | **SQL round** with sql.js worker plus result-set grader plus 6–9 questions on made-up data | High | M | Low–Med (worker/WASM loading) | RunnerHost | no |
| 5 | **Company-tuned behavioral**: Amazon LP preset (official list), Google/McKinsey PEI presets, drill-down follow-ups, **code-checked STAR spans plus I/we plus metric** | High | M | Low | quote verifier | no |
| 6 | **Loop presets** with official-source badges (Google intern, Meta coding, Amazon OA-style, McKinsey, Goldman) | High (Innovation/Presentation) | S–M | Low (wording must say "-style", not affiliated) | 3–5 | no |
| 7 | **TypeScript** via `transpileModule` | Med | S | Low | JS worker | no |
| 8 | **Problem bank to about 15–20** original problems across DSA categories, difficulty tags, op-sequence harness (LRU cache) — each with a reference solution tested in CI | Med–High | M | Med (AI-written tests; mitigated by CI rule) | harness | no |
| 9 | **Code review round** (planted issues, line-match grading), reused for security "spot the vuln" | Med–High | M | Low | — | no |
| 10 | Scripted numerics: finance LBO/EV, quant probability, PM estimation, DS A/B (append-only banks; **fix the unit bug from brief 05 first**) | Med | S each | Low | extractNumber fix | no |
| 11 | **Java (flagged)** via TeaVM javac, self-hosted assets, license check first | Med | M–L | **Med–High** (WasmGC support, license unclear) | harness | no |
| 12 | Signed server-side call counter (HMAC session token) | Med (abuse) | S | Low | — | no |
| — | *Post-hackathon:* C/C++ (Wasmer clang, about 30 MB, COOP/COEP); Godbolt/server runner for Go/Rust/C#/Kotlin/Swift (permission or **PAID VM**); Dockerfile/K8s/incident rounds; ML design; frontend DOM/React sandbox; voice answers (Groq Whisper free tier); timed OA mode; take-home; mobile | | | | | |

### Phased plan (today is Thu Oct 22; the review is at 3 PM ET; the deadline is Mon Oct 26, 5 PM ET)
- **Thu Oct 22, after the review:**
  - #2 (LLM split, fallback, 429)
  - #7 (TS)
  - #1 part 1: rubric JSON schema, band chips, "Checked by code" signals for coding
- **Fri Oct 23:**
  - #3 (debugging round, about 5 planted-bug programs)
  - #4 (SQL round with sql.js and grader, 6 questions)
- **Sat Oct 24:**
  - #5 (LP/PEI behavioral, STAR spans, story bank, minimal)
  - #6 (loop presets)
  - #1 part 2: results screen, next drill, progress
- **Sun Oct 25:**
  - #8 (problem bank to 15+)
  - #9 (code review) **or** #11 (Java flag). Pick one. Review is safer; Java is flashier but riskier.
  - #10 numerics if time allows
- **Mon Oct 26 (until about 1 PM):** freeze features. Run evals, the golden set and the Playwright pass. Record the demo. **Don't start new runners on Monday.**

---

## Sources (primary first)
- Google: https://www.youtube.com/watch?v=zhUgaKb0s5A ; https://www.google.com/about/careers/applications/how-we-hire/
- Meta: https://www.metacareers.com/swe-prep-onsite/ ; https://d3no4ktch0fdq4.cloudfront.net/public/course/files/Meta_SWE_full_loop_guide.pdf ; https://d3no4ktch0fdq4.cloudfront.net/public/course/files/FB_Onsite_guide_-_Software_engineer.pdf ; https://www.metacareers.com/blog/acing-your-software-engineering-internship-interview-at-meta/ ; https://www.metacareers.com/ML-prep-onsite/ ; https://www.metacareers.com/pm-prep-onsite/ ; https://www.metacareers.com/ds-prep-initial/
- Amazon: https://www.amazon.jobs/content/en/our-workplace/leadership-principles ; https://www.amazon.jobs/content/en/how-we-hire/sde-ii-interview-prep ; https://www.amazon.jobs/content/en/how-we-hire/interviewing-at-amazon ; https://www.aboutamazon.com/news/workplace/amazon-bar-raiser ; https://www.aboutamazon.com/news/workplace/amazon-job-interview-questions-tips-bar-raisers
- Microsoft: https://careers.microsoft.com/v2/global/en/hiring-tips.html ; https://careers.microsoft.com/v2/global/en/hiring-tips/technical-interviewing
- Jane Street: https://www.janestreet.com/preparing-for-a-software-engineering-interview/ ; https://www.janestreet.com/trading-interviews/
- Goldman Sachs: https://www.goldmansachs.com/careers/students/prepare
- McKinsey: https://www.mckinsey.com/careers/interviewing ; BCG: https://careers.bcg.com/global/en/case-interview-preparation ; Bain: https://www.bain.com/careers/hiring-process/interviewing/ , https://www.bain.com/careers/hiring-process/case-interview/
- Rubrics: https://www.techinterviewhandbook.org/coding-interview-rubrics/ ; interviewing.io blogs (linked above); https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery
- Runners:
  - Piston https://github.com/engineer-man/piston
  - Judge0 https://ce.judge0.com/ , https://judge0.com/ , advisories https://github.com/judge0/judge0/security/advisories/GHSA-h9g2-45c8-89cf , https://tantosec.com/blog/judge0/
  - Godbolt https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/API.md
  - JDoodle https://www.jdoodle.com/docs/api/credits
  - TeaVM javac https://github.com/konsoletyper/teavm-javac , https://teavm.org/playground.html
  - CheerpJ https://cheerpj.com/docs/licensing
  - Wasmer clang https://wasmer.io/posts/clang-in-browser , COOP/COEP https://docs.wasmer.io/sdk/wasmer-js/explainers/troubleshooting/
  - browsercc https://github.com/BertalanD/browsercc
  - sql.js https://github.com/sql-js/sql.js ; PGlite https://github.com/electric-sql/pglite ; DuckDB-WASM https://github.com/duckdb/duckdb-wasm
  - WebVM/CheerpX https://github.com/leaningtech/webvm
- Licenses: Exercism https://github.com/exercism/problem-specifications ; TIH https://github.com/yangshun/tech-interview-handbook ; System Design Primer https://github.com/donnemartin/system-design-primer#license ; OWASP Top 10 https://owasp.org/Top10/2025/ ; LeetCode ToS https://leetcode.com/terms/
- LLMs: https://console.groq.com/docs/rate-limits ; https://ai.google.dev/gemini-api/terms ; https://openrouter.ai/docs/api_reference/limits ; https://inference-docs.cerebras.ai/support/rate-limits
- Research: https://arxiv.org/abs/2306.05685 ; https://arxiv.org/abs/2411.15594 ; https://arxiv.org/abs/2406.18403 ; https://arxiv.org/abs/2310.08491 ; https://arxiv.org/abs/2303.16634 ; https://aclanthology.org/2024.bea-1.7.pdf ; https://arxiv.org/abs/2504.21330
- Language data: https://survey.stackoverflow.co/2025/technology ; https://interviewing.io/blog/we-analyzed-thousands-of-technical-interviews-on-everything-from-language-to-code-style-here-s-what-we-found

### Open / unverified items to check before relying on them
1. Which plan Groq's rate-limit table reflects. Check the console Limits page.
2. The teavm-javac license, and the WasmGC minimum versions for Safari.
3. Judge0 RapidAPI Basic at 50 a day (third-party page), and whether it needs a card.
4. Godbolt's stance on product use. Ask before using it.
5. McKinsey's four PEI theme names.
6. Apple, Netflix, Nvidia and Databricks loop details (no official pages found).
7. Dockerfile-lint rule coverage in the JS libraries, and the license of the K8s JSON-schema repo.
8. Voice-practice efficacy studies (details not read in full).
