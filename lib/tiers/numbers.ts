// Reads numbers out of free-text answers WITH their own unit ("$1.2 million" is dollars, "7.5%" is a percent),
// so a unit mismatch can be named instead of silently relabelled (Bug C). Pure: no network, no env.

export type NumUnit = "$" | "%" | "bps" | "x" | "";

interface Candidate {
  /** The matched text, trimmed. */
  text: string;
  /** Signed, scale applied ("$1.2 million" -> 1200000, "(1.2)" -> -1.2). A range holds its midpoint. */
  value: number;
  unit: NumUnit;
  /** 1, 1e3, 1e6, ... of the written scale word (k, million, bn). */
  scale: number;
  /** "7-8%", "between 3k and 5k": the two ends, low first. */
  range?: [number, number];
  /** Preceded by ~, ≈, about, approx, around, roughly. */
  approx: boolean;
  /** Start offset of the match in the (dash-folded) answer. */
  index: number;
  /** End offset (exclusive). */
  end: number;
  /** True for the one number the answer gives as its result by a cue phrase (final answer, =, so, comes to, about...). */
  cue: boolean;
  /** A count per day/hour/week ("133 cups a day"): usually a side note. */
  rate: boolean;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

const SCALE: Record<string, number> = {
  k: 1e3, thousand: 1e3, m: 1e6, mm: 1e6, mn: 1e6, mil: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9, tn: 1e12, trillion: 1e12,
};
const VULGAR: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75 };

const UNIT_SRC = "%|percent\\b|pct\\b|per\\s?cent\\b|bps\\b|bp\\b|basis\\s+points?\\b|dollars?\\b|usd\\b";

// A number not glued to a letter, digit or dot on its left (so "Q4" and the "20" in "10-20" stay positive), with an optional
// "(" or "-", currency, thousands commas or a European decimal ("7,5"), a vulgar fraction ("7½"), a scale word (a space
// before it is fine: "1.2 M"; shorthand like "b/c" or "m&a" is not a scale), a unit, and the closing ")" of "(1.2)".
const NUMBER_RE = new RegExp(
  "(?<![A-Za-z0-9.])(?<open>\\()?(?<neg>-)?(?<cur>[$€£])?" +
    "(?<whole>\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.(?<frac>\\d+)|,(?<dec>\\d{1,2})(?!\\d))?(?:\\s*(?<vulgar>[½¼¾]))?" +
    "(?:\\s*(?<scale>thousand|million|billion|trillion|mil|mm|mn|bn|tn|k|m|b)\\b(?![/&]))?" +
    `(?:\\s*(?<unit>${UNIT_SRC})|(?<x>x\\b))?(?:\\s*(?<close>\\)))?`,
  "gi",
);
const UNIT_AFTER_RE = new RegExp(`^\\s*(?:${UNIT_SRC})`, "i");

// Number words: "four thousand", "twelve thousand five hundred", "a million", "one hundred and fifty", "twenty-five".
const SMALL: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const BIG: Record<string, number> = { thousand: 1e3, million: 1e6, billion: 1e9 };
const WORDS = [...Object.keys(SMALL), "hundred", ...Object.keys(BIG)].join("|");
const A_SCALE = "(?:a\\s+(?=(?:hundred|thousand|million|billion)\\b))?"; // "a" only counts before a scale word
const WORD_RE = new RegExp(`\\b${A_SCALE}(?:${WORDS})\\b(?:(?:\\s+and\\s+|[\\s-]+)${A_SCALE}(?:${WORDS})\\b)*`, "gi");
const HALF_RE = /^\s+and\s+a\s+(half|quarter)\b/i;

/** A run of number words -> its value. A bare "one" (a pronoun as often as not, unless "one and a half") or a run starting with a bare scale word -> null. */
function parseWords(run: string, allowOne: boolean): number | null {
  const toks = run.toLowerCase().split(/[\s-]+/).filter((t) => t && t !== "and");
  if (!toks.length || toks[0] === "hundred" || BIG[toks[0]] !== undefined || (toks.length === 1 && toks[0] === "one" && !allowOne)) return null;
  let total = 0;
  let cur = 0;
  for (const t of toks) {
    if (t === "a") cur = 1;
    else if (t === "hundred") cur = (cur || 1) * 100;
    else if (BIG[t] !== undefined) {
      total += (cur || 1) * BIG[t];
      cur = 0;
    } else cur += SMALL[t] ?? 0;
  }
  return total + cur;
}

