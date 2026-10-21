"use client";
import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import { FIELD_LABELS, LEVEL_NAMES } from "./ProfileSteps";
import { ChevronIcon } from "./icons";

export default function ProfileChip({
  profile,
  onEdit,
  onClear,
  items,
}: {
  profile: Profile;
  onEdit: () => void;
  onClear: () => void;
  items?: { label: string; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const clearBtn = useRef<HTMLButtonElement>(null);
  const clearItem = useRef<HTMLButtonElement>(null);
  // Leaving the confirm returns focus to the menu item that opened it.
  const backToMenu = () => {
    setConfirming(false);
    requestAnimationFrame(() => clearItem.current?.focus());
  };

  useEffect(() => {
    if (confirming) clearBtn.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirming) {
          backToMenu();
        } else {
          setOpen(false);
          btn.current?.focus();
        }
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, confirming]);

  const item = "block w-full rounded-[10px] px-3 py-2.5 text-left text-[15px] hover:bg-bg-soft";
  return (
    <div ref={ref} className="relative">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        onClick={() => { setOpen(!open); setConfirming(false); }}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[15px] hover:bg-bg-soft"
      >
        {FIELD_LABELS[profile.field]} · {LEVEL_NAMES[profile.level]}
        <ChevronIcon size={14} />
      </button>
      {open && (
        <div className="animate-enter absolute right-0 z-20 mt-2 w-56 rounded-[14px] border border-border bg-card p-1.5 shadow-lg">
          {confirming ? (
            <div role="group" aria-labelledby="clear-confirm" className="p-1.5">
              <p id="clear-confirm" className="px-1.5 py-1 text-[15px]">Clear your profile, resume and saved items?</p>
              <div className="mt-2 flex gap-2">
                <button
                  ref={clearBtn}
                  type="button"
                  className="min-h-9 flex-1 rounded-full bg-accent px-3 text-[15px] font-medium text-accent-contrast hover:opacity-90"
                  onClick={() => { setOpen(false); setConfirming(false); onClear(); }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="min-h-9 flex-1 rounded-full border border-border px-3 text-[15px] hover:bg-bg-soft"
                  onClick={backToMenu}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {items?.map((it) => (
                <button key={it.label} type="button" className={item} onClick={() => { setOpen(false); it.onClick(); }}>
                  {it.label}
                </button>
              ))}
              <button type="button" className={item} onClick={() => { setOpen(false); onEdit(); }}>
                Edit my profile
              </button>
              <button ref={clearItem} type="button" className={`${item} text-text`} onClick={() => setConfirming(true)}>
                Clear my data
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
