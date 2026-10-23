// Scripted interview rounds: case and finance (devpost/tier4-spec.md > Scripted rounds). Pure.
// Every case, question and answer key is made up. Number keys equal the arithmetic from their own prompt.
import { checkUnit, extractCandidates, formatInUnit, pickFinal } from "./numbers";
import type { AnswerCheck, CheckResult, InterviewRound, InterviewTurn, ScriptedQuestion } from "./types";

type Point = { label: string; any: string[] };

const rubric = (points: Point[]): AnswerCheck => ({ kind: "rubric", points });
const num = (expected: number, unit: "$" | "%" | "", tolerance = 0.5): AnswerCheck => ({ kind: "number", expected, tolerance, unit });

const RECOMMEND: Point = {
  label: "a clear recommendation",
  any: ["recommend", "suggest", "propose", "advise", "i would", "i'd", "go ahead"],
};
const NEXT_STEP: Point = {
  label: "a risk or next step",
  any: ["risk", "test", "pilot", "trial", "next step", "monitor", "track", "measure", "downside", "survey", "careful", "watch"],
};
/** Recommendation rubric: a call, a reason using this case's data, and a risk or next step. */
const recommendation = (dataWords: string[]): AnswerCheck =>
  rubric([RECOMMEND, { label: "a reason from the data", any: dataWords }, NEXT_STEP]);

const COSTS: Point = { label: "costs", any: ["cost", "expense", "spend", "rent", "wage", "labor", "labour", "staff", "supplies", "ingredient"] };

/** Made-up business cases: structure (rubric), one calculation (number), recommendation (rubric).
 *  Append only: scriptFor picks by seed index, so reordering CASES or FINANCE_BANK moves in-progress sessions. */
