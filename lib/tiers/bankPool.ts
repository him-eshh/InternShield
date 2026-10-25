// Similar-question fallback and "most asked" ranking for the question bank. Pure.
// bank.json keeps each question's companies ordered by how often that company's list asked it (most first, at most 12).
// There is no per-company count in the file, so "most asked" is a proxy: how many company lists carry the question
// (breadth) plus how near the top the chosen company sits in its own list.
import { filterBank, normCompany, type BankFilter } from "./bank";
import type { BankQuestion } from "./types";

export interface CompanyFamily {
  id: string;
  label: string;
  /** Lowercase names. A company outside the bank lands in a family by name; members with questions are borrowed from. */
  members: string[];
}
const FAMILIES: CompanyFamily[] = [
  { id: "fintech", label: "fintech", members: ["stripe", "square", "block", "paypal", "visa", "affirm", "robinhood", "coinbase", "plaid", "brex", "ramp", "chime", "klarna", "adyen", "revolut", "wise", "sofi", "capital one", "jpmorgan", "goldman sachs", "morgan stanley", "bloomberg", "intuit"] },
  { id: "quant", label: "quant trading", members: ["jane street", "two sigma", "jump trading", "de shaw", "optiver", "imc", "drw", "virtu", "susquehanna", "tower research", "five rings", "hudson river trading", "hrt", "citadel", "goldman sachs", "bloomberg", "morgan stanley", "jpmorgan"] },
  { id: "bigtech", label: "big tech", members: ["google", "facebook", "amazon", "microsoft", "apple", "netflix", "openai", "anthropic", "deepmind"] },
  { id: "social", label: "social and consumer app", members: ["linkedin", "snapchat", "snap", "twitter", "pinterest", "quora", "tiktok", "bytedance", "yahoo", "reddit", "discord", "spotify"] },
  { id: "marketplace", label: "marketplace and delivery", members: ["uber", "lyft", "doordash", "airbnb", "grab", "shopee", "booking.com", "expedia", "wayfair", "ebay", "flipkart", "walmart global tech", "walmart", "instacart", "etsy", "zillow", "shopify"] },
  { id: "enterprise", label: "enterprise software", members: ["oracle", "salesforce", "adobe", "vmware", "servicenow", "atlassian", "cisco", "ibm", "sap", "docusign", "dropbox", "twilio", "rubrik", "qualtrics", "workday", "snowflake", "databricks", "splunk", "datadog", "mongodb", "palantir", "notion", "figma", "slack", "zoom"] },
  { id: "hardware", label: "hardware and AI", members: ["nvidia", "tesla", "cruise automation", "samsung", "intel", "amd", "qualcomm", "waymo", "rivian"] },
  { id: "services", label: "IT services", members: ["tcs", "infosys", "wipro", "accenture", "cognizant", "capgemini", "deloitte"] },
];
const KEYWORD_FAMILY: [RegExp, string][] = [
  [/pay|bank|capital|financ|trading|securit|invest|insur|wallet|credit|ledger/, "fintech"],
  [/soft|cloud|data|systems|labs|\bai\b/, "enterprise"],
];

/** The company group a name belongs to (so an unlisted company can borrow its neighbours' questions). */
export function companyFamily(name: string): CompanyFamily | null {
  const n = normCompany(name);
  if (!n) return null;
  const hit = FAMILIES.find((f) => f.members.includes(n));
  if (hit) return hit;
  const kw = KEYWORD_FAMILY.find(([re]) => re.test(n));
  return kw ? (FAMILIES.find((f) => f.id === kw[1]) ?? null) : null;
}

export interface CompanyScope {
  /** none: no company chosen; exact: the bank tags it; similar: a company group stands in; top: the most-asked questions overall stand in. */
  kind: "none" | "exact" | "similar" | "top";
  /** Normalized company names whose questions are in scope (empty for none and top). */
  companies: string[];
  label?: string;
  /** Plain sentence for the user when something else is substituted. */
  message: string | null;
}
const MIN_FAMILY_QUESTIONS = 8;
const displayName = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 60);
const taggedWith = (bank: BankQuestion[], names: string[]) => bank.filter((q) => q.companies.some((c) => names.includes(normCompany(c))));

