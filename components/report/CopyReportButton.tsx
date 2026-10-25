"use client";
import { useEffect, useRef, useState } from "react";
import { copyReport } from "@/lib/client/copyReport";
import type { Report } from "@/lib/types";
import { Copy as CopyIcon } from "lucide-react";
import { btnSecondary } from "../ui";

/** Compact outlined item for the footer's secondary row. */
export const secondaryItem =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-[15px] font-medium text-text transition-colors duration-200 ease-out hover:bg-bg-soft";

/** "Copy report" for every risk level: a plain-text summary to share with a career center or keep. */
export default function CopyReportButton({ report, careersUrl, compact = false }: { report: Report; careersUrl: string | null; compact?: boolean }) {
  const [copied, setCopied] = useState<"idle" | "yes" | "no">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function onCopy() {
    const ok = await copyReport(report, careersUrl);
    setCopied(ok ? "yes" : "no");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied("idle"), 2500);
  }

  return (
    <>
      <button type="button" onClick={onCopy} className={compact ? secondaryItem : btnSecondary}>
        <CopyIcon size={16} />
        {copied === "yes" ? "Copied" : copied === "no" ? "Couldn't copy" : "Copy report"}
      </button>
      <p role="status" className="sr-only">{copied === "yes" ? "Report copied to clipboard" : copied === "no" ? "Couldn't copy the report" : ""}</p>
    </>
  );
}