export const CASES: { id: string; title: string; questions: ScriptedQuestion[] }[] = [
  {
    id: "coffee-cart",
    title: "Campus coffee cart's falling profit",
    questions: [
      {
        id: "coffee-cart-1",
        prompt:
          "A campus coffee cart's monthly profit fell from $2,000 to $1,200 over the last year, even though it is open the same hours. The owner asks you why, and what to do. How would you structure this problem?",
        check: rubric([
          { label: "revenue", any: ["revenue", "sales", "price", "pricing", "sell", "income", "volume"] },
          COSTS,
          { label: "customers", any: ["customer", "student", "demand", "foot traffic", "traffic", "buyer"] },
          { label: "competition", any: ["compet", "rival", "other cafe", "other coffee", "alternative", "nearby"] },
        ]),
      },
      {
        id: "coffee-cart-2",
        prompt:
          "Data: the cart sells coffee at $3.00 a cup. Each cup costs $1.00 in coffee, milk and the cup itself. Fixed costs are $6,000 a month for rent and wages. It now sells 3,600 cups a month, for a $1,200 profit. How many cups a month must it sell to earn $2,000 profit again, at the same price and costs? End with your final number.",
        check: num(4000, ""),
      },
      {
        id: "coffee-cart-3",
        prompt: "What would you recommend the coffee cart owner do, and why?",
        check: recommendation(["4,000", "4000", "400 more", "cups", "per cup", "contribution", "break even", "breakeven"]),
      },
    ],
  },
  {
    id: "bike-share",
    title: "Bike-share pricing change",
    questions: [
      {
        id: "bike-share-1",
        prompt:
          "A university bike-share raised its ride price from $2 to $3 last semester. Rides dropped, and its board wants to know whether the price change was a good idea. How would you structure this problem?",
        check: rubric([
          { label: "revenue", any: ["revenue", "sales", "income", "price", "pricing", "per ride"] },
          { label: "costs", any: ["cost", "maintenance", "repair", "expense", "staff", "upkeep"] },
          { label: "riders", any: ["rider", "customer", "student", "demand", "usage", "ride volume", "number of rides", "elastic"] },
          { label: "alternatives", any: ["compet", "alternative", "the bus", "buses", "scooter", "walking", "transit", "substitute"] },
        ]),
      },
      {
        id: "bike-share-2",
        prompt:
          "Data: at $2 a ride there were 9,000 rides a month. At $3 a ride there are 7,000 rides a month. Each ride costs $0.50 in maintenance at either price. What is the change in monthly ride profit, new minus old, in dollars? End with your final number.",
        check: num(4000, "$"),
      },
      {
        id: "bike-share-3",
        prompt: "What would you recommend the bike-share board do about the price, and why?",
        check: recommendation(["4,000", "4000", "profit", "rides", "per ride", "margin", "2,000 fewer", "2000 fewer", "$2.50", "$1.50", "demand"]),
      },
    ],
  },
  {
    id: "bookstore",
    title: "Bookstore's second location",
    questions: [
      {
        id: "bookstore-1",
        prompt:
          "An independent bookstore near campus is thinking about opening a second location across town. The owner asks whether it should. How would you structure this decision?",
        check: rubric([
          { label: "customers and market", any: ["customer", "demand", "market", "foot traffic", "traffic", "student", "population", "reader", "neighborhood", "neighbourhood"] },
          { label: "costs and investment", any: ["cost", "rent", "invest", "build", "staff", "wage", "expense", "capital", "up front", "upfront"] },
          { label: "revenue", any: ["revenue", "sales", "profit", "income", "price", "margin"] },
          { label: "competition", any: ["compet", "rival", "other bookstore", "online", "alternative", "cannibal"] },
        ]),
      },
      {
        id: "bookstore-2",
        prompt:
          "Data: opening the second store costs $60,000 up front. It is expected to bring in $15,000 a month in sales. Books cost 60% of sales, and rent and staff cost $4,000 a month. How many months until the store earns back the $60,000? End with your final number.",
        check: num(30, ""),
      },
      {
        id: "bookstore-3",
        prompt: "What would you recommend the bookstore owner do about the second location, and why?",
        check: recommendation(["30 months", "two and a half years", "2.5 years", "payback", "pay back", "earn back", "$2,000", "2,000 a month", "margin"]),
      },
    ],
  },
  {
    id: "food-truck",
    title: "Food truck menu cut",
    questions: [
      {
        id: "food-truck-1",
        prompt:
          "A food truck has 12 items on its menu and long lines at lunch. The owner is thinking about cutting the menu down to the best sellers. How would you structure this problem?",
        check: rubric([
          { label: "revenue by item", any: ["revenue", "sales", "best seller", "bestseller", "popular", "price", "average order", "order value"] },
          { label: "costs and operations", any: ["cost", "ingredient", "waste", "prep", "speed", "wait", "throughput", "operation", "kitchen", "orders per hour"] },
          { label: "customers", any: ["customer", "demand", "preference", "regular", "survey", "feedback", "diner"] },
          { label: "risks", any: ["risk", "lose", "losing", "churn", "variety", "complain", "downside"] },
        ]),
      },
      {
        id: "food-truck-2",
        prompt:
          "Data: today the truck serves 40 orders an hour at an average of $10 an order, and lunch lasts 3 hours. With a 5-item menu it could serve 50 orders an hour, but the average order would drop to $9. What is the change in lunch revenue, new minus old, in dollars? End with your final number.",
        check: num(150, "$"),
      },
      {
        id: "food-truck-3",
        prompt: "What would you recommend the food truck owner do about the menu, and why?",
        check: recommendation(["150", "$1,350", "1,350", "1350", "revenue", "orders an hour", "orders per hour", "faster", "throughput", "wait"]),
      },
    ],
  },
];

