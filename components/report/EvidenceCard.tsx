import type { Flag } from "@/lib/types";
import { AlertIcon, CheckCircleIcon, ExternalIcon, WarningIcon } from "../icons";

// Always visible: no scroll-reveal (findings 05 standing #12).
export default function EvidenceCard({ flag }: { flag: Flag }) {
  const red = flag.kind === "red";
  const Icon = red ? (flag.critical ? AlertIcon : WarningIcon) : CheckCircleIcon;
  return (
    <li className={`rounded-[18px] border border-border border-l-[5px] bg-card p-5 ${red ? "border-l-bad" : "border-l-good"}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${red ? "text-bad" : "text-good"}`}>
          <Icon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[17px] font-semibold leading-snug [overflow-wrap:anywhere]">
              <span className="sr-only">{red ? "Red flag: " : "Good sign: "}</span>
              {flag.title}
            </h4>
            {flag.critical && (
              <span className="rounded-full bg-bad/10 px-2.5 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-bad">Critical</span>
            )}
          </div>
          {flag.quote && (
            <blockquote className="mt-2 border-l-2 border-border pl-3 text-[15px] italic text-muted [overflow-wrap:anywhere]">&ldquo;{flag.quote}&rdquo;</blockquote>
          )}
          <p className="mt-2 text-[15px] leading-relaxed [overflow-wrap:anywhere]">{flag.why}</p>
          {flag.sourceUrl && (
            <a href={flag.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[14px] text-accent hover:underline">
              Source <ExternalIcon size={13} />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
