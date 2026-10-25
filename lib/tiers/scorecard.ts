// v2 interview scorecard (findings 04 sections 0, 2b, (c) #1). Pure.
// Bands come from code-measured signals; the AI only adds quotes (already checked word for word by validateFeedback).
// Evidence-or-cap: an AI-judged axis without a quote is capped at "Developing".
import { lpTags } from "./presets";
import { checkTurn } from "./scripted";
import { QUESTIONS_PER_ROUND, type InterviewSession, type ScoreBand, type Scorecard } from "./types";

type Axis = Scorecard["axes"][number];
export const BANDS: ScoreBand[] = ["Strong", "Solid", "Developing", "Not yet"];

const DRILLS: Record<string, string> = {
  coding: "Do one more problem and get every hidden test to pass.",
  verification: "Run the examples and one edge case of your own before you submit.",
  problem: "Try the next problem with one hint or none.",
  communication: "Write your plan and its time complexity (like O(n)) before you code.",
  star: "Shape one answer as Situation, Task, Action, Result.",
  ownership: "Say what you did yourself: “I” for your own actions.",
  numbers: "End each story with a number: time saved, users, percent.",
  depth: "Give each answer 3–4 sentences with one concrete example.",
  complete: "Answer every question before you end.",
  math: "State your final number with its unit, like “$1.2 million”.",
  structure: "Lay out your framework first, then walk through it.",
  components: "Start with the core parts: client, API, data store.",
  connections: "Connect each part and label what flows between them.",
};