function unitOf(raw: string | undefined): NumUnit {
  const u = (raw ?? "").toLowerCase().replace(/\s+/g, " ");
  if (!u) return "";
  if (u === "%" || u === "percent" || u === "pct" || u === "per cent" || u === "percent") return "%";
  if (u === "bps" || u === "bp" || u.startsWith("basis")) return "bps";
  if (u.startsWith("dollar") || u === "usd") return "$";
  return "";
}

// Dash-like characters become "-" one for one, so offsets stay the same.
const fold = (s: string) => s.replace(/[−–—]/g, "-");

type Raw = {
  start: number;
  end: number;
  base: number;
  scale: number;
  neg: boolean;
  unit: NumUnit;
  range: [number, number] | null;
};

const RATE_RE = /^\s*(?:[a-z]+\s*)?(?:(?:per|a|an|each|every)\s+(?:day|hour|hr|minute|min|week|shift)\b|\/\s*(?:day|hr|hour|week|wk)\b|(?:daily|hourly|weekly)\b)/i;
const APPROX_RE = /(?:≈|~|\b(?:approx\w*|about|around|roughly|circa|almost|nearly))\.?\s*$/i;
const STRONG_CUE = /\b(?:final (?:answer|number|result)|my answer|answer)\b/gi;
// Group 1: result cues; group 2: hedge cues.
const CUE = /(=|\b(?:so|totals?|totaling|totalling|equals|comes to)\b)|([~≈]|\b(?:about|roughly|approximately|approx|around)\b)/gi;
const HEDGE_WORD = /[~≈]|\b(?:about|roughly|approximately|approx|around)\b/i;

function rawNumbers(text: string): Raw[] {
  const raw: Raw[] = [];
  for (const m of text.matchAll(NUMBER_RE)) {
    const g = m.groups ?? {};
    const at = m.index ?? 0;
    const open = !!g.open;
    const closed = !!g.close;
    const rich = !!(g.cur || g.frac || g.dec || g.scale || g.unit || g.x || g.vulgar || g.whole.includes(",") || g.whole.length > 2);
    // "(1.2)" is a negative; "(1)" in a list of points is not, unless it is the whole answer.
    const parenNeg = open && closed && (rich || m[0].trim() === text.trim());
    const base = Number(`${g.whole.replace(/,/g, "")}${g.frac ? `.${g.frac}` : g.dec ? `.${g.dec}` : ""}`) + (g.vulgar ? VULGAR[g.vulgar] : 0);
    const lead = open && !parenNeg ? 1 : 0;
    // A ")" we swallowed that does not close our "(" is not part of the number.
    const end = closed && !parenNeg ? at + m[0].lastIndexOf(")") : at + m[0].length;
    raw.push({
      start: at + lead,
      end,
      base,
      scale: SCALE[(g.scale ?? "").toLowerCase()] ?? 1,
      neg: !!g.neg || parenNeg,
      unit: g.cur ? "$" : g.x ? "x" : unitOf(g.unit),
      range: null,
    });
  }
  for (const m of text.matchAll(WORD_RE)) {
    const start = m.index ?? 0;
    let end = start + m[0].length;
    if (raw.some((d) => d.start < end && start < d.end)) continue; // "4 thousand": the digit match already has it
    const half = HALF_RE.exec(text.slice(end));
    const v = parseWords(m[0], !!half);
    if (v === null) continue;
    let base = v;
    if (half) {
      base += half[1].toLowerCase() === "half" ? 0.5 : 0.25;
      end += half[0].length;
    }
    const u = UNIT_AFTER_RE.exec(text.slice(end));
    if (u) end += u[0].length;
    raw.push({ start, end, base, scale: 1, neg: false, unit: unitOf(u?.[0].trim()), range: null });
  }
  raw.sort((a, b) => a.start - b.start);

  // Merge ranges ("3,000-5,000", "3-5k", "7-8%", "between 3k and 5k", "3k to 5k") into one entry at the midpoint.
  const out: Raw[] = [];
  const valueOf = (r: Raw) => round6(r.base * r.scale);
  for (const c of raw) {
    const prev = out[out.length - 1];
    if (prev) {
      const gap = text.slice(prev.end, c.start);
      const binaryMinus = c.neg && /^\s*$/.test(gap); // "1350 - 1200", "10%-20%": a minus between numbers is not a sign
      if (binaryMinus) c.neg = false;
      const before = text.slice(0, prev.start);
      const dash = binaryMinus || /^\s*-\s*$/.test(gap);
      const to = /^\s+to\s+$/i.test(gap) && !/\bfrom\s*$/i.test(before); // "from 3,600 to 4,000" is a change, not a range
      const and = /^\s+and\s+$/i.test(gap) && /\bbetween\s*$/i.test(before);
      const sameUnit = !prev.unit || !c.unit || prev.unit === c.unit;
      if (!prev.range && !prev.neg && !c.neg && sameUnit && (dash || to || and)) {
        const lo = prev.scale === 1 && c.scale > 1 ? round6(prev.base * c.scale) : valueOf(prev);
        const hi = valueOf(c);
        if (and || hi > lo) {
          // A dash or "to" with a smaller second number is subtraction or a change, not a range.
          Object.assign(prev, {
            end: c.end,
            scale: c.scale,
            unit: prev.unit || c.unit,
            range: [Math.min(lo, hi), Math.max(lo, hi)] as [number, number],
          });
          continue;
        }
      }
    }
    out.push(c);
  }
  return out;
}

