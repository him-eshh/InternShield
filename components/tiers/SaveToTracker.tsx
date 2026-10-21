"use client";
import { useState } from "react";
import { addCard, loadCards, saveCards } from "@/lib/tiers/tracker";
import type { NewCard } from "@/lib/tiers/types";
import { CheckIcon } from "../icons";
import { btnSecondary, linkClass } from "../ui";

interface Props {
  card: NewCard;
  onOpen: () => void;
}

export default function SaveToTracker({ card, onOpen }: Props) {
  const [state, setState] = useState<"idle" | "saved" | "already">("idle");

  function save() {
    const before = loadCards();
    const after = addCard(before, card);
    if (after.length === before.length) {
      setState("already");
      return;
    }
    saveCards(after);
    setState("saved");
  }

  return (
    <div>
      {state === "idle" && (
        <button type="button" onClick={save} className={btnSecondary}>
          Save to tracker
        </button>
      )}
      <p role="status" className={state === "idle" ? "sr-only" : "animate-enter flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]"}>
        {state !== "idle" && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon size={16} className="text-accent" />
              {state === "saved" ? "Saved." : "Already in your tracker."}
            </span>
            <button type="button" onClick={onOpen} className={`${linkClass} min-h-10 font-medium`}>
              Open my applications
            </button>
          </>
        )}
      </p>
    </div>
  );
}