/** Made-up accounting and valuation questions. Numeric ones carry all their data in the prompt. */
export const FINANCE_BANK: ScriptedQuestion[] = [
  {
    id: "fin-three-statements",
    prompt: "Walk me through the three financial statements and how they link together.",
    check: rubric([
      { label: "income statement", any: ["income statement", "p&l", "profit and loss", "profit & loss"] },
      { label: "balance sheet", any: ["balance sheet", "assets", "liabilit"] },
      { label: "cash flow statement", any: ["cash flow statement", "statement of cash flows", "cash flow"] },
      { label: "how they link", any: ["net income flows", "net income goes", "starts with net income", "retained earnings", "ending cash", "cash balance", "flows into", "flows to"] },
    ]),
  },
  {
    id: "fin-depreciation",
    prompt: "Depreciation goes up by $10 and the tax rate is 25%. Walk me through the effect on the three statements.",
    check: rubric([
      { label: "net income falls by 7.5", any: ["7.5", "7.50"] },
      { label: "cash goes up by 2.5", any: ["2.5", "2.50", "add back", "added back", "non-cash", "non cash"] },
      { label: "balance sheet balances", any: ["pp&e", "ppe", "property", "fixed asset", "retained earnings", "balances"] },
    ]),
  },
  {
    id: "fin-ev-vs-equity",
    prompt: "What is the difference between enterprise value and equity value?",
    check: rubric([
      { label: "enterprise value covers all investors", any: ["all investors", "whole business", "entire business", "debt and equity", "all capital", "core operations", "operating business", "whole company", "entire company"] },
      { label: "equity value is for shareholders", any: ["shareholder", "stockholder", "equity holder", "owners", "market cap"] },
      { label: "the bridge: debt and cash", any: ["net debt", "minus cash", "less cash", "subtract cash", "plus debt", "add debt", "debt minus cash", "debt less cash"] },
    ]),
  },
  {
    id: "fin-dcf",
    prompt: "Walk me through a discounted cash flow (DCF) valuation.",
    check: rubric([
      { label: "project free cash flows", any: ["free cash flow", "fcf", "project", "forecast", "cash flows"] },
      { label: "discount rate", any: ["discount rate", "wacc", "cost of capital"] },
      { label: "terminal value", any: ["terminal", "exit multiple", "perpetuity", "gordon"] },
      { label: "present value to enterprise value", any: ["present value", "pv", "discount back", "sum of", "sum up", "add up", "enterprise value"] },
    ]),
  },
  {
    id: "fin-wacc-concept",
    prompt: "What is WACC, and why is it used?",
    check: rubric([
      { label: "weighted mix of capital", any: ["weighted", "weight", "mix", "proportion", "blend"] },
      { label: "cost of equity", any: ["cost of equity", "capm", "beta", "required return"] },
      { label: "after-tax cost of debt", any: ["cost of debt", "after-tax", "after tax", "tax shield", "interest"] },
      { label: "used as a discount rate", any: ["discount", "dcf", "hurdle", "present value"] },
    ]),
  },
  {
    id: "fin-working-capital",
    prompt: "What is working capital, and why does an increase in it reduce cash flow?",
    check: rubric([
      { label: "definition", any: ["current assets", "current liabilit"] },
      { label: "examples", any: ["receivable", "inventory", "payable", "a/r", "a/p"] },
      { label: "cash is tied up", any: ["tied up", "uses cash", "use of cash", "less cash", "reduces cash", "not collected", "not yet collected", "haven't collected", "cash out", "spent"] },
    ]),
  },
  {
    id: "fin-valuation-methods",
    prompt: "What are the three common ways to value a company?",
    check: rubric([
      { label: "DCF", any: ["dcf", "discounted cash flow", "intrinsic"] },
      { label: "comparable companies", any: ["comparable", "comps", "trading multiple", "peer"] },
      { label: "precedent transactions", any: ["precedent", "transaction", "acquisition", "m&a", "past deals"] },
    ]),
  },
  {
    id: "fin-ev-math",
    prompt:
      "A small company has an equity value of $800,000, debt of $300,000 and cash of $100,000, with no preferred stock or minority interest. What is its enterprise value? End with your final number.",
    check: num(1_000_000, "$", 1),
  },
  {
    id: "fin-wacc-math",
    prompt:
      "A company is funded 60% by equity and 40% by debt. Its cost of equity is 10%, its pre-tax cost of debt is 5%, and its tax rate is 25%. What is its WACC, in percent? End with your final number.",
    check: num(7.5, "%", 0.05),
  },
  {
    id: "fin-growth-math",
    prompt: "A company has revenue of $200,000 this year. If revenue grows 10% a year, what will it be after 2 years? End with your final number.",
    check: num(242_000, "$", 1),
  },
  {
    id: "fin-margin-math",
    prompt:
      "A company has $400,000 of revenue, $240,000 of cost of goods sold and $60,000 of operating expenses. What is its operating margin, in percent? End with your final number.",
    check: num(25, "%", 0.05),
  },
  {
    id: "fin-multiple-math",
    prompt:
      "Similar companies trade at 8 times EBITDA. A company has EBITDA of $250,000, debt of $500,000 and cash of $100,000. What is its implied equity value? End with your final number.",
    check: num(1_600_000, "$", 1),
  },
  {
    id: "fin-receivables-math",
    prompt:
      "During the year a company's accounts receivable rise by $30,000 and nothing else changes. By how many dollars does its cash flow from operations fall? End with your final number.",
    check: num(30_000, "$", 1),
  },
];

