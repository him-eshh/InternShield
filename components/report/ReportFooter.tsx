import type { ReactNode } from "react";
import { FTC_URL, IC3_URL } from "@/lib/client/copyReport";
import type { Report, RiskLevel, Source } from "@/lib/types";
import { ChevronDown, ExternalLink as ExternalIcon } from "lucide-react";
import { btnPrimary } from "../ui";
import CopyReportButton, { secondaryItem } from "./CopyReportButton";
import { PLATFORM } from "./ScamOutcome";

interface Props {
  report: Report;
  careersUrl: string | null;
  officialLink: { url: string; label: string } | null;
  source: Source | null;
  onAgain: () => void;
  /** Extra actions from the app shell (save to tracker, tailor, practice); a function gets the live level. */
  extras?: ReactNode | ((level: RiskLevel) => ReactNode);
  /** Next-step tool actions (Tailor, Practice), each carrying its own data-tool color. */
  nextSteps?: ReactNode | ((level: RiskLevel) => ReactNode);
}

function Out({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={secondaryItem}>
      {label}
      <ExternalIcon size={14} />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** One primary button, then a compact row of the rest. Copy report only when there is something to share. */
export default function ReportFooter({ report, careersUrl, officialLink, source, onAgain, extras, nextSteps }: Props) {
  const low = report.level === "low";
  const platform = !low && source ? PLATFORM[source] : undefined;
  const next = typeof nextSteps === "function" ? nextSteps(report.level) : nextSteps;
  return (
    <footer className="flex flex-col items-center gap-6 border-t border-border pt-10 text-center">
      <button type="button" onClick={onAgain} className={btnPrimary}>
        Check another message
      </button>
      {next && (
        <div role="group" aria-label="Next steps" className="flex w-full flex-wrap items-stretch justify-center gap-3 max-sm:flex-col">
          {next}
        </div>
      )}
      <div role="group" aria-label="More actions" className="rf-extras flex flex-wrap items-center justify-center gap-2">
        {!low && <CopyReportButton report={report} careersUrl={careersUrl} compact />}
        {officialLink && <Out href={officialLink.url} label={officialLink.label} />}
        {typeof extras === "function" ? extras(report.level) : extras}
      </div>
      <details className="group w-full max-w-[520px] text-left">
        <summary className="mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-full px-3 text-[15px] font-medium text-fg-2 hover:text-fg [&::-webkit-details-marker]:hidden">
          {low ? "Report a message" : "Report this scam"}
          <ChevronDown size={16} aria-hidden="true" className="transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Out href={FTC_URL} label="Report to the FTC" />
          {!low && <Out href={IC3_URL} label="Report to the FBI (IC3)" />}
          {platform && <Out href={platform.url} label={platform.label} />}
        </div>
      </details>
    </footer>
  );
}
