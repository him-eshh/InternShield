"use client";
import { useEffect, useRef } from "react";
import { Activity, ChevronDown, Monitor, Pause } from "lucide-react";
import { loadMotion, saveMotion } from "@/lib/client/storage";
import type { MotionPref } from "@/lib/types";
import { applyMotion, useMotionPref } from "./motion/motionPref";

const OPTIONS: { value: MotionPref; label: string; Icon: typeof Monitor }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "on", label: "On", Icon: Activity },
  { value: "reduced", label: "Reduced", Icon: Pause },
];

/** Motion setting: System follows the OS, On always animates, Reduced never does. Saved locally; the head script applies it before paint. */
export default function MotionToggle({ compact = false }: { compact?: boolean }) {
  const pref = useMotionPref();
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    applyMotion(loadMotion());
  }, []);

  function choose(v: MotionPref) {
    saveMotion(v);
    applyMotion(v);
    if (menu.current) menu.current.open = false;
  }

  const active = OPTIONS.find((o) => o.value === pref) ?? OPTIONS[0];
  const ActiveIcon = active.Icon;

  return (
    <details ref={menu} className="group relative inline-block">
      <summary aria-label={`Motion: ${active.label}. Choose animation setting`} className="inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-border-strong bg-paper-2 px-3 text-fg [&::-webkit-details-marker]:hidden">
        <ActiveIcon size={17} aria-hidden="true" />
        <span className={compact ? "hidden text-sm xl:inline" : "text-sm"}>Motion: {active.label}</span>
        <ChevronDown size={15} aria-hidden="true" className={`transition-transform group-open:rotate-180 ${compact ? "hidden xl:block" : ""}`} />
      </summary>
      <div role="group" aria-label="Motion" className="absolute right-0 z-50 mt-2 min-w-44 rounded-[6px] border border-rule bg-paper-2 p-2 shadow-[var(--shadow-2)]">
        {OPTIONS.map(({ value, label, Icon }) => (
          <button key={value} type="button" aria-pressed={pref === value} onClick={() => choose(value)} className={`flex min-h-11 w-full items-center gap-2 rounded-[4px] px-3 text-left text-sm hover:bg-bg-subtle ${pref === value ? "bg-ink-tint font-semibold text-ink-strong" : "text-fg"}`}>
            <Icon size={17} aria-hidden="true" />{label}
          </button>
        ))}
        <p className="px-3 pb-1 pt-2 text-xs text-fg-2">System follows your device. On plays animations even if your device asks for less.</p>
      </div>
    </details>
  );
}
