// Field-specific scam patterns (prd.md > Risk Scoring > Field-specific patterns).
import type { Field, Source } from "../types";
import { firstMatch, snippetAround } from "./backstop";

interface FieldPattern {
  label: string;
  why: string;
  fields: Field[] | "any";
  onlySource?: Source; // only when the message came this way

  re: RegExp[];
}

const FIELD_PATTERNS: FieldPattern[] = [
  {
    label: "a fake coding test",
    why: "Fake coding tests that send you a repo or zip to run are a common way to put malware on students' computers.",
    fields: ["tech"],
    re: [
      /\b(?:coding|technical|programming)\s+(?:test|challenge|assessment|task)\b[^.!?\n]{0,80}\b(?:github|gitlab|bitbucket|zip|repo(?:sitory)?|download|clone)\b/gi,
      /\b(?:install|download|update)\w*\b[^.!?\n]{0,30}\bdrivers?\b/gi,
    ],
  },
  {
    label: "a fake campus research job",
    why: "Remote, weekly-paid study or research assistant jobs \"from a professor\" are a common campus scam that ends with a fake check.",
    fields: "any",
    re: [
      /\b(?:remote(?:ly)?|from home)\b[^.!?\n]{0,60}\b(?:study|research|lab)\s+(?:research\s+)?assistants?\b|\b(?:study|research|lab)\s+(?:research\s+)?assistants?\b[^.!?\n]{0,60}\b(?:remote(?:ly)?|from home)\b/gi,
    ],
  },
  {
    label: "a task or optimization job",
    why: "Jobs paying you to rate, boost, or \"optimize\" apps and products are a known task scam.",
    fields: "any",
    re: [
      /\b(?:optimi[sz]ation|boosting|rating)\s+(?:tasks?|jobs?|assignments?)\b/gi,
      /\b(?:product|app|hotel|movie|order)\s+reviews?\s+(?:tasks?|jobs?|assignments?)\b/gi,
      /\bcrypto(?:currency)?\s+(?:trading|mining|tasks?|jobs?)\b/gi,
    ],
  },
  {
    label: "a personal-assistant job",
    why: "Remote personal-assistant jobs are one of the most common job scams the FTC sees.",
    fields: "any",
    re: [/\bpersonal\s+assistants?\b/gi],
  },
  {
    label: "a caregiver job",
    why: "Caregiver and nanny jobs offered by message are often used in fake-check scams.",
    fields: "any",
    re: [/\b(?:caregivers?|care givers?|nanny|nannies|babysitters?)\b/gi],
  },
  {
    label: "a mystery-shopper job",
    why: "Mystery-shopper jobs offered by message are a long-running scam.",
    fields: "any",
    re: [/\b(?:mystery|secret)\s+shop(?:pers?|ping)\b/gi],
  },
  {
    label: "a reshipping job",
    why: "Package inspector and reshipping jobs use you to move stolen goods.",
    fields: "any",
    re: [/\b(?:reship\w*|package inspectors?|parcel inspectors?|package forwarders?)\b/gi],
  },
  {
    label: "an online assessor job",
    why: "Unexpected offers for online assessor or rater work are a common scam text.",
    fields: "any",
    re: [/\b(?:online|remote|search engine|ads?)\s+(?:assessors?|evaluators?|raters?)\b/gi],
  },
  {
    label: "a surprise remote-job text",
    why: "Unexpected texts offering a remote position are one of the most common job scams the FTC sees.",
    fields: "any",
    onlySource: "text_whatsapp",
    re: [/\bremote\s+(?:positions?|jobs?|opportunit(?:y|ies)|roles?|work)\b/gi],
  },
];

/** Task-scam vocabulary (research 01 > rule 6). Each entry is one term; 2+ different terms is the pattern. */
const TASK_TERMS: RegExp[] = [
  // like / subscribe / follow
  /\b(?:like|subscribe|follow)\s*(?:,|and|&|\/)\s*(?:like|subscribe|follow|share|comment)\b/gi,
  /\b(?:subscribe|follow)\s+(?:to\s+)?(?:\w+\s+){0,2}?(?:videos?|channels?|accounts?|pages?)\b/gi,
  // rate / review apps and products
  /\b(?:rate|rating|review|reviewing)\s+(?:\w+\s+){0,2}?(?:apps?|products?|hotels?|movies?|merchants?)\b/gi,
  // boosting and optimizing
  /\b(?:product|app|movie|ticket|hotel|order)\s+(?:boosting|optimi[sz]ation)\b/gi,
  /\b(?:boost|optimi[sz]e)\w*\s+(?:\w+\s+){0,1}?(?:products?|apps?|orders?|ratings?|rankings?|sales)\b/gi,
  // sets of tasks
  /\bsets?\s+of\s+\d+\s+tasks?\b/gi,
  // 20+ tasks: "complete 3 tasks this week" is normal onboarding.
  /\b(?:complete|finish|do)\s+(?:[2-9]\d|\d{3,})\s+tasks?\b/gi,
  /\b\d+\s+tasks?\s+(?:a|per|each|every)\s+day\b/gi,
  // commission per task
  /\bcommissions?\s+(?:per|for each|for every|on each)\s+(?:task|order|job)\b/gi,
  /\b(?:earn|get)\s+(?:a\s+)?commissions?\b[^.!?\n]{0,40}\btasks?\b/gi,
  // coach / mentor groups: a "personal coach", or a mentor next to task/payout talk ("your mentor" alone is a normal internship line)
  /\b(?:your|our)\s+personal\s+(?:coach|mentor|trainer)\b/gi,
  /\b(?:your|our)\s+(?:coach|mentor|trainer)\b[^.!?\n]{0,50}\b(?:tasks?|orders?|telegram|whatsapp|deposits?|commissions?|withdraw\w*)\b/gi,
];

/** How many different task-scam terms the message uses, with a real snippet around the first. */
export function taskVocab(text: string): { count: number; quote: string } | null {
  const used: [number, number][] = [];
  for (const re of TASK_TERMS) {
    const m = firstMatch(text, [re], true);
    if (!m) continue;
    const range: [number, number] = [m.index, m.index + m.match.length];
    // One phrase that fits two patterns ("like and subscribe to partner videos") counts once.
    if (used.some(([a, b]) => range[0] < b && a < range[1])) continue;
    used.push(range);
  }
  if (used.length < 2) return null;
  const first = used.reduce((a, b) => (b[0] < a[0] ? b : a));
  return { count: used.length, quote: snippetAround(text, first[0], first[1]) };
}

/** The first field pattern that applies. With no profile, every field's patterns apply. */
export function matchFieldPattern(
  text: string,
  field: Field | null,
  source: Source | null = null,
): { label: string; why: string; quote: string } | null {
  for (const p of FIELD_PATTERNS) {
    if (p.fields !== "any" && field !== null && !p.fields.includes(field)) continue;
    if (p.onlySource && p.onlySource !== source) continue;
    const m = firstMatch(text, p.re);
    if (m) return { label: p.label, why: p.why, quote: snippetAround(text, m.index, m.index + m.match.length) };
  }
  return null;
}
