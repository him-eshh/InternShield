"use client";
import type { Answers, Question, QuestionId } from "@/lib/types";
import { InfoIcon } from "../icons";
import { pillOff, pillOn } from "../ui";

interface Props {
  questions: Question[];
  answers: Answers;
  /** One line from describeChange(), or null. */
  change: string | null;
  /** The question answered most recently; the confirmation shows under it. */
  lastId?: QuestionId | null;
  onAnswer: (id: QuestionId, value: string) => void;
}

export function confirmation(change: string | null): string {
  return change ? `Thanks. Score updated: ${change}` : "Thanks. The score didn't change.";
}

export default function QuickQuestions({ questions, answers, change, lastId = null, onAnswer }: Props) {
  if (questions.length === 0) return null;
  const message = lastId && answers[lastId] !== undefined ? confirmation(change) : "";
  // Prefix the chosen answer so two answers with the same result are both announced.
  const picked = questions.find((q) => q.id === lastId)?.options.find((o) => o.value === answers[lastId ?? "source"])?.label;
  const spoken = message && picked ? `${picked}. ${message}` : message;
  return (
    <section aria-labelledby="qq-title" className="rounded-[18px] border border-border bg-bg-soft p-6">
      <h3 id="qq-title" className="flex items-center gap-2 text-[19px] font-semibold">
        <span className="text-accent"><InfoIcon size={20} /></span>
        A few quick questions
      </h3>
      <div className="mt-5 space-y-6">
        {questions.map((q) => (
          <fieldset key={q.id}>
            <legend className="text-[17px]">{q.text}</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {q.options.map((o) => {
                const on = answers[q.id] === o.value;
                return (
                  <button key={o.value} type="button" aria-pressed={on} className={on ? pillOn : pillOff} onClick={() => onAnswer(q.id, o.value)}>
                    {o.label}
                  </button>
                );
              })}
            </div>
            {message && lastId === q.id && (
              <p aria-hidden="true" className="mt-3 text-[15px] text-muted">
                {message}
              </p>
            )}
          </fieldset>
        ))}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {spoken}
      </p>
    </section>
  );
}