/** Band for a 0..1 ratio: >= hi Strong, >= mid Solid, >= lo Developing (lo 0 means any > 0). */
function ratioBand(r: number, hi = 1, mid = 0.75, lo = 0.4): ScoreBand {
  if (r >= hi) return "Strong";
  if (r >= mid) return "Solid";
  if (lo === 0 ? r > 0 : r >= lo) return "Developing";
  return "Not yet";
}
const worse = (a: ScoreBand, b: ScoreBand): ScoreBand => (BANDS.indexOf(a) >= BANDS.indexOf(b) ? a : b);
const words = (s: string) => (s.match(/[\p{L}\p{N}'’]+/gu) ?? []).length;
const HAS_NUMBER = /\d|%|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|billion|half|double|twice)\b/i;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function axis(id: string, label: string, band: ScoreBand, evidence: string[], byCode = true): Axis {
  return { id, label, band, evidence, byCode };
}
/** AI-judged axes need a quote; without one they top out at "Developing". */
function quoted(id: string, label: string, band: ScoreBand, quotes: string[], notes: string[]): Axis {
  const ev = [...quotes.map((q) => `“${q}”`), ...notes];
  return axis(id, label, quotes.length ? band : worse(band, "Developing"), quotes.length ? ev : [...ev, "Not enough evidence"], false);
}

function completeness(s: InterviewSession): Axis {
  const want = s.plannedQuestions ?? QUESTIONS_PER_ROUND[s.round];
  const done = s.turns.filter((t) => t.answer.trim()).length;
  return axis("complete", "Completeness", ratioBand(done / want, 1, 0.75, 0.5), [`${done} of ${want} questions answered`]);
}
function depth(s: InterviewSession): Axis {
  const n = s.turns.length ? s.turns.reduce((a, t) => a + words(t.answer), 0) / s.turns.length : 0;
  return axis("depth", "Depth", ratioBand(n, 60, 35, 15), [`About ${Math.round(n)} words per answer`]);
}
function numbers(s: InterviewSession): Axis {
  const n = s.turns.filter((t) => HAS_NUMBER.test(t.answer)).length;
  const total = Math.max(1, s.turns.length);
  return axis("numbers", "Specific results", ratioBand(n / total, 1, 0.5, 0), [`${n} of ${s.turns.length} answers include a number`]);
}

function techAxes(s: InterviewSession, quotes: string[]): Axis[] {
  const code = s.code;
  const ratio = code && code.total ? code.passed / code.total : 0;
  const runs = s.stats?.runsBeforeSubmit ?? 0;
  const hints = s.hints.length;
  const answer = s.turns[0]?.answer ?? "";
  const approach = answer.split("\n\nCode:\n")[0].trim();
  const n = words(approach);
  const complexity = /\bO\s*\(/.test(approach);

  const coding = axis("coding", "Coding", code ? ratioBand(ratio) : "Not yet", [
    code ? `${code.passed} of ${code.total} hidden tests passed` : "No code submitted",
  ]);
  const allPass = !!code && ratio === 1;
  const verification = axis(
    "verification",
    "Verification and testing",
    runs > 0 ? (allPass ? "Strong" : "Solid") : allPass ? "Developing" : "Not yet",
    [runs > 0 ? `Ran the examples ${plural(runs, "time")} before submitting` : "Submitted without running the examples"],
  );
  const timeNote =
    s.stats?.firstSubmitAt != null ? [`First submit after ${Math.max(1, Math.round((s.stats.firstSubmitAt - s.createdAt) / 60000))} min`] : [];
  const problem = axis(
    "problem",
    "Problem solving",
    ratio < 0.5 ? worse(ratioBand(1 - hints / 4, 1, 0.75, 0.5), "Developing") : ratioBand(1 - hints / 4, 1, 0.75, 0.5),
    [`${plural(hints, "hint")} used`, ...timeNote, ...(ratio < 0.5 ? ["Capped: under half the tests passed"] : [])],
  );
  const commBand: ScoreBand = n >= 25 && complexity ? "Strong" : n >= 25 || (n >= 8 && complexity) ? "Solid" : n > 0 ? "Developing" : "Not yet";
  const communication = quoted("communication", "Communication", commBand, quotes, [
    n ? `Approach: ${plural(n, "word")}` : "No approach written",
    ...(complexity ? ["Stated the time complexity"] : []),
  ]);
  return [communication, problem, coding, verification];
}

function checkedAxes(s: InterviewSession): Axis[] {
  const results = s.turns.map(checkTurn).filter((r) => r !== null);
  const nums = results.filter((r) => r.kind === "number");
  const covs = results.filter((r) => r.kind !== "number");
  const out: Axis[] = [];
  if (nums.length) {
    const ok = nums.filter((r) => r.correct).length;
    out.push(axis("math", s.round === "case" ? "Math" : "Accuracy", ratioBand(ok / nums.length, 1, 0.66, 0.33), [`${ok} of ${nums.length} numbers correct`]));
  }
  if (covs.length) {
    let hit = 0;
    let all = 0;
    for (const r of covs) {
      hit += r.covered.length;
      all += r.covered.length + r.missed.length;
    }
    out.push(
      axis("structure", s.round === "case" ? "Structure" : "Concepts", ratioBand(all ? hit / all : 0, 0.85, 0.6, 0.3), [`${hit} of ${all} key points spotted`]),
    );
  }
  return out;
}

function behavioralAxes(s: InterviewSession, quotes: string[]): Axis[] {
  const stars = (s.feedback?.items ?? []).map((i) => i.star).filter((x) => x !== null);
  const avg = stars.length ? stars.reduce((a, st) => a + Object.values(st).filter(Boolean).length, 0) / stars.length : 0;
  const text = s.turns.map((t) => t.answer).join(" ");
  const i = (text.match(/\bI\b|\b[Mm]y\b/g) ?? []).length;
  const we = (text.match(/\b(?:we|our|us)\b/gi) ?? []).length;
  const done = completeness(s);
  // Amazon-style: name the Leadership Principles the bank questions practiced.
  const lps = s.context.preset === "amazon" ? lpTags(s.turns.map((t) => t.question)) : [];
  if (lps.length) done.evidence.push(`Leadership Principles: ${lps.join(", ")}`);
  return [
    quoted("star", "Structure (STAR)", ratioBand(avg / 4, 1, 0.75, 0.5), quotes, [stars.length ? `About ${Math.round(avg)} of 4 STAR parts per answer` : "STAR not checked"]),
    axis("ownership", "Ownership", i + we ? ratioBand(i / (i + we), 0.6, 0.4, 0) : "Not yet", [`“I/my” ${plural(i, "time")}, “we/our” ${plural(we, "time")}`]),
    numbers(s),
    done,
  ];
}

function boardAxes(s: InterviewSession): Axis[] {
  const nodes = s.board?.n.length ?? 0;
  const edges = s.board?.e.length ?? 0;
  return [
    axis("components", "Components", ratioBand(nodes, 6, 4, 2), [`${plural(nodes, "part")} on the board`]),
    axis("connections", "Connections", nodes > 1 ? ratioBand(edges / (nodes - 1), 1, 0.5, 0) : "Not yet", [`${plural(edges, "connection")}`]),
    depth(s),
    completeness(s),
  ];
}

/** The scorecard for a finished session, or null when there is nothing to grade. */
export function buildScorecard(s: InterviewSession): Scorecard | null {
  if (!s.turns.length && !s.code) return null;
  const quotes = (s.feedback?.items ?? []).map((i) => i.quote).filter((q): q is string => !!q);
  let axes: Axis[];
  if (s.round === "coding" || s.round === "debugging") axes = techAxes(s, quotes);
  else if (s.round === "behavioral") axes = behavioralAxes(s, quotes);
  else if (s.round === "design" || s.round === "challenge") axes = boardAxes(s);
  else if (s.round === "case" || s.round === "finance") axes = [...checkedAxes(s), depth(s), completeness(s)];
  else axes = [numbers(s), depth(s), completeness(s)]; // screen, portfolio
  // Weakest axis (first on ties) picks the drill; all Strong -> no drill, the UI falls back to the AI's tip.
  const weakest = axes.reduce((w, a) => (BANDS.indexOf(a.band) > BANDS.indexOf(w.band) ? a : w), axes[0]);
  return { axes, ...(weakest.band !== "Strong" ? { nextDrill: DRILLS[weakest.id] } : {}) };
}

/** [start, end) of the quote inside the answer, ignoring spacing, case and curly quotes; null if not found. */
export function findQuote(answer: string, quote: string): [number, number] | null {
  const q = quote.trim();
  if (q.length < 3) return null;
  const src = q
    .split(/\s+/)
    .map((w) =>
      w
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/['‘’‚‛′]/g, "['‘’‚‛′]")
        .replace(/["“”„‟″]/g, '["“”„‟″]')
        .replace(/[-–—]/g, "[-–—]"),
    )
    .join("\\s+");
  const m = new RegExp(src, "i").exec(answer);
  return m ? [m.index, m.index + m[0].length] : null;
}
