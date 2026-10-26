"use client";
import { SlidersHorizontal } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import MotionToggle from "../MotionToggle";

/** One nav menu for Theme and Motion, so the header has a single display control. */
export default function DisplayMenu() {
  return (
    <details className="group relative inline-block">
      <summary aria-label="Display: theme and motion" title="Display" className="inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-border-strong bg-paper-2 px-3 text-fg [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span className="hidden text-sm xl:inline">Display</span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-52 rounded-[6px] border border-rule bg-paper-2 p-2 shadow-[var(--shadow-2)]">
        <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-fg-2">Theme</p>
        <ThemeToggle inline />
        <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-fg-2">Motion</p>
        <MotionToggle inline />
      </div>
    </details>
  );
}
