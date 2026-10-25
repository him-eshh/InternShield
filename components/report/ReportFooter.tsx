import type { ReactNode } from "react";
import { FTC_URL, IC3_URL } from "@/lib/client/copyReport";
import type { Report, RiskLevel, Source } from "@/lib/types";
import { ExternalLink as ExternalIcon } from "lucide-react";
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
export default function ReportFooter({ report, careersUrl, officialLink, source, onAgain, extras }: Props) {
  const low = report.level === "low";
  const platform = !low && source ? PLATFORM[source] : undefined;
  return (
    <footer className="flex flex-col items-center gap-6 border-t border-border pt-10 text-center">
      <button type="button" onClick={onAgain} className={btnPrimary}>
        Check another message
      </button>
      <div role="group" aria-label="More actions" className="rf-extras flex flex-wrap items-center justify-center gap-2">
        {!low && <CopyReportButton report={report} careersUrl={careersUrl} compact />}
        {officialLink && <Out href={officialLink.url} label={officialLink.label} />}
        <Out href={FTC_URL} label="Report to the FTC" />
        {!low && <Out href={IC3_URL} label="Report to the FBI (IC3)" />}
        {platform && <Out href={platform.url} label={platform.label} />}
        {typeof extras === "function" ? extras(report.level) : extras}
      </div>
    </footer>
  );
}
