// Local, made-up question pools for the practice session (text rounds). No AI needed to start a session.
import { BEHAVIORAL_PROMPTS, DESIGN_PROMPTS, PORTFOLIO_FIRST } from "./interview";
import { LP_PROMPTS } from "./presets";
import { CASES } from "./scripted";
import type { UserLevel } from "../types";

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

const SKILLS = ["TypeScript", "JavaScript", "Python", "Java", "SQL", "React", "Node", "AWS", "Azure", "cloud", "API", "database", "testing", "debugging", "security", "analytics", "machine learning"];
function postingFocus(description?: string | null): string | null {
  if (!description) return null;
  const found = SKILLS.filter((skill) => new RegExp(`\\b${skill.replace(" ", "\\s+")}\\b`, "i").test(description));
  return found.length ? found.slice(0, 3).join(", ") : null;
}

/** Product-inferred practice prompt from the selected target; posting text is never evidence about the candidate. */
function targetPrompt(round: string, opts: { role?: string | null; description?: string | null; level?: UserLevel | null }): string | null {
  const role = opts.role?.trim().slice(0, 80);
  const focus = postingFocus(opts.description);
  if (!role && !focus) return null;
  const target = role ? `the ${role} role` : "the selected role";
  const asks = focus ? ` The posting mentions ${focus}; choose only one you have actually used.` : " Use only experience you actually have.";
  const advanced = opts.level === "senior" || opts.level === "grad" || opts.level === "new_grad";
  const depth = advanced ? " Include constraints, alternatives and how you would verify the decision." : " Keep the scope small and explain one decision clearly.";
  if (round === "screen") return `Why are you interested in ${target}, and which requirement can you support with a specific example?${asks}`;
  if (round === "behavioral") return `Tell me about a time you did work relevant to ${target}. What did you do yourself, and what changed?${asks}${depth}`;
  if (round === "design") return `For ${target}, design a small service you could reasonably own. State requirements, data flow, failure modes and one trade-off.${focus ? ` Connect it to one posting area: ${focus}.` : ""}${depth}`;
  if (round === "portfolio") return `Choose one real project most relevant to ${target}. Explain your role, one decision, how you checked the result, and what you would improve.${asks}${depth}`;
  return null;
}

/** All text questions for a round, in preference order (pick the first unused, or a random one). */
export function textPool(round: string, opts: { values: string[]; company?: string | null; role?: string | null; description?: string | null; level?: UserLevel | null; preset?: string | null }): { ordered: TextOption[]; shuffled: TextOption[] } {
  const asOpts = (xs: string[], source: string): TextOption[] => xs.map((text) => ({ text, source }));
  const targeted = targetPrompt(round, opts);
  if (round === "behavioral") {
    const ordered = [...(targeted ? [{ text: targeted, source: "selected target" }] : []), ...opts.values.map((v) => ({ text: valuePrompt(v, opts.company), source: "company value" }))];
    const rest = opts.preset === "amazon" ? [...asOpts(LP_PROMPTS.map((p) => p.prompt), "app"), ...asOpts(BEHAVIORAL_PROMPTS, "app")] : asOpts(BEHAVIORAL_PROMPTS, "app");
    return { ordered, shuffled: rest };
  }
  if (round === "screen") return { ordered: targeted ? [{ text: targeted, source: "selected target" }] : [], shuffled: asOpts(SCREEN_PROMPTS, "app") };
  if (round === "design") return { ordered: targeted ? [{ text: targeted, source: "selected target" }] : [], shuffled: asOpts(DESIGN_PROMPTS, "app") };
  if (round === "case") return { ordered: [], shuffled: asOpts(CASE_PROMPTS, "app") };
  if (round === "portfolio") return { ordered: targeted ? [{ text: targeted, source: "selected target" }] : asOpts([PORTFOLIO_PROMPTS[0]], "app"), shuffled: asOpts(PORTFOLIO_PROMPTS.slice(1), "app") };
  return { ordered: [], shuffled: [] };
}
