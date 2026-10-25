import { RECOVERY_INTRO, RECOVERY_STEPS, showRecovery } from "@/lib/recovery";
import type { RiskLevel } from "@/lib/types";
import { ChevronDown as ChevronIcon, ExternalLink as ExternalIcon } from "lucide-react";

/** "Already sent money or shared info?" Medium/high only; never changes the score. */
export default function RecoveryCard({ level }: { level: RiskLevel }) {
  if (!showRecovery(level)) return null;
  return (
    <details id="recovery" className="group rounded-[18px] border border-border bg-bg-soft">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[18px] px-5 py-4 text-[17px] font-medium text-text [&::-webkit-details-marker]:hidden">
        <span>Already sent money or shared info?</span>
        <span className="text-muted transition-transform duration-200 group-open:rotate-180">
          <ChevronIcon size={18} />
        </span>
      </summary>
      <div className="px-5 pb-5">
        <p className="text-[15px] text-muted">{RECOVERY_INTRO}</p>
        <ol className="mt-4 space-y-4">
          {RECOVERY_STEPS.map((s, i) => (
            <li key={s.id} className="flex gap-3 text-[15px]">
              <span className="mt-px w-5 shrink-0 text-right font-semibold tabular-nums text-muted">{i + 1}</span>
              <span>
                <span className="block font-medium text-text">{s.title}</span>
                <span className="block text-muted">{s.body}</span>
                {s.link && (
                  <a href={s.link.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1 text-accent underline-offset-4 hover:underline">
                    {s.link.label}
                    <ExternalIcon size={13} />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
