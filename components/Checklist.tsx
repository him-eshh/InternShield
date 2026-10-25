"use client";
import { useEffect, useState } from "react";
import { STEP_LABELS, type LineState, type StepKey } from "@/lib/client/pipeline";
import { stepNote } from "@/lib/client/errorCopy";
import type { ApiErrorCode } from "@/lib/types";
import { Check as CheckIcon, Info as InfoIcon, LoaderCircle } from "lucide-react";
import { subhead } from "./ui";

export interface LineInfo {
  state: LineState;
  outcome?: string;
  reason?: string; // "timeout" | "limit" | "error" | skip reason
  code?: ApiErrorCode; // set once App passes it through (Needs integration)
}

const KEYS_IN_ORDER: StepKey[] = ["extract", "company", "sender", "posting", "explain"];

/** Spinners wait this long before showing, so instant steps never flicker. */
const SHOW_DELAY_MS = 200;
/** A step running longer than this gets the slow-step note. */
const SLOW_AFTER_MS = 4000;
const SLOW_COPY = "Still checking…";

export function initialLines(): Record<StepKey, LineInfo> {
  return { extract: { state: "pending" }, company: { state: "pending" }, sender: { state: "pending" }, posting: { state: "pending" }, explain: { state: "pending" } };
}

/** Short outcome text for a finished step; null while pending, running or done. */
export function lineNote(info: LineInfo): string | null {
  if (info.state === "failed") return stepNote(info.code, info.reason);
  if (info.state === "skipped") return "skipped";
  return info.state === "done" ? info.outcome ?? null : null;
}

const STATE_WORD: Record<LineState, string> = { pending: "", running: ", in progress", done: ", done", failed: ", failed", skipped: ", skipped" };

/** Mounted only while a step runs, so its timer starts and resets with the step. */
function SlowNote({ after }: { after: number }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), after);
    return () => clearTimeout(t);
  }, [after]);
  return slow ? <>{SLOW_COPY}</> : null;
}

function Marker({ state }: { state: LineState }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
      {state === "running" && (
        <span className="animate-enter flex" style={{ animationDelay: `${SHOW_DELAY_MS}ms` }}>
          <LoaderCircle size={22} className="animate-spin text-accent motion-reduce:animate-none" />
        </span>
      )}
      {state === "done" && (
        <span className="animate-enter flex h-7 w-7 items-center justify-center rounded-full bg-tool-tint text-tool-strong">
          <CheckIcon size={16} />
        </span>
      )}
      {(state === "failed" || state === "skipped") && (
        <span className="animate-enter flex h-7 w-7 items-center justify-center rounded-full bg-bg-soft text-muted">
          <InfoIcon size={16} />
        </span>
      )}
      {state === "pending" && <span className="h-3 w-3 rounded-full border-2 border-border" />}
    </span>
  );
}

export default function Checklist({ lines, example, slowAfterMs = SLOW_AFTER_MS }: { lines: Record<StepKey, LineInfo>; example?: boolean; slowAfterMs?: number }) {
  const active = KEYS_IN_ORDER.find((key) => lines[key].state === "running") ?? [...KEYS_IN_ORDER].reverse().find((key) => lines[key].state !== "pending");
  const current = active ? `${STEP_LABELS[active]}${STATE_WORD[lines[active].state]}` : "Preparing checks";
  return (
    <section data-tool="check" className="mx-auto max-w-[760px] px-4 py-10 sm:px-6 sm:py-16">
      <header className="rounded-tr-[28px] bg-tool-deep px-5 py-6 text-on-deep"><p className="text-sm opacity-85">{example ? "Example / " : ""}Checking the message</p><h2 className={`${subhead} mt-2`}>Following the evidence</h2><p className="mt-2 opacity-90">Each finished check makes the report more useful. Missing checks will be shown plainly.</p></header>
      <p role="status" aria-live="polite" className="sr-only">{current}</p>
      <ol aria-label="Checks in progress" className="mt-8 border-t border-rule">
        {KEYS_IN_ORDER.map((k) => {
          const info = lines[k];
          const n = lineNote(info);
          return (
            <li
              key={k}
              data-state={info.state}
              className={`flex min-h-16 items-start gap-4 border-b border-rule py-4 transition-opacity duration-150 ease-out ${info.state === "pending" ? "text-fg-3" : ""}`}
            >
              <Marker key={info.state} state={info.state} />
              <span className="block pt-0.5">
                <span className="block text-[19px] leading-7">
                  {STEP_LABELS[k]}
                  <span className="sr-only">{STATE_WORD[info.state]}</span>
                </span>
                {/* Reserved line: notes appear without moving the rows below. */}
                <span className="block min-h-5 text-[15px] leading-5 text-muted">
                  {n}
                  {info.state === "running" && <SlowNote key={k} after={slowAfterMs} />}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
