import type { InterviewSession, StarCheck } from "@/lib/tiers/types";
import { btnPrimary, btnSecondary, card as cardCls } from "../../ui";

const STAR: { key: keyof StarCheck; label: string }[] = [
  { key: "situation", label: "Situation" },
  { key: "task", label: "Task" },
  { key: "action", label: "Action" },
  { key: "result", label: "Result" },
];

/** Feedback for any finished round. Pure view: the shell passes the actions. */
export default function Feedback({
  session,
  onAgain,
  onBack,
}: {
  session: InterviewSession;
  onAgain: () => void;
  onBack: () => void;
}) {
  const fb = session.feedback;
  return (
    <div>
      <h1 className="text-[clamp(28px,5vw,44px)] font-bold leading-[1.1] tracking-[-0.025em]">Your feedback</h1>
      {fb ? (
        <>
          <p className="mt-4 max-w-[600px] break-words text-[17px] leading-relaxed">{fb.summary}</p>
          <ol className="mt-8 space-y-5">
            {fb.items.map((item) => {
              const turn = session.turns[item.index];
              if (!turn) return null;
              return (
                <li key={item.index} className={`${cardCls} animate-enter p-5 sm:p-6`}>
                  <p className="text-[14px] font-medium text-muted">Question {item.index + 1}</p>
                  <p className="mt-1 break-words text-[17px] font-semibold leading-snug">{turn.question}</p>
                  <p className="mt-4 text-[14px] font-medium text-muted">Your answer</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[16px]">{turn.answer}</p>
                  {item.quote && (
                    <blockquote className="mt-4 break-words rounded-[12px] border-l-4 border-accent bg-accent/10 px-4 py-3 text-[16px]">
                      <span className="sr-only">Quote from your answer: </span>
                      {item.quote}
                    </blockquote>
                  )}
                  <h2 className="mt-5 text-[15px] font-semibold">What worked</h2>
                  <p className="mt-1 break-words text-[16px]">{item.strength}</p>
                  <h2 className="mt-4 text-[15px] font-semibold">Try next time</h2>
                  <p className="mt-1 break-words text-[16px]">{item.improve}</p>
                  {session.round === "behavioral" && item.star && (
                    <div className="mt-5">
                      <h2 className="text-[15px] font-semibold">STAR check</h2>
                      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {STAR.map(({ key, label }) => {
                          const on = item.star![key];
                          return (
                            <li
                              key={key}
                              className={`rounded-[12px] border px-3 py-2 text-[14px] ${on ? "border-good/40" : "border-border text-muted"}`}
                            >
                              <span className="block font-medium text-text">{label}</span>
                              {on ? "✓ covered" : "– missing"}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <p className="mt-4 text-[17px] text-muted">No feedback was saved for this practice.</p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={onAgain} className={btnPrimary}>
          Practice again
        </button>
        <button type="button" onClick={onBack} className={btnSecondary}>
          Back
        </button>
      </div>
    </div>
  );
}
