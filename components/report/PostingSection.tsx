"use client";
import { useState } from "react";
import type { MatchRow, PostingData } from "@/lib/types";
import { CircleCheck as CheckCircleIcon, ChevronDown as ChevronIcon, ExternalLink as ExternalIcon, TriangleAlert as WarningIcon } from "lucide-react";
import { btnSecondary, card } from "../ui";

const ROW_LABEL: Record<MatchRow["row"], string> = {
  company: "Company",
  role: "Role",
  pay: "Pay",
  contact: "Contact's website",
};

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

interface Props {
  /** True when the posting search ran (it may still have found nothing). */
  checked?: boolean;
  posting: PostingData | null;
  match: MatchRow[] | null;
  company: string | null;
  careersUrl: string | null;
}

export default function PostingSection({ checked = true, posting, match, company, careersUrl }: Props) {
  const found = !!posting?.found;
  // Starts open: nothing waits for a scroll to show (findings 05 standing #12).
  const [open, setOpen] = useState(true);

  if (!found || !posting) {
    return (
      <section className={`${card} p-6 sm:p-8`}>
        <h3 className="text-[24px] font-semibold tracking-[-0.02em]">The real posting</h3>
        <p className="mt-3 text-[17px] text-muted">
          {checked
            ? "We couldn't find this role on the company's site. That doesn't count against the message."
            : "We couldn't check the posting."}
        </p>
        {careersUrl && (
          <a href={careersUrl} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} mt-6`}>
            See the official careers page <ExternalIcon size={16} />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </section>
    );
  }

  const facts: [string, string | null][] = [
    ["Company", company],
    ["Location", posting.location],
    ["Pay", posting.pay],
    ["Posted", fmtDate(posting.postedDate)],
  ];
  return (
    <section aria-labelledby="posting-title" className={`${card} p-6 sm:p-8`}>
      <button type="button" aria-expanded={open} aria-controls="posting-body" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 text-left">
        <span>
          <span className="block text-[14px] font-medium text-good">
            {posting.onOfficialDomain ? "Found on the company's site" : "Found on a hiring platform"}
          </span>
          <span id="posting-title" className="mt-1 block text-[24px] font-semibold tracking-[-0.02em]">{posting.title ?? "Matching posting"}</span>
        </span>
        <span className={`shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}><ChevronIcon size={22} /></span>
      </button>
      <div
        id="posting-body"
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none print:grid-rows-[1fr] print:opacity-100 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden" inert={!open}>
          <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[14px] text-muted">{k}</dt>
                <dd className="text-[17px]">{v ?? "Not listed"}</dd>
              </div>
            ))}
          </dl>
          {match && match.length > 0 && (
            <div className="mt-8">
              <div className="sm:hidden">
                <h4 className="pb-3 text-[17px] font-semibold">Does the message match the posting?</h4>
                <ul>
                  {match.map((r) => (
                    <li key={r.row} className="border-t border-border py-3 text-[15px]">
                      <p className="font-medium">{ROW_LABEL[r.row]}</p>
                      <p className="mt-1 break-words">
                        <span className="text-muted">Message: </span>
                        {r.message ?? <span className="text-muted">Not listed</span>}
                      </p>
                      <p className="mt-1 break-words">
                        <span className="text-muted">Posting: </span>
                        {r.posting ?? <span className="text-muted">Not listed</span>}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5">
                        {r.ok === true && <span className="inline-flex items-center gap-1.5 text-good"><CheckCircleIcon size={20} />Matches</span>}
                        {r.ok === false && <span className="inline-flex items-center gap-1.5 text-warn"><WarningIcon size={20} />Doesn&apos;t match</span>}
                        {r.ok === null && <span className="text-muted">Not listed</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <table className="hidden w-full table-fixed border-collapse text-left text-[15px] sm:table">
                <caption className="pb-3 text-left text-[17px] font-semibold">Does the message match the posting?</caption>
                <thead>
                  <tr className="text-[13px] uppercase tracking-wide text-muted">
                    <th scope="col" className="w-24 py-2 pr-3 font-medium">&nbsp;</th>
                    <th scope="col" className="py-2 pr-3 font-medium">The message says</th>
                    <th scope="col" className="py-2 pr-3 font-medium">The posting says</th>
                    <th scope="col" className="w-10 py-2 font-medium"><span className="sr-only">Result</span></th>
                  </tr>
                </thead>
                <tbody>
                  {match.map((r) => (
                    <tr key={r.row} className="border-t border-border align-top">
                      <th scope="row" className="py-3 pr-3 font-medium">{ROW_LABEL[r.row]}</th>
                      <td className="break-words py-3 pr-3">{r.message ?? <span className="text-muted">Not listed</span>}</td>
                      <td className="break-words py-3 pr-3">{r.posting ?? <span className="text-muted">Not listed</span>}</td>
                      <td className="py-3">
                        {r.ok === true && <span className="text-good"><CheckCircleIcon size={20} /><span className="sr-only">Matches</span></span>}
                        {r.ok === false && <span className="text-warn"><WarningIcon size={20} /><span className="sr-only">Doesn&apos;t match</span></span>}
                        {r.ok === null && (
                          <span className="text-muted">
                            <span aria-hidden="true">·</span>
                            <span className="sr-only">Not listed</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {posting.url && (
            <a href={posting.url} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} mt-8`}>
              {posting.onOfficialDomain ? "Apply on the official site" : "Open the posting"} <ExternalIcon size={16} />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