/** Marks the single candidate the answer gives as its result by a cue phrase. Rule order:
 *   1. A number right after (<= 30 chars, same sentence) "final answer/number/result", "my answer", "answer". Last such cue wins.
 *   2. Otherwise right after a result cue: "=", "so", "total", "equals", "comes to". May be a per-day count unless a hedge word sits between.
 *   3. Otherwise right after a hedge cue: "about", "roughly", "approximately", "around", "~", "≈". Never a per-day count. */
function markCue(text: string, nums: Candidate[]): void {
  const after = (cueEnd: number, allowRate: boolean, maxGap = 30): Candidate | null => {
    const n = nums.find((x) => x.index >= cueEnd);
    if (!n) return null;
    const between = text.slice(cueEnd, n.index);
    if (between.length > maxGap || /[!?\n]|\.(?:\s|$)/.test(between)) return null;
    if (n.rate && (!allowRate || HEDGE_WORD.test(between))) return null;
    return n;
  };
  let pick: Candidate | null = null;
  for (const m of text.matchAll(STRONG_CUE)) pick = after((m.index ?? 0) + m[0].length, true) ?? pick;
  if (!pick) {
    // "so"/"total" are weak cues: only a number right after them ("so 4,000"), not "so my first guess was 4,000".
    for (const m of text.matchAll(CUE)) if (m[1]) pick = after((m.index ?? 0) + m[0].length, true, /^[=]|equals|comes to/i.test(m[1]) ? 30 : 16) ?? pick;
  }
  if (!pick) for (const m of text.matchAll(CUE)) if (m[2]) pick = after((m.index ?? 0) + m[0].length, false) ?? pick;
  if (pick) pick.cue = true;
}

/** Every number in the answer, in order, each with its own unit. Offsets (`index`, `end`) refer to the answer with dashes folded to "-" (same length). */
export function extractCandidates(input: string): Candidate[] {
  const text = fold(input ?? "");
  const cands: Candidate[] = rawNumbers(text).map((r) => {
    const sign = r.neg ? -1 : 1;
    const value = r.range ? round6((r.range[0] + r.range[1]) / 2) : round6(r.base * r.scale);
    return {
      text: text.slice(r.start, r.end).trim(),
      value: value === 0 ? 0 : sign * value,
      unit: r.unit,
      scale: r.scale,
      ...(r.range && { range: r.range }),
      approx: APPROX_RE.test(text.slice(Math.max(0, r.start - 14), r.start)),
      index: r.start,
      end: r.end,
      cue: false,
      rate: RATE_RE.test(text.slice(r.end)),
    };
  });
  markCue(text, cands);
  return cands;
}

