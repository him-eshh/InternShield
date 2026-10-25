// Practice interview content and feedback checking: made-up first questions per round, and the shape/quote check
// every model feedback reply goes through. Pure. All prompts are made up.
import { isRec } from "../types";
import { quoteIsReal } from "../quotes";
import type { AnswerFeedback, InterviewFeedback, InterviewRound, InterviewTurn, StarCheck } from "./types";

const MAX_STRENGTH = 300;
const MAX_SUMMARY = 400;

/** Made-up STAR prompts for the Behavioral round's first question. */
export const BEHAVIORAL_PROMPTS: string[] = [
  "Tell me about a time you worked on a team project where the group disagreed. What happened, and what did you do?",
  "Describe a time you had a tight deadline. How did you plan your work, and how did it turn out?",
  "Tell me about a mistake you made at school, work or in a club. How did you handle it?",
  "Give me an example of a time you took the lead on something nobody asked you to do.",
  "Tell me about a time you had to learn something new quickly to get a task done.",
  "Describe a time you got critical feedback. What did you change afterwards?",
];

/** Made-up prompts for the System design round's first question. */
export const DESIGN_PROMPTS: string[] = [
  "Design a simple link shortener for a student club: people paste a long link and get a short one that redirects. Describe the main parts and walk me through how a click is handled.",
  "Design a campus study-room booking app where students reserve a room for an hour. Describe the main parts and explain how you stop two people booking the same slot.",
  "Design a photo-sharing feed for a small hobby community. Explain where photos are stored and how the feed is loaded quickly.",
  "Design a notification service that emails students when a class assignment is posted. Describe the parts and explain what happens if the email provider is slow.",
];

/** Local first question for the Portfolio walkthrough round. Made up. */
export const PORTFOLIO_FIRST =
  "Pick one project you're proud of and walk me through it: what problem it solved, what your role was, how you got from first idea to final design, and how it turned out.";

// ---------- Feedback validation ----------


function cleanStar(v: unknown): StarCheck | null {
  if (!isRec(v)) return null;
  return { situation: v.situation === true, task: v.task === true, action: v.action === true, result: v.result === true };
}

/** Shape-checks model feedback against the turns it is about. Null when no item survives. */
export function validateFeedback(raw: unknown, turns: InterviewTurn[], round: InterviewRound): InterviewFeedback | null {
  if (!isRec(raw) || !Array.isArray(raw.items)) return null;
  const seen = new Set<number>();
  const items: AnswerFeedback[] = [];
  for (const it of raw.items) {
    if (!isRec(it)) continue;
    const index = it.index;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= turns.length || seen.has(index)) continue;
    if (typeof it.strength !== "string" || typeof it.improve !== "string") continue;
    const strength = it.strength.trim().slice(0, MAX_STRENGTH);
    const improve = it.improve.trim().slice(0, MAX_STRENGTH);
    if (!strength && !improve) continue;
    seen.add(index);
    const quote = typeof it.quote === "string" && quoteIsReal(it.quote, turns[index].answer) ? it.quote.trim() : null;
    items.push({ index, strength, improve, quote, star: round === "behavioral" ? cleanStar(it.star) : null });
  }
  if (items.length === 0) return null;
  items.sort((a, b) => a.index - b.index);
  const summary = typeof raw.summary === "string" ? raw.summary.trim().slice(0, MAX_SUMMARY) : "";
  return { summary, items };
}
