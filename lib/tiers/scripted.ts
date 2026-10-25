// Scripted interview rounds: case and finance (devpost/tier4-spec.md > Scripted rounds). Pure.
// Every case, question and answer key is made up. Number keys equal the arithmetic from their own prompt.
import { checkUnit, extractCandidates, formatInUnit, pickFinal } from "./numbers";
import type { AnswerCheck, CheckResult, InterviewTurn, ScriptedQuestion } from "./types";

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

const ALL = CASES.flatMap((c) => c.questions);

/** Exact prompt match across CASES. */
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
const SYNONYMS: Record<string, string[]> = {
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
