import { ChevronDown, CircleAlert, CircleCheck, CircleMinus, CirclePlus, Equal, Scale, TextCursorInput, TriangleAlert } from "lucide-react";
import { impactLines, type AnswerImpact, type ImpactLine } from "@/lib/impact";
import { LEVEL_LABELS, type RiskLevel } from "@/lib/types";

const MAX_ROWS = 4;
const ICON: Record<ImpactLine["tone"], typeof CirclePlus> = { new: CirclePlus, gone: CircleMinus, weight: Scale, none: Equal };
const LEVEL_ICON: Record<RiskLevel, typeof CircleAlert> = { high: CircleAlert, medium: TriangleAlert, low: CircleCheck };
const LEVEL_TONE: Record<RiskLevel, string> = { high: "bg-bad-tint text-bad", medium: "bg-warn-tint text-warn", low: "bg-good-tint text-good" };

/**
 * "Added" then the score change, both visible without a click; the per-sign rows sit in an open "Why it moved" list.
 * Check-colored (data-tool) except the delta pill, which carries the risk level with icon and words.
 */
export default function ImpactCard({ impact }: { impact: AnswerImpact }) {
  const all = impactLines(impact);
  const lines = all.length > MAX_ROWS ? all.slice(0, MAX_ROWS - 1) : all;
  const hidden = all.length - lines.length;
  const Level = LEVEL_ICON[impact.levelAfter];
  const moved = impact.scoreBefore !== impact.scoreAfter;
  return (
    <div data-tool="check" data-impact className="rounded-2xl border border-tool/40 bg-tool-tint p-4 text-left text-fg sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-tool-strong"><TextCursorInput size={20} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-tool-strong">Added</p>
          {impact.question && !impact.label.includes(impact.question) && <p className="mt-1 text-[14px] leading-snug text-fg-2 [overflow-wrap:anywhere]">{impact.question}</p>}
          <p className="mt-0.5 text-[16px] font-semibold leading-snug [overflow-wrap:anywhere]">{impact.label}</p>
        </div>
      </div>
      <p data-score-change className={`mt-3 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full px-3 py-1.5 text-[15px] font-semibold tabular-nums ${LEVEL_TONE[impact.levelAfter]}`}>
        <Level size={17} aria-hidden="true" />
        <span>{moved ? `${impact.scoreBefore} → ${impact.scoreAfter}` : `Score stays ${impact.scoreAfter}`}</span>
        <span>{impact.levelBefore === impact.levelAfter ? "still" : "now"} {LEVEL_LABELS[impact.levelAfter]}</span>
      </p>
      <details open className="group mt-3 border-t border-tool/25 pt-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-semibold text-tool-strong [&::-webkit-details-marker]:hidden"><span>Why it moved</span><ChevronDown size={17} aria-hidden="true" className="transition-transform group-open:rotate-180" /></summary>
        <ul className="mt-1 space-y-2">
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
      </details>
    </div>
  );
}
