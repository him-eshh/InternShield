"use client";
// Shared pieces of the coding and SQL panels: one status line, the action bar (run, submit, hint, skip) and the finish step.
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, Lightbulb, SkipForward } from "lucide-react";
import { Spinner } from "../../icons";
import { btnPrimary, btnSecondary, card as cardCls } from "../../ui";

const compact = "min-h-11! px-3.5! text-[15px]!";

/** One live line: progress text while something runs, else the last Submit result. */
export function StatusLine({ text, result, ok }: { text: string; result: boolean; ok: boolean }) {
  if (!text) return <p role="status" aria-live="polite" className="hidden" />;
  if (!result) return <p role="status" aria-live="polite" className="text-[15px] text-muted">{text}</p>;
  const Icon = ok ? CheckCircle2 : CircleAlert;
  return (
    <div className={`flex items-center gap-2.5 rounded-[14px] border px-4 py-3 ${ok ? "border-tool bg-tool-tint text-tool-strong" : "border-border-strong bg-bg-soft text-text"}`}>
      <Icon size={20} aria-hidden="true" className="shrink-0" />
      <p role="status" aria-live="polite" className="text-[17px] font-semibold">{text}</p>
    </div>
  );
}

export interface ActionBarProps {
  runLabel: string;
  running: string | null;
  disabled: boolean;
  busy: boolean;
  /** True once a Submit has passed everything: Submit steps back so Finish is the one primary action. */
  passed: boolean;
  onRun: () => void;
  onSubmit: () => void;
  onStop: () => void;
  onHint: () => void;
  onSkip?: () => void;
  runKey: string;
}

/** Run and Submit on the left, Hint and Skip grouped on the right. A 2 by 2 grid at phone width. */
export function ActionBar({ runLabel, running, disabled, busy, passed, onRun, onSubmit, onStop, onHint, onSkip, runKey }: ActionBarProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center" role="group" aria-label="Actions">
      <button type="button" className={btnSecondary} disabled={disabled} onClick={onRun}>
        {running === runKey && <Spinner size={16} />} {runLabel}
      </button>
      <button type="button" className={passed ? btnSecondary : btnPrimary} disabled={disabled} onClick={onSubmit}>
        {running === "submit" && <Spinner size={16} />} {passed ? "Resubmit" : "Submit"}
      </button>
      {running && (
        <button type="button" className={`${btnSecondary} col-span-2`} onClick={onStop}>
          Stop
        </button>
      )}
      <span className="hidden sm:block sm:flex-1" aria-hidden="true" />
      <button type="button" className={`${btnSecondary} ${compact}`} disabled={disabled} onClick={onHint} aria-label="Ask for a hint">
        {busy ? <Spinner size={16} /> : <Lightbulb size={17} aria-hidden="true" />} Hint
      </button>
      {onSkip && (
        <button type="button" className={`${btnSecondary} ${compact}`} disabled={disabled} onClick={onSkip} aria-label="Skip question">
          <SkipForward size={17} aria-hidden="true" />Skip
        </button>
      )}
    </div>
  );
}

/** Finish is the one primary step once Submit passes; before that it explains what unlocks it. */
export function FinishStep({ submitted, passed, what, disabled, busy, onFinish }: { submitted: boolean; passed: boolean; what: string; disabled: boolean; busy: boolean; onFinish: () => void }) {
  if (!submitted) return <p className="text-[15px] text-muted">Submit your {what} to unlock feedback.</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={passed ? btnPrimary : btnSecondary} disabled={disabled} onClick={onFinish}>
        {busy ? <Spinner size={16} /> : null}Finish and get feedback<ArrowRight size={17} aria-hidden="true" />
      </button>
      <p className="min-w-0 flex-1 text-[15px] text-muted">{passed ? "Next: your feedback and any follow-up." : `Fix and resubmit, or finish with this ${what}.`}</p>
    </div>
  );
}

export function HintList({ hints }: { hints: string[] }) {
  if (!hints.length) return null;
  return (
    <ol className="space-y-2" aria-label="Hints">
      {hints.map((h, i): ReactNode => (
        <li key={i} className={`${cardCls} p-4 text-[16px]`}>
          <span className="text-muted">Hint {i + 1}. </span>
          {h}
        </li>
      ))}
    </ol>
  );
}
