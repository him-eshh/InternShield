// Local, made-up question pools for the practice session (text rounds). No AI needed to start a session.
import { BEHAVIORAL_PROMPTS, DESIGN_PROMPTS, PORTFOLIO_FIRST } from "./interview";
import { LP_PROMPTS } from "./presets";
import { CASES } from "./scripted";

const SCREEN_PROMPTS: string[] = [
  "Tell me a little about yourself and what you are looking for in your next role.",
  "Why are you interested in this role, and why now?",
  "What is a project you are proud of, in two or three sentences?",
  "What are you looking for in a manager and a team?",
  "What are your salary expectations and your start date? Say how you would answer a recruiter.",
  "What other roles or companies are you talking to, and how do you decide between offers?",
];

const PORTFOLIO_PROMPTS: string[] = [
  PORTFOLIO_FIRST,
  "Walk me through a time your design changed after feedback. What did you change, and what did it improve?",
  "Pick one decision in a project where you chose between two options. How did you decide?",
  "Tell me about a project that did not go well. What would you do differently?",
  "Show me how you worked with developers or other designers on one project. Where did you disagree?",
];

/** Opening question of each made-up case (the stem and the first thing to answer). */
const CASE_PROMPTS: string[] = CASES.map((c) => c.questions[0].prompt);

/** A STAR prompt tied to one company value (from cited official pages), phrased without claiming affiliation. */
function valuePrompt(value: string, company?: string | null): string {
  const v = value.replace(/[.\s]+$/, "").slice(0, 100);
  const who = company ? ` (a value ${company} lists publicly)` : "";
  return `Tell me about a time you showed "${v}"${who}. What was the situation, what did you do yourself, and what was the result?`;
}

interface TextOption {
  text: string;
  /** Short origin label for the recap. */
  source: string;
}

/** All text questions for a round, in preference order (pick the first unused, or a random one). */
export function textPool(round: string, opts: { values: string[]; company?: string | null; preset?: string | null }): { ordered: TextOption[]; shuffled: TextOption[] } {
  const asOpts = (xs: string[], source: string): TextOption[] => xs.map((text) => ({ text, source }));
  if (round === "behavioral") {
    const ordered = opts.values.map((v) => ({ text: valuePrompt(v, opts.company), source: "company value" }));
    const rest = opts.preset === "amazon" ? [...asOpts(LP_PROMPTS.map((p) => p.prompt), "app"), ...asOpts(BEHAVIORAL_PROMPTS, "app")] : asOpts(BEHAVIORAL_PROMPTS, "app");
    return { ordered, shuffled: rest };
  }
  if (round === "screen") return { ordered: [], shuffled: asOpts(SCREEN_PROMPTS, "app") };
  if (round === "design") return { ordered: [], shuffled: asOpts(DESIGN_PROMPTS, "app") };
  if (round === "case") return { ordered: [], shuffled: asOpts(CASE_PROMPTS, "app") };
  if (round === "portfolio") return { ordered: asOpts([PORTFOLIO_PROMPTS[0]], "app"), shuffled: asOpts(PORTFOLIO_PROMPTS.slice(1), "app") };
  return { ordered: [], shuffled: [] };
}
