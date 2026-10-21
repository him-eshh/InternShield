// Quick questions (spec.md > Data Model > Quick Questions).
// Asked only when the answer is unknown AND at least one answer would change the score.
import type { Answers, Question, QuestionId, ScoreInput } from "../types";

const UNKNOWN = { value: "unknown", label: "I don't know" };
const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, UNKNOWN];

export const QUESTIONS: Record<QuestionId, Question> = {
  outside_us: { id: "outside_us", text: "Is the employer based outside the US?", options: YES_NO },
  source: {
    id: "source",
    text: "Where did this message come from?",
    options: [
      { value: "company_site", label: "I applied on the company's website" },
      { value: "handshake", label: "Handshake" },
      { value: "linkedin", label: "LinkedIn" },
      { value: "email", label: "An email I wasn't expecting" },
      { value: "text_whatsapp", label: "A text or WhatsApp message" },
      UNKNOWN,
    ],
  },
  signed_offer: { id: "signed_offer", text: "Have you signed an offer letter?", options: YES_NO },
  had_interview: { id: "had_interview", text: "Have you had an interview with them?", options: YES_NO },
};

export const QUESTION_ORDER: QuestionId[] = ["source", "signed_offer", "had_interview", "outside_us"];

/** Couldn't-check line for a relevant question that has no answer (or "I don't know"). */
export const QUESTION_GAPS: Record<QuestionId, { check: string; reason: string }> = {
  outside_us: { check: "Where the employer is based", reason: "We couldn't tell if the employer is outside the US." },
  source: { check: "Where the message came from", reason: "We don't know where this message came from." },
  signed_offer: { check: "Whether you've signed an offer", reason: "We don't know if you've signed an offer letter yet." },
  had_interview: { check: "Whether you've had an interview", reason: "We don't know if you've had an interview with them." },
};

export type Relevance = Record<QuestionId, boolean>;

/**
 * Couldn't-check lines for questions: the ones being asked now, plus relevant ones answered
 * "I don't know". Questions that wouldn't change anything stay out, so they don't add noise.
 */
export function questionGaps(relevant: Relevance, answers: Answers, asked: Question[]): { check: string; reason: string }[] {
  return QUESTION_ORDER.filter((id) => relevant[id] && (asked.some((q) => q.id === id) || answers[id] === "unknown")).map(
    (id) => QUESTION_GAPS[id],
  );
}

/**
 * Questions to show: relevant, never answered (an "I don't know" counts as answered),
 * and at least one real answer moves the score. `scoreOf` must not itself pick questions.
 */
export function pickQuestions(input: ScoreInput, relevant: Relevance, scoreOf: (i: ScoreInput) => number): Question[] {
  const base = scoreOf(input);
  return QUESTION_ORDER.filter((id) => relevant[id] && input.answers[id] === undefined)
    .filter((id) =>
      QUESTIONS[id].options.some(
        (o) => o.value !== "unknown" && scoreOf({ ...input, answers: { ...input.answers, [id]: o.value } as Answers }) !== base,
      ),
    )
    .map((id) => QUESTIONS[id]);
}