/** The answer's final number: the cued one; else the last (non-per-day) one in the expected unit, then a bare one; else the last. */
export function pickFinal(cands: Candidate[], expectedUnit: NumUnit = ""): Candidate | null {
  if (!cands.length) return null;
  const cued = cands.find((c) => c.cue);
  if (cued) return cued;
  const pool = cands.some((c) => !c.rate) ? cands.filter((c) => !c.rate) : cands;
  const last = (xs: Candidate[]) => xs[xs.length - 1];
  if (expectedUnit) {
    const exact = last(pool.filter((c) => c.unit === expectedUnit));
    if (exact) return exact;
    const bare = last(pool.filter((c) => c.unit === ""));
    if (bare) return bare;
  }
  return last(pool);
}

const plain = (n: number) => String(round6(n));
const NAME: Record<NumUnit, string> = { $: "a dollar amount", "%": "a percent", bps: "a basis-point figure", x: "a multiple", "": "a plain number" };

/** The name of a unit for messages: "a percent", "a dollar amount". */
const unitName = (u: NumUnit) => NAME[u];

interface UnitCheck {
  ok: boolean;
  /** The number to grade, in `unit` (bps -> percent and 0.075 -> 7.5% already applied). Null when there is no candidate. */
  value: number | null;
  /** The ends of a range, converted the same way. */
  range?: [number, number];
  /** The unit `value` is in. */
  unit: NumUnit;
  /** True when the answer gave an explicit unit the question does not ask for. */
  mismatch: boolean;
  /** "We read 0.075 as 7.5%". */
  note?: string;
  /** Why it is not graded as correct. */
  msg?: string;
}

/** Compares a candidate's own unit with the question's. `expectedValue` (optional) stops a question whose answer is under 1% from reading 0.5 as 50%. */
export function checkUnit(c: Candidate | null, expected: NumUnit, expectedValue?: number): UnitCheck {
  if (!c) return { ok: false, value: null, unit: "", mismatch: false, msg: "We couldn’t find a number in your answer." };
  const base = { ok: true, value: c.value, unit: c.unit, mismatch: false, ...(c.range && { range: c.range }) };
  const conv = (f: (n: number) => number): Pick<UnitCheck, "value" | "range"> => ({
    value: round6(f(c.value)),
    ...(c.range && { range: [round6(f(c.range[0])), round6(f(c.range[1]))] as [number, number] }),
  });
  if (expected === "%" && c.unit === "" && c.value !== 0 && Math.abs(c.value) < 1 && (expectedValue === undefined || Math.abs(expectedValue) >= 1)) {
    const r = conv((n) => n * 100);
    return { ...base, ...r, unit: "%", note: `We read ${plain(c.value)} as ${plain(r.value ?? 0)}%` };
  }
  if (expected === "%" && c.unit === "bps") {
    const r = conv((n) => n / 100);
    return { ...base, ...r, unit: "%", note: `We read ${plain(c.value)} bps as ${plain(r.value ?? 0)}%` };
  }
  if (expected && c.unit && c.unit !== expected) {
    return { ...base, ok: false, mismatch: true, msg: `This question expects ${unitName(expected)}, but your answer looks like ${unitName(c.unit)}.` };
  }
  return base;
}

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** A number in its own unit: "$1,200,000", "7.5%", "12 bps", "7.5x", "-3,400". */
export function formatInUnit(value: number, unit: NumUnit): string {
  const v = value === 0 ? 0 : value;
  const s = nf.format(Math.abs(v));
  const sign = v < 0 ? "-" : "";
  if (unit === "$") return `${sign}$${s}`;
  if (unit === "%") return `${sign}${s}%`;
  if (unit === "bps") return `${sign}${s} bps`;
  if (unit === "x") return `${sign}${s}x`;
  return `${sign}${s}`;
}
