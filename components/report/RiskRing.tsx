"use client";
import { animate, m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { coverageTicks, deltaAnnouncement, deltaLabel } from "@/lib/reportView";
import { LEVEL_LABELS, type Report, type RiskLevel } from "@/lib/types";
import { CircleAlert, TriangleAlert, CircleCheck } from "lucide-react";

const R = 86;
const C = 2 * Math.PI * R;
const COLOR: Record<RiskLevel, string> = { low: "text-good", medium: "text-warn", high: "text-bad" };
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]; // ease-out with no overshoot
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** One tick per check: long and colored when the check ran, short and grey when it didn't (shape, not just color). */
function tickLine(i: number, n: number, ran: boolean) {
  const a = (-90 + (i * 360) / n) * (Math.PI / 180);
  const r1 = 98;
  const r2 = ran ? 108 : 102;
  const p = (r: number) => (110 + r * Math.cos(a)).toFixed(2);
  const q = (r: number) => (110 + r * Math.sin(a)).toFixed(2);
  return { x1: p(r1), y1: q(r1), x2: p(r2), y2: q(r2) };
}

interface ViewProps {
  /** The number in the middle and the arc fill, 0..100 (may be fractional mid-animation). */
  value: number;
  /** The settled score, for the accessible name. */
  score: number;
  level: RiskLevel;
  ticks: boolean[];
  /** Fade the ticks in one after another (first reveal only). */
  staggerTicks?: boolean;
  /** Change since the previous score, or null the first time. */
  delta?: { label: string; announcement: string } | null;
  chipKey?: number;
}

/** Pure presentation: no state, so it renders the same on the server and in tests. */
export function RingView({ value, score, level, ticks, staggerTicks = false, delta = null, chipKey = 0 }: ViewProps) {
  const Icon = level === "high" ? CircleAlert : level === "medium" ? TriangleAlert : CircleCheck;
  const n = ticks.length;
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`relative ${COLOR[level]}`}>
        <svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label={`Risk ${score} out of 100`} className="max-w-full">
          {ticks.map((ran, i) => {
            const l = tickLine(i, n, ran);
            return (
              <m.line
                key={i}
                data-tick={ran ? "ran" : "skipped"}
                {...l}
                stroke={ran ? "currentColor" : "var(--border-strong)"}
                strokeWidth={3}
                strokeLinecap="round"
                initial={staggerTicks ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02, duration: 0.2, ease: EASE }}
              />
            );
          })}
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
            strokeDashoffset={C * (1 - value / 100)}
            transform="rotate(-90 110 110)"
          />
          {/* Start marker: keeps a score of 0 from looking like an empty, broken ring. */}
          <circle data-start-dot cx="110" cy={110 - R} r="7" fill="currentColor" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-text">
          <span className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted">Risk</span>
          <span data-score className="text-score font-semibold tabular-nums" aria-hidden="true">{Math.round(value)}</span>
        </div>
      </div>
      <div className="mt-3 flex h-7 items-center">
        {delta && (
          <m.span
            key={chipKey}
            data-delta
            aria-hidden="true"
            initial={staggerTicks ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="rounded-full bg-sunken px-2.5 py-0.5 text-[13px] font-medium tabular-nums text-fg-2"
          >
            {delta.label}
          </m.span>
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">{delta?.announcement ?? ""}</p>
      <h2 className="mt-2 flex max-w-[22ch] flex-col items-center justify-center gap-2 text-[clamp(32px,4.6vw,44px)] font-bold leading-[1.1] tracking-[-0.025em] sm:flex-row sm:gap-3">
        {Icon && <span className={`shrink-0 ${COLOR[level]}`}><Icon size={32} /></span>}
        <span className="text-text">{LEVEL_LABELS[level]}</span>
      </h2>
    </div>
  );
}

export default function RiskRing({ score, level, coverage }: { score: number; level: RiskLevel; coverage?: Report["coverage"] }) {
  const target = clamp(score);
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  // Remember the previous score (derived during render, no effect) so a change can show a delta.
  const [track, setTrack] = useState<{ score: number; from: number | null }>({ score: target, from: null });
  if (track.score !== target) setTrack({ score: target, from: track.score });
  const shownRef = useRef(0);
  const revealed = useRef(false);

  useEffect(() => {
    if (reduce) {
      shownRef.current = target;
      return;
    }
    const first = !revealed.current;
    revealed.current = true;
    const ctl = animate(shownRef.current, target, {
      duration: first ? 0.8 : 0.5,
      ease: EASE,
      onUpdate: (v) => {
        shownRef.current = v;
        setShown(v);
      },
      onComplete: () => {
        shownRef.current = target;
        setShown(target);
      },
    });
    // Any click or key press jumps to the end.
    const off = () => {
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
    function skip() {
      ctl.stop();
      shownRef.current = target;
      setShown(target);
      off();
    }
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      ctl.stop();
      off();
    };
  }, [target, reduce]);

  const ticks = coverageTicks(coverage ?? { ran: 0, total: 14, missingImportant: [] });
  const delta =
    track.from !== null && track.from !== target
      ? { label: deltaLabel(track.from, target), announcement: deltaAnnouncement(track.from, target) }
      : null;

  return (
    <RingView
      value={reduce ? target : shown}
      score={target}
      level={level}
      ticks={coverage ? ticks : []}
      staggerTicks={!reduce}
      delta={delta}
      chipKey={target}
    />
  );
}
