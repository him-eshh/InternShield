import { useId, useState } from "react";
import { formatInUnit, unitName } from "@/lib/tiers/numbers";
import { checkTurn } from "@/lib/tiers/scripted";
import { SCRIPTED_ROUNDS, type InterviewRound, type InterviewSession, type InterviewTurn, type StarCheck } from "@/lib/tiers/types";
import { btnPrimary, btnSecondary, card as cardCls } from "../../ui";

const STAR: { key: keyof StarCheck; label: string }[] = [
  { key: "situation", label: "Situation" },
  { key: "task", label: "Task" },
  { key: "action", label: "Action" },
  { key: "result", label: "Result" },
];

const INPUT =
  "min-h-11 w-full max-w-[220px] rounded-[12px] border border-border bg-card px-3 py-2 text-[16px] text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const SMALL_BTN =
  "inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-[15px] font-medium text-text transition-colors duration-200 hover:bg-bg-soft focus-visible:outline-2 focus-visible:outline-accent";

function CodeCheck({ turn, round }: { turn: InterviewTurn; round: InterviewRound }) {
  // The user can correct the number we read; the check re-runs here on the typed number, without touching the saved answer.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [fixed, setFixed] = useState<string | null>(null);
  const inputId = useId();
  const r = SCRIPTED_ROUNDS.includes(round) ? checkTurn(fixed === null ? turn : { ...turn, answer: fixed }) : null;
  if (!r) return null;
  const submit = () => {
    if (!draft.trim()) return;
    setFixed(draft.trim());
    setEditing(false);
  };
  // The user's number in the user's unit; the question's unit only when the check did not record one.
  const own = r.kind === "number" && r.found !== null ? formatInUnit(r.found, r.foundUnit ?? r.unit) : "";
  return (
    <div className="mt-5 rounded-[12px] border border-border px-4 py-3">
      <h2 className="text-[15px] font-semibold">Checked by code</h2>
      {r.kind === "number" ? (
        <>
          <p className="mt-1 break-words text-[16px]">
            {r.found === null ? "No final number found" : `Your final number: ${own}`}
            {r.unitMismatch && r.unit ? ` (expected ${unitName(r.unit)})` : ""} · Expected: {formatInUnit(r.expected, r.unit)}
            {r.found !== null && (
              <>
                {" · "}
                <span className={`font-medium ${r.correct ? "text-good" : "text-muted"}`}>{r.correct ? "✓ correct" : "not quite"}</span>
              </>
            )}
          </p>
          {(r.message || r.note) && <p className="mt-1 break-words text-[14px] text-muted">{[r.message, r.note].filter(Boolean).join(". ")}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-muted">
            {r.found !== null && <span>We read your final number as {own}.</span>}
            {fixed !== null && <span>(edited)</span>}
            {!editing && (
              <>
                <span>Not right?</span>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(fixed ?? "");
                    setEditing(true);
                  }}
                  className="min-h-11 rounded-full px-2 font-medium text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Edit
                </button>
              </>
            )}
          </div>
          {editing && (
            <form
              className="mt-2 flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label className="text-[14px] font-medium" htmlFor={inputId}>
                Your final number
              </label>
              <input
                id={inputId}
                className={INPUT}
                value={draft}
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                placeholder="e.g. 7.5% or $1.2 million"
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className={SMALL_BTN}>
                Check again
              </button>
              <button type="button" className={SMALL_BTN} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </form>
          )}
        </>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {[...r.covered.map((l) => ({ l, on: true })), ...r.missed.map((l) => ({ l, on: false }))].map(({ l, on }) => (
            <li key={l} className={`rounded-[12px] border px-3 py-2 text-[14px] ${on ? "border-good/40" : "border-border text-muted"}`}>
              <span className="block break-words font-medium text-text">{l}</span>
              {on ? "✓ covered" : "not mentioned"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** True when the quote is just the whole answer again (ignoring spacing and case), so it isn't shown twice. */
function sameText(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  return norm(a) === norm(b);
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
                  {item?.quote && !sameText(item.quote, turn.answer) && (
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
                              {on ? "✓ covered" : "not mentioned"}
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
