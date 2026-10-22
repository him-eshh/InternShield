import { SEVERITY_LABEL, severityOf, type Severity } from "@/lib/reportView";
import type { Flag, FlagGroup } from "@/lib/types";
import { AlertIcon, CheckCircleIcon, ExternalIcon, WarningIcon } from "../icons";

const GROUP_LABEL: Record<FlagGroup, string> = { sender: "Sender", message: "Message", offer: "Offer" };

const BAR: Record<Severity, string> = { critical: "border-l-bad", high: "border-l-bad", medium: "border-l-warn", low: "border-l-border-strong" };
const BADGE: Record<Severity, string> = {
  critical: "bg-bad-tint text-bad",
  high: "bg-bad-tint text-bad",
  medium: "bg-warn-tint text-warn",
  low: "bg-sunken text-fg-2",
};

export const flagDomId = (flag: Flag) => `flag-${flag.id}`;

// Always visible: no scroll-reveal (findings 05 standing #12). Severity is spelled out, never color alone.
export default function EvidenceCard({ flag }: { flag: Flag }) {
  const red = flag.kind === "red";
  const sev = severityOf(flag);
  const Icon = red ? (sev === "critical" || sev === "high" ? AlertIcon : WarningIcon) : CheckCircleIcon;
  return (
    <li id={flagDomId(flag)} className={`scroll-mt-6 rounded-[18px] border border-border border-l-[5px] bg-card p-5 ${red ? BAR[sev] : "border-l-good"}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${red ? (sev === "medium" ? "text-warn" : sev === "low" ? "text-fg-2" : "text-bad") : "text-good"}`}>
          <Icon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold uppercase tracking-wide ${red ? BADGE[sev] : "bg-good-tint text-good"}`}
            >
              {red ? SEVERITY_LABEL[sev] : "Good sign"}
            </span>
            <span className="text-[13px] text-fg-3">{GROUP_LABEL[flag.group]}</span>
          </div>
          <h4 className="mt-1.5 text-[17px] font-semibold leading-snug [overflow-wrap:anywhere]">
            <span className="sr-only">{red ? "Red flag: " : "Good sign: "}</span>
            {flag.title}
          </h4>
          {flag.quote && (
            <blockquote className="mt-2 text-[15px] leading-relaxed [overflow-wrap:anywhere]">
              <mark className="quote-mark">&ldquo;{flag.quote}&rdquo;</mark>
            </blockquote>
          )}
          <p className="mt-2 text-[15px] leading-relaxed [overflow-wrap:anywhere]">{flag.why}</p>
          {flag.action && (
            <p className="mt-3 rounded-[10px] bg-bg-subtle px-3 py-2 text-[15px] leading-relaxed [overflow-wrap:anywhere]">
              <span className="font-semibold">Check: </span>
              {flag.action}
            </p>
          )}
          {(flag.learnMore || flag.sourceUrl) && (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
              {flag.learnMore && (
                <a href={flag.learnMore.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-fg hover:underline">
                  {flag.learnMore.label} <ExternalIcon size={13} />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
              {flag.sourceUrl && (
                <a href={flag.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-fg hover:underline">
                  Source <ExternalIcon size={13} />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
