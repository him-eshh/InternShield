"use client";
import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import { FIELD_LABELS, LEVEL_NAMES } from "./ProfileSteps";
import { ChevronIcon } from "./icons";

export default function ProfileChip({ profile, onEdit, onClear }: { profile: Profile; onEdit: () => void; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "block w-full rounded-[10px] px-3 py-2.5 text-left text-[15px] hover:bg-bg-soft";
  return (
    <div ref={ref} className="relative">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[15px] hover:bg-bg-soft"
      >
        {FIELD_LABELS[profile.field]} · {LEVEL_NAMES[profile.level]}
        <ChevronIcon size={14} />
      </button>
      {open && (
        <div className="animate-enter absolute right-0 z-20 mt-2 w-56 rounded-[14px] border border-border bg-card p-1.5 shadow-lg">
          <button type="button" className={item} onClick={() => { setOpen(false); onEdit(); }}>
            Edit my profile
          </button>
          <button type="button" className={`${item} text-text`} onClick={() => { setOpen(false); onClear(); }}>
            Clear my data
          </button>
        </div>
      )}
    </div>
  );
}