/** Same seed rule as interview.ts pick: non-finite -> 0, negative -> absolute value. */
const seedIndex = (seed: number) => (Number.isFinite(seed) ? Math.abs(Math.floor(seed)) : 0);

/** The local questions for a scripted round, in order. Other rounds: null. Deterministic. */
export function scriptFor(round: InterviewRound, seed: number): ScriptedQuestion[] | null {
  const n = seedIndex(seed);
  if (round === "case") return [...CASES[n % CASES.length].questions];
  if (round !== "finance") return null;
  const len = FINANCE_BANK.length;
  const step = 1 + (Math.floor(n / len) % (len - 1));
  const picked: number[] = [];
  let i = n % len;
  while (picked.length < Math.min(4, len)) {
    while (picked.includes(i)) i = (i + 1) % len;
    picked.push(i);
    i = (i + step) % len;
  }
  return picked.map((k) => FINANCE_BANK[k]);
}

const ALL = [...CASES.flatMap((c) => c.questions), ...FINANCE_BANK];

/** Exact prompt match across CASES and FINANCE_BANK. */
export function findQuestion(prompt: string): ScriptedQuestion | null {
  return ALL.find((q) => q.prompt === prompt) ?? null;
}

/** The number the answer gives as its result, e.g. "$1,500" -> 1500, "1.5k" -> 1500, "12%" -> 12, "four thousand" -> 4000. None -> null.
 *  Picks by cue (final answer > "=" / "so" / "total" > "about" > last, skipping per-day counts); ranges count as one number at their
 *  midpoint; percentages read as the percent value. The parsing lives in numbers.ts, which also keeps each number's own unit. */
export function extractNumber(answer: string): number | null {
  return pickFinal(extractCandidates(answer ?? ""))?.value ?? null;
}

/** Extra wording per rubric keyword: any point listing the key also accepts these. Data only; keys are lowercase bank keywords. */
export const SYNONYMS: Record<string, string[]> = {
  revenue: ["top line", "turnover", "money coming in", "earnings"],
  sales: ["sold", "cups sold", "orders", "transactions", "purchases", "how many cups", "cups per day", "cups a day"],
  price: ["charge", "fee", "willingness to pay"],
  cost: ["overhead", "cogs", "fixed cost", "variable cost", "bills", "utilities", "beans", "milk"],
  customer: ["client", "consumer", "buyer", "visitor", "population", "audience", "segment", "drinker", "how many drink", "who buy", "how many people", "number of people", "market size"],
  student: ["undergrad", "faculty", "campus population", "enrollment", "enrolment", "classmate"],
  demand: ["willingness to pay", "elasticity", "sensitiv", "how many want"],
  compet: ["other shop", "other store", "other cart", "new cart", "new cafe", "market share", "dining hall", "vending", "substitute", "new entrant"],
  rider: ["commuter", "passenger", "cyclist"],
  invest: ["capex", "setup cost", "fit out", "renovat", "lease"],
  risk: ["uncertain", "worry", "what could go wrong", "backfire"],
  recommend: ["my advice", "they should", "we should", "the owner should", "the board should"],
  test: ["experiment", "a/b"],
  "flows into": ["feeds into", "links to", "carries over", "carry over"],
};

