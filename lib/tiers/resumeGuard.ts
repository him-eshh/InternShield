// Rewrite guard and word diff for the tailored resume (devpost/tier2-spec.md > Slice 8).
// Pure: a suggested rewrite may reword, never add facts. Anything that looks like a number,
// a name, or a tool must already be somewhere in the user's resume text.
import { MAX_REWRITE_CHARS, type DiffPart, type GuardIssue, type GuardIssueKind, type GuardResult } from "./types";

// ---------- word lists ----------

/** Tools and skills: profile suggestions (components/ProfileSteps.tsx, not exported) plus common tech/business/design tools. */
const SKILLS = [
  // profile suggestions
  "Python", "JavaScript", "React", "Java", "SQL", "Git", "Excel", "Marketing", "Sales", "Project management",
  "Presentations", "Data analysis", "Financial modeling", "Accounting", "Valuation", "Bloomberg", "Figma",
  "Photoshop", "Illustrator", "Typography", "Prototyping", "Video editing", "Public speaking", "Customer service",
  // languages
  // Ordinary-word names (Word, Rest, Spring, Swift, Slack, Notion, Sketch...) only appear in an unambiguous form.
  "TypeScript", "C++", "C#", "Golang", "Rust", "PHP", "Kotlin", "Scala", "Perl", "MATLAB",
  "HTML", "CSS", "Sass", "Bash", "PowerShell", "Solidity", "Haskell", "Objective-C", "Fortran", "COBOL", "VBA",
  // web and app frameworks
  "Node.js", "Express.js", "Next.js", "Nuxt", "Vue", "Vue.js", "Angular", "Svelte", "jQuery", "Redux", "Tailwind",
  "Bootstrap", "Django", "Flask", "FastAPI", "Ruby on Rails", "Spring Boot", ".NET", "ASP.NET",
  "Laravel", "React Native", "Flutter", "SwiftUI", "Android", "iOS", "GraphQL", "REST API", "REST APIs", "gRPC",
  // data and ML
  "Pandas", "NumPy", "SciPy", "scikit-learn", "TensorFlow", "PyTorch", "Keras", "Apache Spark", "PySpark", "Hadoop",
  "Kafka", "Airflow", "dbt", "Snowflake", "BigQuery", "Redshift", "Databricks", "Jupyter", "Machine learning",
  "Deep learning", "NLP", "Computer vision", "LLM", "LLMs", "OpenCV", "Hugging Face", "SPSS", "SAS", "Stata", "Minitab",
  "Tableau", "Power BI", "Looker", "Alteryx", "Google Analytics", "A/B testing",
  // databases
  "PostgreSQL", "Postgres", "MySQL", "SQLite", "MongoDB", "Redis", "DynamoDB", "Cassandra", "Elasticsearch",
  "Firebase", "Supabase", "NoSQL",
  // cloud and devops
  "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins", "CI/CD",
  "GitHub Actions", "GitHub", "GitLab", "Linux", "Nginx", "AWS Lambda", "Heroku", "Vercel", "Netlify",
  // hardware and engineering
  "Arduino", "Raspberry Pi", "Verilog", "VHDL", "FPGA", "SolidWorks", "AutoCAD", "LabVIEW", "Simulink",
  // business and finance
  "PowerPoint", "Microsoft Word", "Google Sheets", "Microsoft Office", "Office 365", "Salesforce", "HubSpot", "SAP",
  "QuickBooks", "NetSuite", "Xero", "Jira", "Confluence", "Asana", "Trello", "Zendesk", "Mailchimp", "Shopify",
  "SEO", "SEM", "CRM", "Six Sigma", "Agile", "Scrum", "Kanban", "PMP", "CFA", "CPA", "FactSet", "Capital IQ",
  "PitchBook", "DCF", "LBO", "M&A", "Financial analysis", "Bookkeeping", "GAAP", "IFRS", "Risk management",
  "Equity research", "Market research", "Product management", "Copywriting", "Content marketing", "Email marketing",
  "Digital marketing", "Canva",
  // design and media
  "InDesign", "After Effects", "Premiere Pro", "Final Cut Pro", "Lightroom", "Adobe Creative Suite", "Adobe XD",
  "Blender", "Cinema 4D", "Unreal Engine", "Procreate", "UX", "UI", "UX research", "Wireframing", "User research",
  "Motion graphics", "3D modeling",
];

