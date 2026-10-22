"use client";
import { useEffect, useRef, useState } from "react";
import { copyReport } from "@/lib/client/copyReport";
import type { Report } from "@/lib/types";
import { CopyIcon } from "../icons";
import { btnSecondary } from "../ui";

/** "Copy report" for every risk level: a plain-text summary to share with a career center or keep. */
export default function CopyReportButton({ report, careersUrl }: { report: Report; careersUrl: string | null }) {
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
      <button type="button" onClick={onCopy} className={btnSecondary}>
        <CopyIcon size={16} />
        {copied === "yes" ? "Copied" : copied === "no" ? "Couldn't copy" : "Copy report"}
      </button>
      <p role="status" className="sr-only">{copied === "yes" ? "Report copied to clipboard" : copied === "no" ? "Couldn't copy the report" : ""}</p>
    </>
  );
}
