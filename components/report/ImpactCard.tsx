import { ArrowRight, CircleMinus, CirclePlus, Equal, Scale, TextCursorInput } from "lucide-react";
import { impactLines, scoreLine, type AnswerImpact, type ImpactLine } from "@/lib/impact";

const MAX_ROWS = 4;
const ICON: Record<ImpactLine["tone"], typeof CirclePlus> = { new: CirclePlus, gone: CircleMinus, weight: Scale, none: Equal };

/**
 * "What you added" then "What changed": one block for every answer, extra detail or company edit.
 * Check-colored (data-tool) rather than grey; the verdict itself stays in the ring above.
 */
export default function ImpactCard({ impact }: { impact: AnswerImpact }) {
  const all = impactLines(impact);
  const lines = all.length > MAX_ROWS ? all.slice(0, MAX_ROWS - 1) : all;
  const hidden = all.length - lines.length;
  return (
    <div data-tool="check" data-impact className="rounded-2xl border border-tool/40 bg-tool-tint p-4 text-left text-fg sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-tool-strong"><TextCursorInput size={20} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-tool-strong">What you added</p>
          {impact.question && <p className="mt-1 text-[14px] leading-snug text-fg-2 [overflow-wrap:anywhere]">{impact.question}</p>}
          <p className="mt-0.5 text-[16px] font-semibold leading-snug [overflow-wrap:anywhere]">{impact.label}</p>
        </div>
      </div>
      <div className="mt-3 border-t border-tool/25 pt-3">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-tool-strong">
          <ArrowRight size={14} aria-hidden="true" />
          What changed
        </p>
        <p className="mt-1 text-[16px] font-semibold leading-snug tabular-nums [overflow-wrap:anywhere]">{scoreLine(impact)}</p>
        <ul className="mt-2 space-y-2">
          {lines.map((l) => {
            const Icon = ICON[l.tone];
            return (
              <li key={l.text} className="flex items-start gap-2 text-[15px] leading-snug">
                <span className="mt-0.5 shrink-0 text-tool-strong"><Icon size={16} aria-hidden="true" /></span>
                <span className="min-w-0 [overflow-wrap:anywhere]">{l.text}</span>
              </li>
            );
          })}
          {hidden > 0 && <li className="pl-6 text-[14px] text-fg-2">and {hidden} more, listed in the evidence below</li>}
        </ul>
      </div>
    </div>
  );
}