function familyScope(bank: BankQuestion[], company: string): CompanyScope | null {
  const fam = companyFamily(company);
  if (!fam) return null;
  const inBank = new Set(bank.flatMap((q) => q.companies.map(normCompany)));
  const companies = fam.members.filter((m) => inBank.has(m) && m !== normCompany(company));
  if (!companies.length || taggedWith(bank, companies).length < MIN_FAMILY_QUESTIONS) return null;
  return { kind: "similar", companies, label: fam.label, message: `No ${displayName(company)}-tagged questions; showing similar ${fam.label} questions.` };
}
const topScope = (company: string): CompanyScope => ({ kind: "top", companies: [], message: `No ${displayName(company)}-tagged questions; showing the most commonly asked questions across top companies.` });

/** How a typed company maps onto the bank, and the sentence to show when it is not an exact match. */
export function companyScope(bank: BankQuestion[], company?: string | null): CompanyScope {
  const name = company?.trim();
  if (!name) return { kind: "none", companies: [], message: null };
  if (taggedWith(bank, [normCompany(name)]).length) return { kind: "exact", companies: [normCompany(name)], label: displayName(name), message: null };
  return familyScope(bank, name) ?? topScope(name);
}

/** Higher = asked more. With companies: lists carrying the question, doubled, minus its place in the list (near the top wins). */
export function askedScore(q: BankQuestion, companies: string[] = []): number {
  const n = q.companies.length;
  if (!companies.length) return n;
  let best = -1;
  q.companies.forEach((c, i) => {
    if (companies.includes(normCompany(c))) best = Math.max(best, n * 2 - i);
  });
  return best;
}
const byAsked = (companies: string[]) => (a: BankQuestion, b: BankQuestion) => askedScore(b, companies) - askedScore(a, companies) || a.id.localeCompare(b.id, "en", { numeric: true });

/** Questions most asked at `company` first (or across all lists when no company is given). */
export function rankMostAsked(bank: BankQuestion[], company?: string | null): BankQuestion[] {
  const scope = companyScope(bank, company);
  const pool = scope.kind === "exact" || scope.kind === "similar" ? taggedWith(bank, scope.companies) : bank;
  return [...pool].sort(byAsked(scope.companies));
}

export interface PoolPick {
  pool: BankQuestion[];
  scope: CompanyScope;
  /** What was substituted, in plain words. */
  note?: string;
}
const TOP_N = 8;
const join = (...xs: (string | null | undefined)[]) => xs.filter(Boolean).join(" ");

/**
 * The closest pool of unused questions. Order: every filter; then drop difficulty (keep the topic); then drop topics;
 * then drop the role focus. If that finds nothing the search widens: company -> similar companies -> most asked overall.
 * Null only when the whole bank is used up, never an unrelated random question.
 */
