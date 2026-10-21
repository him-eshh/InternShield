// Role seniority vs the user's level and resume (spec.md > Scoring Engine > level.ts). Weak signal.
import type { Profile, UserLevel } from "../types";
import { firstMatch, snippetAround } from "./backstop";

const LEVEL_YEARS: Record<UserLevel, number> = {
  freshman: 0,
  sophomore: 0,
  junior: 1,
  senior: 1,
  grad: 2,
  new_grad: 1,
};

export const LEVEL_WORDS: Record<UserLevel, string> = {
  freshman: "first-year student",
  sophomore: "second-year student",
  junior: "third-year student",
  senior: "final-year student",
  grad: "grad student",
  new_grad: "new grad",
};

const SENIOR_ROLE = /\b(?:senior|sr\.?|staff|principal|lead|manager|director|head of|vice president|vp|architect)\b/i;
const INTERN_ROLE = /\b(?:intern|internship|co-?op|apprentice|trainee|student|entry[- ]level|junior|graduate)\b/i;
const YEARS_REQUIRED = [/\b(\d{1,2})\s*\+?\s*(?:or more\s+)?years?['’]?\s+(?:of\s+)?(?:\w+\s+){0,2}experience\b/gi];
const DATE_RANGE = /\b((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current|now)\b/gi;

/** Rough years of experience: sum of date ranges on the resume, capped. */
export function resumeYears(resume: string, now = new Date()): number {
  let total = 0;
  for (const m of resume.matchAll(DATE_RANGE)) {
    const from = Number(m[1]);
    const to = /^\d/.test(m[2]) ? Number(m[2]) : now.getFullYear();
    if (to >= from) total += to - from;
  }
  return Math.min(total, 40);
}

export function roleAboveLevel(
  role: { value: string; quote: string } | null,
  text: string,
  profile: Profile,
  resumeText: string,
): { quote: string; why: string } | null {
  const years = firstMatch(text, YEARS_REQUIRED);
  const requiredYears = years ? Number(/\d+/.exec(years.match)?.[0] ?? 0) : 0;
  const seniorRole = role !== null && SENIOR_ROLE.test(role.value) && !INTERN_ROLE.test(role.value);
  const need = Math.max(requiredYears, seniorRole ? 5 : 0);
  const have = Math.max(LEVEL_YEARS[profile.level], resumeYears(resumeText));
  if (need < 3 || need <= have + 1) return null;
  const quote = years ? snippetAround(text, years.index, years.index + years.match.length) : role!.quote;
  const ask = requiredYears >= 3 ? `It asks for ${requiredYears}+ years of experience` : "It's a senior role";
  return {
    quote,
    why: `${ask}, which is unusual to offer out of the blue to a ${LEVEL_WORDS[profile.level]}. This is a weak sign on its own.`,
  };
}
