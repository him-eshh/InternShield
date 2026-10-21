// Field-specific scam patterns (prd.md > Risk Scoring > Field-specific patterns).
import type { Field, Source } from "../types";
import { firstMatch, snippetAround } from "./backstop";

export interface FieldPattern {
  label: string;
  why: string;
  fields: Field[] | "any";
  onlySource?: Source; // only when the message came this way

  re: RegExp[];
}

export const FIELD_PATTERNS: FieldPattern[] = [
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
