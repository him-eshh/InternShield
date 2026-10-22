"use client";
import { useEffect, useRef, useState } from "react";
import type { Flag } from "@/lib/types";
import { AlertIcon, CheckCircleIcon, ExternalIcon, WarningIcon } from "../icons";

export default function EvidenceCard({ flag }: { flag: Flag }) {
  const ref = useRef<HTMLLIElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const red = flag.kind === "red";
  const Icon = red ? (flag.critical ? AlertIcon : WarningIcon) : CheckCircleIcon;
  return (
    <li
      ref={ref}
      className={`rounded-[18px] border border-border border-l-[5px] bg-card p-5 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none print:translate-y-0 print:opacity-100 ${
        red ? "border-l-bad" : "border-l-good"
      } ${seen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
    >
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