/** Ordinary words that are often capitalized only because they start a sentence. */
const COMMON = new Set(
  (
    "a an the and or but so yet for nor of in on at to by with from into onto over under as about after before during " +
    "while when where why how what which who whom whose that this these those it its i me my we our us you your he she they " +
    "them their his her is are was were be been being am do does did done have has had can could will would shall should may " +
    "might must also then than there here all any each every some most more many much few both either neither not no yes " +
    "led built made ran won grew cut set put got took gave saw met wrote drove taught sold bought brought found kept " +
    "lead build make run win grow write drive teach sell keep help work use own create design develop manage improve " +
    "plan support collaborate partner analyze research test launch deliver organize coordinate mentor train present " +
    "reduce increase boost streamline automate implement establish maintain oversee review prepare conduct assist " +
    "worked helped used owned partnered tested delivered served handled " +
    "developed designed created managed improved planned supported collaborated analyzed researched launched organized " +
    "coordinated mentored trained presented reduced increased boosted streamlined automated implemented established " +
    "maintained oversaw reviewed prepared conducted assisted spearheaded engineered optimized refactored documented " +
    "facilitated directed produced generated identified resolved negotiated drafted edited translated volunteered " +
    "building developing designing creating managing leading working helping using supporting improving " +
    "recently additionally " +
    "successfully independently collaboratively effectively quickly consistently regularly actively currently previously " +
    "responsible key main major new strong team teams daily weekly monthly through across within alongside together " +
    "summary skills experience education projects project objective profile overview highlights achievements"
  ).split(" "),
);

/** Words that are capitalized mid-sentence but aren't names. */
const ALWAYS_OK = new Set(["i", "i'm", "i've", "i'd", "i'll"]);

// ---------- normalizing ----------

