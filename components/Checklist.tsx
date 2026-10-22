import { STEP_LABELS, type LineState, type StepKey } from "@/lib/client/pipeline";
import { CheckIcon, InfoIcon, Spinner } from "./icons";
import { subhead } from "./ui";

export interface LineInfo {
  state: LineState;
  reason?: string; // "timeout" | "limit" | "error" | skip reason
}

export const KEYS_IN_ORDER: StepKey[] = ["extract", "company", "sender", "posting", "explain"];

export function initialLines(): Record<StepKey, LineInfo> {
  return { extract: { state: "pending" }, company: { state: "pending" }, sender: { state: "pending" }, posting: { state: "pending" }, explain: { state: "pending" } };
}

function note(info: LineInfo): string | null {
  if (info.state === "failed") return info.reason === "limit" ? "busy, try again soon" : "couldn't check";
  if (info.state === "skipped") return "couldn't check";
  return null;
}

export default function Checklist({ lines, example }: { lines: Record<StepKey, LineInfo>; example?: boolean }) {
  return (
    <section className="mx-auto max-w-[640px] px-6 py-16 sm:py-24">
      <h2 className={subhead}>Checking the message</h2>
      {example && <p className="mt-2 text-[15px] text-muted">Live check on the example.</p>}
      <ol aria-live="polite" aria-label="Checks in progress" className="mt-10 space-y-5">
        {KEYS_IN_ORDER.map((k, i) => {
          const info = lines[k];
          const n = note(info);
          return (
            <li
              key={k}
              className={`animate-enter flex items-center gap-4 text-[19px] transition-opacity duration-300 ${info.state === "pending" ? "opacity-40" : ""}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
                {info.state === "running" && <Spinner size={22} className="text-accent" />}
                {info.state === "done" && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-good/15 text-good"><CheckIcon size={16} /></span>
                )}
                {(info.state === "failed" || info.state === "skipped") && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-soft text-muted"><InfoIcon size={16} /></span>
                )}
                {info.state === "pending" && <span className="h-3 w-3 rounded-full border-2 border-border" />}
              </span>
              <span>
                {STEP_LABELS[k]}
                {n && <span className="ml-2 text-[15px] text-muted">{n}</span>}
                <span className="sr-only">
                  {info.state === "done" ? ", done" : info.state === "running" ? ", in progress" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
