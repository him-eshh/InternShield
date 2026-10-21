import { checkTurn } from "@/lib/tiers/scripted";
import { SCRIPTED_ROUNDS, type InterviewRound, type InterviewSession, type InterviewTurn, type StarCheck } from "@/lib/tiers/types";
import { btnPrimary, btnSecondary, card as cardCls } from "../../ui";

const STAR: { key: keyof StarCheck; label: string }[] = [
  { key: "situation", label: "Situation" },
  { key: "task", label: "Task" },
  { key: "action", label: "Action" },
  { key: "result", label: "Result" },
];

function fmt(n: number, unit: "$" | "%" | ""): string {
  const s = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const sign = n < 0 ? "-" : "";
  return unit === "$" ? `${sign}$${s}` : unit === "%" ? `${sign}${s}%` : `${sign}${s}`;
}

function CodeCheck({ turn, round }: { turn: InterviewTurn; round: InterviewRound }) {
  const r = SCRIPTED_ROUNDS.includes(round) ? checkTurn(turn) : null;
  if (!r) return null;
  return (
    <div className="mt-5 rounded-[12px] border border-border px-4 py-3">
      <h2 className="text-[15px] font-semibold">Checked by code</h2>
      {r.kind === "number" ? (
        <p className="mt-1 break-words text-[16px]">
          {r.found === null ? "No final number found" : `Your final number: ${fmt(r.found, r.unit)}`} · Expected: {fmt(r.expected, r.unit)}
          {r.found !== null && (
            <>
              {" · "}
              <span className={`font-medium ${r.correct ? "text-good" : "text-muted"}`}>{r.correct ? "✓ correct" : "– not quite"}</span>
            </>
          )}
        </p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {[...r.covered.map((l) => ({ l, on: true })), ...r.missed.map((l) => ({ l, on: false }))].map(({ l, on }) => (
            <li key={l} className={`rounded-[12px] border px-3 py-2 text-[14px] ${on ? "border-good/40" : "border-border text-muted"}`}>
              <span className="block break-words font-medium text-text">{l}</span>
              {on ? "✓ covered" : "– missing"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
            {session.turns.map((turn, index) => {
              // A turn the AI skipped still shows when code checked it.
              const item = fb.items.find((x) => x.index === index);
              if (!item && !(SCRIPTED_ROUNDS.includes(session.round) && checkTurn(turn))) return null;
              return (
                <li key={index} className={`${cardCls} animate-enter p-5 sm:p-6`}>
                  <p className="text-[14px] font-medium text-muted">Question {index + 1}</p>
                  <p className="mt-1 break-words text-[17px] font-semibold leading-snug">{turn.question}</p>
                  <p className="mt-4 text-[14px] font-medium text-muted">Your answer</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[16px]">{turn.answer}</p>
                  {item?.quote && (
                    <blockquote className="mt-4 break-words rounded-[12px] border-l-4 border-accent bg-accent/10 px-4 py-3 text-[16px]">
                      <span className="sr-only">Quote from your answer: </span>
                      {item.quote}
                    </blockquote>
                  )}
                  <CodeCheck turn={turn} round={session.round} />
                  {item && (
                    <>
                      <h2 className="mt-5 text-[15px] font-semibold">What worked</h2>
                      <p className="mt-1 break-words text-[16px]">{item.strength}</p>
                      <h2 className="mt-4 text-[15px] font-semibold">Try next time</h2>
                      <p className="mt-1 break-words text-[16px]">{item.improve}</p>
                    </>
                  )}
                  {session.round === "behavioral" && item?.star && (
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
