"use client";
import { useEffect, useRef, useState } from "react";
import { LEVEL_LABELS, type RiskLevel } from "@/lib/types";
import { AlertIcon, CheckCircleIcon, WarningIcon } from "../icons";

const R = 88;
const C = 2 * Math.PI * R;
const COLOR: Record<RiskLevel, string> = { low: "text-good", medium: "text-warn", high: "text-bad" };

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function RiskRing({ score, level }: { score: number; level: RiskLevel }) {
  const [shown, setShown] = useState(0); // number in the middle (counts up)
  const [fill, setFill] = useState(0); // 0..100 drives stroke-dashoffset (CSS transition)
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    const target = Math.max(0, Math.min(100, score));
    if (reduced()) {
      from.current = target;
      const id = requestAnimationFrame(() => {
        setShown(target);
        setFill(target);
      });
      return () => cancelAnimationFrame(id);
    }
    const duration = 900;
    const t0 = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + (target - start) * eased));
      setFill(start + (target - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    });
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const Icon = level === "low" ? CheckCircleIcon : level === "medium" ? WarningIcon : AlertIcon;
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`relative ${COLOR[level]}`}>
        <svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label={`Risk ${score} out of 100`}>
          <circle cx="110" cy="110" r={R} fill="none" stroke="var(--border)" strokeWidth="14" />
          <circle
            cx="110"
            cy="110"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - fill / 100)}
            transform="rotate(-90 110 110)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-text">
          <span className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted">Risk</span>
          <span className="text-[28px] font-semibold leading-none tabular-nums" aria-hidden="true">{shown}</span>
        </div>
      </div>
      <h2 className={`mt-6 flex max-w-[22ch] items-center justify-center gap-3 text-[clamp(32px,4.6vw,44px)] font-bold leading-[1.1] tracking-[-0.025em] ${COLOR[level]}`}>
        <Icon size={32} className="shrink-0" />
        <span className="text-text">{LEVEL_LABELS[level]}</span>
      </h2>
    </div>
  );
}
