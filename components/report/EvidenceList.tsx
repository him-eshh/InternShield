import { goods, reds } from "@/lib/reportView";
import type { Flag, RiskLevel } from "@/lib/types";
import { ChevronDown as ChevronIcon } from "lucide-react";
import EvidenceCard from "./EvidenceCard";
import { countLabel } from "./EvidenceGroup";

/** One evidence list: red flags by severity, then good signs (collapsed on high risk, where they can't outweigh the flags). */
export default function EvidenceList({ flags, level, numbers = {} }: { flags: Flag[]; level: RiskLevel; numbers?: Record<string, number> }) {
  const red = reds(flags);
  const good = goods(flags);
  return (
    <section aria-labelledby="evidence-title">
      <div className="flex flex-wrap items-center gap-3">
        <h3 id="evidence-title" className="text-[24px] font-semibold tracking-[-0.02em]">Evidence</h3>
        <span className="rounded-full bg-bg-soft px-3 py-1 text-[14px] text-muted">{countLabel(flags)}</span>
      </div>
      {red.length > 0 && (
        <ul className="mt-4 space-y-3">
          {red.slice(0, 3).map((f) => (
            <EvidenceCard key={f.id} flag={f} n={numbers[f.id]} />
          ))}
        </ul>
      )}
      {red.length > 3 && <details className="group mt-3 border-t border-rule"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-3 text-sm font-medium text-tool-strong [&::-webkit-details-marker]:hidden">Show {red.length - 3} more warning signs<ChevronIcon size={18} className="transition-transform group-open:rotate-180" /></summary><ul className="space-y-3">{red.slice(3).map((f) => <EvidenceCard key={f.id} flag={f} n={numbers[f.id]} />)}</ul></details>}
      {good.length > 0 &&
        (level === "high" ? (
          <details className="group mt-4 rounded-[18px] border border-border bg-bg-soft">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[18px] px-5 py-4 text-[17px] font-medium text-muted [&::-webkit-details-marker]:hidden">
              <span>
                Good signs <span className="ml-1 text-[14px]">({good.length})</span>
              </span>
              <span className="transition-transform duration-200 ease-out group-open:rotate-180">
                <ChevronIcon size={18} />
              </span>
            </summary>
            <ul className="space-y-3 px-3 pb-3">
              {good.map((f) => (
                <EvidenceCard key={f.id} flag={f} n={numbers[f.id]} />
              ))}
            </ul>
          </details>
        ) : (
          <ul className="mt-3 space-y-3">
            {good.map((f) => (
              <EvidenceCard key={f.id} flag={f} n={numbers[f.id]} />
            ))}
          </ul>
        ))}
    </section>
  );
}
