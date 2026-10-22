// Quick questions (findings 02 > 3.2, 4.1). Asked only when an answer could change the level or switch on
// a critical flag; at most 3. "Not sure" never moves the score.
import { LEVEL_LABELS, type Answers, type Question, type QuestionId, type RiskLevel, type ScoreInput } from "../types";

const NOT_SURE = { value: "unknown", label: "Not sure" };

export const QUESTIONS: Record<QuestionId, Question> = {
  asked_to_do: {
    id: "asked_to_do",
    text: "Have they asked you to do any of these?",
    kind: "multi",
    options: [
      { value: "pay", label: "Pay or buy something" },
      { value: "deposit_check", label: "Deposit a check" },
      { value: "crypto", label: "Send crypto or \"top up\"" },
      { value: "run_file", label: "Install or run a file" },
      { value: "share_data", label: "Share SSN or bank info" },
      { value: "none", label: "None yet" },
      NOT_SURE,
    ],
  },
  who_first: {
    id: "who_first",
    text: "Did you apply for this job first?",
    options: [{ value: "yes", label: "Yes, I applied" }, { value: "no", label: "No, they found me" }, NOT_SURE],
  },
  channel: {
    id: "channel",
    text: "Where did this message reach you?",
    options: [
      { value: "email", label: "Email" },
      { value: "linkedin", label: "LinkedIn" },
      { value: "handshake", label: "Handshake" },
      { value: "text_whatsapp", label: "Text or WhatsApp" },
      { value: "other", label: "Other" },
    ],
  },
  talked_live: {
    id: "talked_live",
    text: "Have you talked to them live?",
    options: [
      { value: "video", label: "Video call" },
      { value: "phone", label: "Phone call" },
      { value: "chat_only", label: "Only chat or text" },
      { value: "not_yet", label: "Not yet" },
    ],
  },
  signed_offer: { id: "signed_offer", text: "Have you signed an offer letter from them?", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
};

/** Tie-break order (findings 02 > 4.1). */
export const QUESTION_ORDER: QuestionId[] = ["asked_to_do", "who_first", "channel", "talked_live", "signed_offer"];
const MAX_QUESTIONS = 3;

/** Couldn't-check line for a relevant question that has no answer (or "Not sure"). */
export const QUESTION_GAPS: Record<QuestionId, { check: string; reason: string }> = {
  asked_to_do: { check: "What they've asked you to do", reason: "We don't know yet if they've asked you to pay, deposit, install, or share anything." },
  who_first: { check: "Who reached out first", reason: "We don't know if you applied first or they found you." },
  channel: { check: "Where the message came from", reason: "We don't know where this message reached you." },
  talked_live: { check: "Whether you've talked live", reason: "We don't know if you've talked to them on a call." },
  signed_offer: { check: "Whether you've signed an offer", reason: "We don't know if you've signed an offer letter yet." },
};

export type Relevance = Record<QuestionId, boolean>;

/** The answers to try for a question: every real option, one at a time ("Not sure" and "None yet" never move anything). */
function tries(q: Question): Answers[QuestionId][] {
  const real = q.options.map((o) => o.value).filter((v) => v !== "unknown" && v !== "none");
  return (q.kind === "multi" ? real.map((v) => [v]) : real) as Answers[QuestionId][];
}

/**
 * Couldn't-check lines for questions: the ones being asked now, plus relevant ones answered
 * "Not sure". Questions that wouldn't change anything stay out, so they don't add noise.
 */
export function questionGaps(relevant: Relevance, answers: Answers, asked: Question[]): { check: string; reason: string }[] {
  return QUESTION_ORDER.filter((id) => relevant[id] && (asked.some((q) => q.id === id) || answers[id] === "unknown")).map(
    (id) => QUESTION_GAPS[id],
  );
}

export interface Outcome {
  level: RiskLevel;
  critical: boolean;
}

/**
 * Questions to show: relevant, unanswered, and worth asking. Value = how many answers flip the level,
 * plus 1 when an answer can switch on a critical flag (findings 02 > 3.2). Top 3, ties in QUESTION_ORDER.
 * `outcomeOf` must not itself pick questions.
 */
export function pickQuestions(input: ScoreInput, relevant: Relevance, outcomeOf: (i: ScoreInput) => Outcome): Question[] {
  const now = outcomeOf(input);
  const scored = QUESTION_ORDER.filter((id) => relevant[id] && input.answers[id] === undefined).map((id) => {
    const q = QUESTIONS[id];
    const results = tries(q).map((a) => outcomeOf({ ...input, answers: { ...input.answers, [id]: a } }));
    const flips = results.filter((r) => r.level !== now.level).length;
    const critical = !now.critical && results.some((r) => r.critical);
    return { q: { ...q, couldChange: { level: flips > 0, critical } }, value: flips + (critical ? 1 : 0), levels: results.map((r) => r.level) };
  });
  const top = scored.filter((s) => s.value > 0).sort((a, b) => b.value - a.value).slice(0, MAX_QUESTIONS);
  return QUESTION_ORDER.flatMap((id) => top.filter((s) => s.q.id === id).map((s) => s.q));
}

const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

/** "Could change to <level> depending on N answers", for the level furthest from now that answers can reach. */
export function questionHint(input: ScoreInput, asked: Question[], outcomeOf: (i: ScoreInput) => Outcome): string | undefined {
  const now = outcomeOf(input).level;
  const reach = asked.map((q) => new Set(tries(q).map((a) => outcomeOf({ ...input, answers: { ...input.answers, [q.id]: a } }).level)));
  const targets = [...new Set(reach.flatMap((s) => [...s]))].filter((l) => l !== now);
  if (targets.length === 0) return undefined;
  const target = targets.sort((a, b) => Math.abs(RANK[b] - RANK[now]) - Math.abs(RANK[a] - RANK[now]))[0];
  const n = reach.filter((s) => s.has(target)).length;
  return `Could change to "${LEVEL_LABELS[target]}" depending on ${n === 1 ? "1 answer" : `${n} answers`}`;
}
