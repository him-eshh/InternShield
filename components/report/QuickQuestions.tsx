"use client";
import type { Answers, Question, QuestionId } from "@/lib/types";
import { InfoIcon } from "../icons";
import { pillOff, pillOn } from "../ui";

interface Props {
  questions: Question[];
  answers: Answers;
  /** One line from describeChange(), or null. */
  change: string | null;
  onAnswer: (id: QuestionId, value: string) => void;
}

export default function QuickQuestions({ questions, answers, change, onAnswer }: Props) {
  if (questions.length === 0) return null;
  const open = questions.filter((q) => answers[q.id] === undefined).length;
  const answered = questions.some((q) => answers[q.id] !== undefined);
  const status = change ?? (answered ? "Your answer didn't change the score." : "");
  return (
    <section aria-labelledby="qq-title" className="rounded-[18px] border border-border bg-bg-soft p-6">
      <h3 id="qq-title" className="flex items-center gap-2 text-[19px] font-semibold">
        <span className="text-accent"><InfoIcon size={20} /></span>
        {open > 0 ? `Answer ${open} quick question${open === 1 ? "" : "s"} to make this more accurate` : change ? "Thanks, we updated the result" : "Thanks for answering"}
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
          </fieldset>
        ))}
      </div>
      <p role="status" className={status ? "mt-5 text-[15px] text-muted" : "sr-only"}>
        {status}
      </p>
    </section>
  );
}