/** Lowercase, straight quotes/dashes, drop apostrophes, punctuation to spaces (keeps + # . inside words), padded. */
function canon(s: string): string {
  const t = s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’ʼ']/g, "")
    .replace(/[‐-―]/g, "-")
    .replace(/[^a-z0-9+#.&/\s]/g, " ")
    .replace(/\.(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ` ${t} `;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SKILL_RES = SKILLS.map((name) => {
  const c = canon(name).trim();
  return { name, key: c, re: new RegExp(`(?<![a-z0-9+#])${escapeRe(c)}(?![a-z0-9+#]|\\.[a-z0-9])`) };
});

/** "$1,200" -> "1200", "40%" / "40 percent" -> "40%", "3x" / "3 times"? -> "3x", "5k" -> "5k". */
const NUMBER_RE = /[$£€]?\d+(?:[.,]\d+)*(?:\s?%|\s?percent\b|x\b|k\b|m\b|bn\b)?/gi;
function numberKey(raw: string): string {
  const lower = raw.toLowerCase();
  const digits = lower.replace(/[^\d.,]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(/,/g, ".").replace(/\.$/, "");
  const suffix = /%|percent/.test(lower) ? "%" : /x$/.test(lower) ? "x" : /k$/.test(lower) ? "k" : /bn$/.test(lower) ? "bn" : /m$/.test(lower) ? "m" : "";
  return digits + suffix;
}
const numberKeys = (s: string) => new Set([...s.normalize("NFKC").matchAll(NUMBER_RE)].map((m) => numberKey(m[0])));

/** Cardinals and multipliers spelled out. A word with a digit value also passes if that digit is in the resume. */
const NUMBER_WORDS: Record<string, string | null> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17",
  eighteen: "18", nineteen: "19", twenty: "20", thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70",
  eighty: "80", ninety: "90", hundred: null, hundreds: null, thousand: null, thousands: null, million: null,
  millions: null, billion: null, billions: null, dozen: "12", dozens: null, twice: null, double: null, doubled: null,
  triple: null, tripled: null, half: null, quadrupled: null,
};
const isNumberWord = (w: string) => Object.prototype.hasOwnProperty.call(NUMBER_WORDS, w);
/** "one of the", "one-on-one" aren't counts. */
const NOT_A_COUNT = / one (?:of|on) /;

// ---------- proper nouns ----------

const WORD_RE = /[A-Za-z][A-Za-z0-9'’&+#.-]*[A-Za-z0-9+#]|[A-Za-z]/g;
const SENTENCE_END = /[.!?;:•\n]\s*$|^\s*$|^\s*[-*–—]\s*$/;

/**
 * A capitalized sentence-initial word is ordinary if it's on the common list, or it has a verb/adverb ending
 * AND the same word shows up in lowercase in the resume or elsewhere in the rewrite ("Boeing" never does).
 */
function ordinaryStart(word: string, knownCanon: string, text: string): boolean {
  const w = word.toLowerCase();
  if (COMMON.has(w)) return true;
  if (!(w.length > 4 && /(?:ed|ing|ly|ize|ise|ates?)$/.test(w))) return false;
  return knownCanon.includes(` ${w} `) || new RegExp(`(?<![A-Za-z])${escapeRe(w)}(?![A-Za-z])`).test(text);
}

/** Runs of capitalized words, with an ordinary sentence-initial word and "I" taken off. */
function capitalRuns(text: string, knownCanon: string): string[] {
  const runs: string[] = [];
  let run: string[] = [];
  let lastEnd = 0;
  const flush = () => {
    if (run.length) runs.push(run.join(" "));
    run = [];
  };
  for (const m of text.matchAll(WORD_RE)) {
    const word = m[0];
    const start = m.index ?? 0;
    const gap = text.slice(lastEnd, start);
    lastEnd = start + word.length;
    const sentenceStart = SENTENCE_END.test(text.slice(0, start)) || start === 0;
    if (!/^\s+$/.test(gap) || sentenceStart) flush();
    const capital = /^[A-Z]/.test(word);
    if (!capital || ALWAYS_OK.has(word.toLowerCase().replace(/’/g, "'"))) {
      flush();
      continue;
    }
    if (sentenceStart && ordinaryStart(word, knownCanon, text)) continue;
    run.push(word);
  }
  flush();
  return runs;
}

// ---------- lowercase employers and titles ----------

/** Words after "at" that aren't a place of work. */
const AT_OK = new Set(
  "scale school home work least once times night launch length risk speed pace hand large first best peak random will least lunch noon events".split(" "),
);
const ORG_SUFFIX = "inc|llc|ltd|corp|corporation|co|labs|group|technologies|partners|studio|studios|agency|bank|capital";
/** Employer-shaped phrases in canon text; group 1 is the would-be employer word. */
const EMPLOYER_RES = [
  / at ([a-z][a-z0-9&]*) /g,
  / (?:worked|interned|consulted|contracted|freelanced) for ([a-z][a-z0-9&]*) /g,
  / interned with ([a-z][a-z0-9&]*) /g,
  new RegExp(` (?:for|with) ([a-z][a-z0-9&]*) (?:${ORG_SUFFIX}) `, "g"),
];
/** Title words; "lead" only as a title ("as a lead", "lead engineer"), not the verb. */
const TITLE_RES: [RegExp, string][] = [
  ...["senior", "principal", "manager", "director", "head of", "vp", "founder", "co founder", "cofounder", "president", "chief"].map(
    (t): [RegExp, string] => [new RegExp(` ${t} `), t],
  ),
  [/ (?:as (?:a |an |the )?lead |lead (?:engineer|developer|designer|analyst|researcher|organizer|consultant|scientist|intern) )/, "lead"],
];

/** Repeated matches need overlapping spaces, so scan with a moving lastIndex. */
function matchesAll(re: RegExp, s: string): string[] {
  const out: string[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    out.push(m[1]);
    re.lastIndex = m.index + 1;
  }
  return out;
}

// ---------- guard ----------

export function checkRewrite(resumeText: string, original: string, rewrite: string): GuardResult {
  const text = (rewrite ?? "").trim();
  if (!text || text.length > MAX_REWRITE_CHARS) return { ok: false, issues: [] };

  const known = `${resumeText ?? ""}\n${original ?? ""}`;
  const knownCanon = canon(known);
  const knownNumbers = numberKeys(known);
  const rewriteCanon = canon(text);

  const issues: GuardIssue[] = [];
  const seen = new Set<string>();
  const flag = (kind: GuardIssueKind, token: string) => {
    const key = canon(token).trim();
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({ kind, token });
  };

  for (const m of text.normalize("NFKC").matchAll(NUMBER_RE)) {
    if (!knownNumbers.has(numberKey(m[0]))) flag("number", m[0].trim());
  }

  const has = (w: string) => knownCanon.includes(` ${w} `);
  for (const w of rewriteCanon.trim().split(" ")) {
    if (!isNumberWord(w) || has(w)) continue;
    const digit = NUMBER_WORDS[w];
    if (digit && knownNumbers.has(digit)) continue;
    if (w === "one" && !rewriteCanon.replace(new RegExp(NOT_A_COUNT.source, "g"), " ").includes(" one ")) continue;
    flag("number", w);
  }

  const skillsHere = new Set<string>();
  for (const s of SKILL_RES) {
    if (!s.re.test(rewriteCanon)) continue;
    skillsHere.add(s.key);
    if (!s.re.test(knownCanon)) flag("skill", s.name);
  }

  for (const run of capitalRuns(text.normalize("NFKC"), knownCanon)) {
    const key = canon(run).trim();
    if (!key || skillsHere.has(key) || isNumberWord(key) || has(key)) continue;
    flag("proper_noun", run);
  }

  // Lowercase employers/titles, skipped when already covered by a flagged name ("Lead Engineer").
  const covered = (w: string) => [...seen].some((k) => ` ${k} `.includes(` ${w} `));
  for (const re of EMPLOYER_RES) {
    for (const w of matchesAll(re, rewriteCanon)) {
      if (COMMON.has(w) || AT_OK.has(w) || isNumberWord(w) || has(w) || skillsHere.has(w) || covered(w)) continue;
      flag("proper_noun", w);
    }
  }
  for (const [re, t] of TITLE_RES) {
    if (re.test(rewriteCanon) && !has(t) && !covered(t)) flag("proper_noun", t);
  }

  return issues.length ? { ok: false, issues } : { ok: true };
}

// ---------- diff ----------

const MAX_DIFF_TOKENS = 600;

/** Word-level diff. Each part keeps the whitespace in front of its words, so joining parts reads naturally. */
export function wordDiff(before: string, after: string): DiffPart[] {
  const a = (before ?? "").match(/\s*\S+/g) ?? [];
  const b = (after ?? "").match(/\s*\S+/g) ?? [];
  const parts: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.kind === kind) last.text += text;
    // A new part never glues onto the previous one ("Built" + "Developed" must not read "BuiltDeveloped").
    else parts.push({ kind, text: last && !/^\s/.test(text) ? ` ${text}` : text });
  };
  // The first token of each side has no leading space; later "same" tokens use the after side's spacing.
  const word = (t: string) => t.trim();

  if (a.length > MAX_DIFF_TOKENS || b.length > MAX_DIFF_TOKENS) {
    a.forEach((t) => push("removed", t));
    b.forEach((t) => push("added", t));
    return parts;
  }

  const n = a.length;
  const m = b.length;
  // dp[i][j] = LCS length of a[i..] and b[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = word(a[i]) === word(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && word(a[i]) === word(b[j])) {
      push("same", b[j]);
      i++;
      j++;
    } else if (i < n && (j >= m || dp[i + 1][j] >= dp[i][j + 1])) {
      push("removed", a[i++]);
    } else {
      push("added", b[j++]);
    }
  }
  return parts;
}