export function selectPool(bank: BankQuestion[], f: BankFilter, used: ReadonlySet<string>): PoolPick | null {
  const level = f.difficulty && f.difficulty !== "mixed" ? f.difficulty : null;
  const topics = f.topics ?? [];
  const first = companyScope(bank, f.company);
  const scopes: CompanyScope[] = [first];
  if (first.kind === "exact") {
    const fam = familyScope(bank, f.company ?? "");
    if (fam) scopes.push({ ...fam, message: `You've seen every matching ${first.label} question; showing similar ${fam.label} questions.` });
    scopes.push({ kind: "top", companies: [], message: `You've seen every matching ${first.label} question; showing the most commonly asked questions across top companies.` });
  } else if (first.kind === "similar") scopes.push(topScope(f.company ?? ""));
  const steps: { drop: ("difficulty" | "topics" | "role")[]; note: string | null }[] = [{ drop: [], note: null }];
  if (level) steps.push({ drop: ["difficulty"], note: `No unused ${level} questions left here, so this one is a different difficulty.` });
  if (topics.length) steps.push({ drop: level ? ["difficulty", "topics"] : ["topics"], note: `Nothing left for ${topics.join(", ")}, so this one is a different topic.` });
  if (f.role && f.role !== "swe") steps.push({ drop: ["difficulty", "topics", "role"], note: "Nothing left for this role focus, so this one is from the wider set." });
  for (const scope of scopes) {
    const base = scope.kind === "exact" || scope.kind === "similar" ? taggedWith(bank, scope.companies) : bank;
    for (const step of steps) {
      const pool = filterBank(base, {
        role: step.drop.includes("role") ? null : f.role,
        difficulty: step.drop.includes("difficulty") ? null : f.difficulty,
        topics: step.drop.includes("topics") ? [] : topics,
      }).filter((q) => !used.has(q.id));
      const note = join(scope.message, step.note);
      if (pool.length) return { pool, scope, ...(note ? { note } : {}) };
    }
  }
  return null;
}

/** One question from the closest pool. `mostAsked` takes one of the top few by askedScore instead of any. */
export function pickFromBank(bank: BankQuestion[], f: BankFilter, used: ReadonlySet<string>, rand: () => number, mostAsked = false): { q: BankQuestion; note?: string } | null {
  const picked = selectPool(bank, f, used);
  if (!picked) return null;
  if (!mostAsked) return { q: picked.pool[Math.floor(rand() * picked.pool.length)], ...(picked.note ? { note: picked.note } : {}) };
  const ranked = [...picked.pool].sort(byAsked(picked.scope.companies));
  const q = ranked[Math.floor(rand() * Math.min(TOP_N, ranked.length))];
  const where = picked.scope.kind === "exact" ? ` at ${picked.scope.label}` : " across company lists";
  return { q, note: join(picked.note, `One of the most asked${where}.`) };
}

// ---------- Topic groups for the setup screen ----------
const TOPIC_GROUPS: { label: string; tags: string[] }[] = [
  { label: "Arrays and strings", tags: ["array", "string", "matrix", "two pointers", "sliding window", "prefix sum", "string matching", "rolling hash", "simulation"] },
  { label: "Hashing and counting", tags: ["hash table", "counting", "hash function", "counting sort", "enumeration"] },
  { label: "Trees and graphs", tags: ["tree", "binary tree", "binary search tree", "depth-first search", "breadth-first search", "graph", "union find", "trie", "topological sort", "shortest path", "segment tree", "binary indexed tree", "eulerian circuit"] },
  { label: "Dynamic programming and recursion", tags: ["dynamic programming", "recursion", "memoization", "backtracking", "divide and conquer", "greedy", "bitmask"] },
  { label: "Stacks, queues and lists", tags: ["stack", "queue", "linked list", "heap (priority queue)", "monotonic stack", "monotonic queue", "ordered set"] },
  { label: "Searching and sorting", tags: ["binary search", "sorting", "merge sort", "quickselect", "bucket sort", "radix sort", "line sweep"] },
  { label: "Math and bits", tags: ["math", "bit manipulation", "number theory", "geometry", "combinatorics", "game theory", "brainteaser"] },
];
/** Topic tags in the bank, grouped for browsing. Inside a group the most common come first; unknown tags land in "More". */
export function groupTopics(tags: string[]): { label: string; topics: string[] }[] {
  const known = new Set(TOPIC_GROUPS.flatMap((g) => g.tags));
  const groups = TOPIC_GROUPS.map((g) => ({ label: g.label, topics: tags.filter((t) => g.tags.includes(t)) }));
  const rest = tags.filter((t) => !known.has(t));
  if (rest.length) groups.push({ label: "More", topics: rest });
  return groups.filter((g) => g.topics.length);
}