/** Light stemmer: "students" -> "student", "drinks" -> "drink", "pricing"/"price"/"priced" -> "pric", "companies" -> "company". */
function stem(w: string): string {
  let s = w;
  const undouble = (x: string) => (/([^aeiousl])\1$/.test(x) ? x.slice(0, -1) : x); // "running" -> "run"
  if (s.length > 4 && s.endsWith("ies")) s = `${s.slice(0, -3)}y`;
  else if (s.length > 5 && s.endsWith("ing")) s = undouble(s.slice(0, -3));
  else if (s.length > 5 && s.endsWith("ed")) s = undouble(s.slice(0, -2));
  else if (s.length > 3 && s.endsWith("s") && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1);
  if (s.length > 3 && s.endsWith("e")) s = s.slice(0, -1);
  return s;
}
const stemAll = (s: string) => s.replace(/[a-z]+/g, stem);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Keyword match that starts at a word (so "cost" matches "costs" but "ad" doesn't match "had"). */
const mentions = (text: string, keyword: string) => new RegExp(`(^|[^a-z0-9])${escapeRe(keyword)}`).test(text);
/** Whole-word match on stems (so "pricing" ~ "price", but the stem "sal" of "sales" never matches "salary"). */
const mentionsStem = (stemmed: string, keyword: string) => new RegExp(`(^|[^a-z0-9])${escapeRe(stemAll(keyword))}(?![a-z0-9])`).test(stemmed);

/** A point's keywords plus their synonyms, lowercased. */
const keywordsFor = (any: string[]) => {
  const base = any.map((k) => k.toLowerCase());
  return [...base, ...base.flatMap((k) => SYNONYMS[k] ?? [])];
};

export function checkAnswer(check: AnswerCheck, answer: string): CheckResult {
  if (check.kind === "number") {
    const { expected, tolerance, unit } = check;
    const cand = pickFinal(extractCandidates(answer ?? ""), unit);
    if (!cand) return { kind: "number", found: null, expected, correct: false, unit };
    const u = checkUnit(cand, unit, expected);
    const found = u.value;
    const read = found === null ? undefined : formatInUnit(found, u.unit);
    if (!u.ok || found === null) {
      // The user's number stays in the user's unit; it is never relabelled with the question's.
      return { kind: "number", found, expected, correct: false, unit, foundUnit: u.unit, unitMismatch: u.mismatch, message: u.msg, read };
    }
    const notes = u.note ? [u.note] : [];
    let correct = Math.abs(found - expected) <= tolerance + 1e-9;
    if (u.range) {
      const [lo, hi] = u.range;
      const inside = expected >= lo - 1e-9 && expected <= hi + 1e-9;
      if (inside && hi - lo <= 2 * tolerance + 1e-9) {
        correct = true;
        notes.push(`Your range ${formatInUnit(lo, u.unit)} to ${formatInUnit(hi, u.unit)} includes the expected value`);
      } else {
        notes.push(`We used the midpoint of your range (${formatInUnit(lo, u.unit)} to ${formatInUnit(hi, u.unit)})`);
      }
    }
    return {
      kind: "number",
      found,
      expected,
      correct,
      unit,
      // Only when the user's unit differs from the question's; otherwise the plain shape is enough.
      ...(u.unit !== unit && { foundUnit: u.unit, read }),
      ...(u.range && { range: u.range }),
      ...(notes.length && { note: notes.join(". ") }),
    };
  }
  const text = (answer ?? "").toLowerCase().replace(/[‘’]/g, "'");
  const stemmed = stemAll(text);
  const covered: string[] = [];
  const missed: string[] = [];
  for (const p of check.points) {
    const hit = keywordsFor(p.any).some((k) => mentions(text, k) || mentionsStem(stemmed, k));
    (hit ? covered : missed).push(p.label);
  }
  return { kind: "rubric", covered, missed };
}

/** The code check for a turn whose question is a scripted one; anything else -> null. */
export function checkTurn(turn: InterviewTurn): CheckResult | null {
  const check = findQuestion(turn.question)?.check;
  return check ? checkAnswer(check, turn.answer) : null;
}

const show = (n: number, unit: "$" | "%" | "") => `${n}${unit === "%" ? "%" : ""}`;
const list = (xs: string[]) => (xs.length ? xs.join(", ") : "none");

/** One plain line for the AI prompt and the UI. */
export function describeCheck(r: CheckResult): string {
  if (r.kind === "rubric") return `Key points covered: ${list(r.covered)}; missed: ${list(r.missed)} (checked by code)`;
  if (r.found === null) return `No final number found; expected ${show(r.expected, r.unit)} (checked by code)`;
  const extra = [r.message, r.note].filter(Boolean).join(". ");
  return `Final number ${r.read ?? show(r.found, r.unit)} vs expected ${show(r.expected, r.unit)}: ${r.correct ? "correct" : "not quite"}${extra ? `; ${extra}` : ""} (checked by code)`;
}
