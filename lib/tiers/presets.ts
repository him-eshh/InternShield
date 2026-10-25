// Company-style practice presets (findings 04 sections 1a, 5, (c) #5-#6). Pure.
// Labels always say "-style": practice modeled on each company's own public prep page, never affiliated.
// Sources are only the official pages Research verified in 04 section 1a.
import type { InterviewRound } from "./types";

export type PresetId = "google" | "meta" | "amazon" | "mckinsey" | "goldman";

interface InterviewPreset {
  id: PresetId;
  label: string;
  rounds: InterviewRound[];
  /** Appended to the interviewer prompt. Public facts only. */
  style: string;
  source: { label: string; url: string };
}

export const PRESETS: InterviewPreset[] = [
  {
    id: "google",
    label: "Google-style intern loop",
    rounds: ["coding", "behavioral"],
    style: "Google-style: no brainteasers; behavioral questions probe comfort with ambiguity, bias to action and collaboration.",
    source: { label: "Google: How we hire", url: "https://www.google.com/about/careers/applications/how-we-hire/" },
  },
  {
    id: "meta",
    label: "Meta-style coding",
    rounds: ["coding", "debugging", "behavioral"],
    style: "Meta-style: the candidate should talk through the approach, start simple then improve, and catch their own bugs.",
    source: { label: "Meta: SWE onsite prep", url: "https://www.metacareers.com/swe-prep-onsite/" },
  },
  {
    id: "amazon",
    label: "Amazon-style (Leadership Principles)",
    rounds: ["behavioral", "coding"],
    style:
      "Amazon-style: behavioral questions map to the Leadership Principles. Drill down: ask what exactly they did themselves, what data they used, or what they would do differently.",
    source: { label: "Amazon: Leadership Principles", url: "https://www.amazon.jobs/content/en/our-workplace/leadership-principles" },
  },
  {
    id: "mckinsey",
    label: "McKinsey-style case",
    rounds: ["case", "behavioral"],
    style: "McKinsey-style: personal-experience questions drill into the candidate's own role; they should lead with reasoning, not a rehearsed story.",
    source: { label: "McKinsey: Interviewing", url: "https://www.mckinsey.com/careers/interviewing" },
  },
  {
    id: "goldman",
    label: "Goldman-style finance",
    rounds: ["screen", "behavioral"],
    style: "Goldman-style: short, direct questions like a first-round video interview.",
    source: { label: "Goldman Sachs: Prepare", url: "https://www.goldmansachs.com/careers/students/prepare" },
  },
];

export const getPreset = (id: unknown): InterviewPreset | null => PRESETS.find((p) => p.id === id) ?? null;

/** Made-up Amazon-style behavioral prompts, each tagged with 1-2 official Leadership Principles. */
export const LP_PROMPTS: { prompt: string; lps: string[] }[] = [
  { prompt: "Tell me about a time you took on something outside your job or class because nobody else would.", lps: ["Ownership"] },
  { prompt: "Tell me about a time you used data to find the real cause of a problem.", lps: ["Dive Deep"] },
  { prompt: "Describe a time you disagreed with a teammate's plan. What did you do, and what happened?", lps: ["Have Backbone; Disagree and Commit"] },
  { prompt: "Tell me about a time you had to act fast without all the information you wanted.", lps: ["Bias for Action"] },
  { prompt: "Describe a time you went out of your way for someone who used something you built or ran.", lps: ["Customer Obsession"] },
  { prompt: "Tell me about a time you hit a hard deadline. What did you deliver, and how did you measure it?", lps: ["Deliver Results"] },
  { prompt: "Tell me about a time you found a simpler way to do something your team did every week.", lps: ["Invent and Simplify", "Frugality"] },
  { prompt: "Describe a time you taught yourself something new to finish a task.", lps: ["Learn and Be Curious"] },
];

/** LP tags of the bank questions asked in a session, in order, no repeats. */
export function lpTags(questions: string[]): string[] {
  return [...new Set(questions.flatMap((q) => LP_PROMPTS.find((p) => p.prompt === q)?.lps ?? []))];
}
