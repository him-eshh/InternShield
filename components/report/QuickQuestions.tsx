"use client";
import { useState } from "react";
import type { Answers, Question, QuestionId } from "@/lib/types";
import { InfoIcon } from "../icons";
import { btnSecondary, pillOff, pillOn } from "../ui";

export type AnswerValue = string | string[];

interface Props {
  questions: Question[];
  answers: Answers;
  /** One line from describeChange(), or null. */
  change: string | null;
  /** The question answered most recently; the confirmation shows under it. */
  lastId?: QuestionId | null;
  disabled?: boolean;
  confirmations?: Partial<Record<QuestionId, string>>;
  onAnswer: (id: QuestionId, value: AnswerValue) => void;
}

export function confirmation(change: string | null): string {
  return change ?? "Added: answer. Confirmed: your answer was recorded. Check the risk score above.";
}

/** Values that answer a multi-select on their own ("None yet", "Not sure"). */
const ALONE = new Set(["none", "unknown"]);

function labelOf(q: Question, value: Answers[QuestionId] | undefined): string | undefined {
  const vals = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const labels = vals.map((v) => q.options.find((o) => o.value === v)?.label).filter(Boolean);
  return labels.length ? labels.join(", ") : undefined;
}

function MultiQuestion({ q, value, onAnswer }: { q: Question; value: Answers[QuestionId] | undefined; onAnswer: Props["onAnswer"] }) {
  const [picked, setPicked] = useState<string[]>(Array.isArray(value) ? value : []);
  const toggle = (v: string) => setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  return (
    <>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {q.options.map((o) => {
          const alone = ALONE.has(o.value);
          const on = alone ? value === o.value : picked.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              className={`${on ? pillOn : pillOff} !min-h-11`}
              onClick={() => {
                if (!alone) return toggle(o.value);
                setPicked([]);
                onAnswer(q.id, o.value);
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {picked.length > 0 && (
        <button type="button" className={`${btnSecondary} mt-3 !min-h-11 !px-5 !py-2 !text-[15px]`} onClick={() => onAnswer(q.id, picked)}>
          Update the check
        </button>
      )}
    </>
  );
}

export default function QuickQuestions({ questions, answers, change, lastId = null, onAnswer, confirmations = {}, disabled = false }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<QuestionId | null>(null);
  if (questions.length === 0) return null;
  const message = lastId && answers[lastId] !== undefined ? confirmations[lastId] ?? confirmation(change) : "";
  // Prefix the chosen answer so two answers with the same result are both announced.
  const lastQ = questions.find((q) => q.id === lastId);
  const picked = lastQ ? labelOf(lastQ, answers[lastQ.id]) : undefined;
  const spoken = message && picked ? `${picked}. ${message}` : message;
  // The top unanswered question is open; the rest wait behind "+N more" (answered ones stay visible).
  const firstOpen = questions.findIndex((q) => answers[q.id] === undefined);
  const shown = showAll ? questions : questions.filter((q, i) => answers[q.id] !== undefined || i === firstOpen);
  const more = questions.length - shown.length;
  return (
    <section aria-labelledby="qq-title" className="rounded-[18px] border border-border bg-bg-soft p-6">
      <h3 id="qq-title" className="flex items-center gap-2 text-[19px] font-semibold">
        <span className="text-accent"><InfoIcon size={20} /></span>
        A few quick questions
      </h3>
      <p className="mt-1 text-[15px] text-muted">Make this check more accurate · Optional</p>
      <div className="mt-5 space-y-6">
        {shown.map((q) => (
          <fieldset key={q.id} disabled={disabled}>
            <legend className="text-[17px]">{q.text}</legend>
            {answers[q.id] !== undefined && editing !== q.id ? (
              <button type="button" className={`${btnSecondary} mt-2 min-h-11 text-left`} onClick={() => setEditing(q.id)}>
                {labelOf(q, answers[q.id])} {"\u00b7"} Change
              </button>
            ) : q.kind === "multi" ? (
              <MultiQuestion q={q} value={answers[q.id]} onAnswer={(id, value) => { setEditing(null); onAnswer(id, value); }} />
            ) : (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const on = answers[q.id] === o.value;
                  return (
                    <button key={o.value} type="button" aria-pressed={on} className={`${on ? pillOn : pillOff} !min-h-11`} onClick={() => { setEditing(null); onAnswer(q.id, o.value); }}>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            )}
            {(confirmations[q.id] || (message && lastId === q.id)) && (
              <p aria-hidden="true" className="mt-3 text-[15px] text-muted">
                {confirmations[q.id] ?? message}
              </p>
            )}
          </fieldset>
        ))}
      </div>
      {more > 0 && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-5 min-h-11 text-[15px] font-medium text-accent-fg underline-offset-4 hover:underline">
          +{more} more
        </button>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {spoken}
      </p>
    </section>
  );
}
