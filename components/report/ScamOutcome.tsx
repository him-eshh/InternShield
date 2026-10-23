"use client";
import { FTC_URL, IC3_URL } from "@/lib/client/copyReport";
import type { Report, Source } from "@/lib/types";
import { CheckIcon, ExternalIcon } from "../icons";
import { btnPrimary, btnSecondary, card } from "../ui";
import CopyReportButton from "./CopyReportButton";

export const PLATFORM:Partial<Record<Source, { label: string; url: string }>> = {
  linkedin: { label: "LinkedIn help", url: "https://www.linkedin.com/help/linkedin" },
  handshake: { label: "Handshake help", url: "https://support.joinhandshake.com" },
};

const STEPS = [
  "Don't reply or send money.",
  "Don't deposit any check they send.",
  "Block the sender.",
  "If you already paid or shared info, call your bank.",
];

function LinkButton({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={primary ? btnPrimary : btnSecondary}>
      {label}
      <ExternalIcon size={16} />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export default function ScamOutcome({ report, source, careersUrl }: { report: Report; source: Source | null; careersUrl: string | null }) {
  const platform = source ? PLATFORM[source] : undefined;

  return (
    <section aria-labelledby="todo-title" className={`${card} p-6 sm:p-8`}>
      <h3 id="todo-title" className="text-[28px] font-bold tracking-[-0.02em]">What to do now</h3>
      <ul className="mt-5 space-y-3">
        {STEPS.map((s) => (
          <li key={s} className="flex items-start gap-3 text-[17px]">
            <span className="mt-1 text-accent"><CheckIcon size={18} /></span>
            {s}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3 max-sm:flex-col">
        <LinkButton href={FTC_URL} label="Report to the FTC" primary />
        <LinkButton href={IC3_URL} label="Report to the FBI (IC3)" />
        {platform && <LinkButton href={platform.url} label={platform.label} />}
        <CopyReportButton report={report} careersUrl={careersUrl} />
      </div>
    </section>
  );
}
