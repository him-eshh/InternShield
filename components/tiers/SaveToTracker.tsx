"use client";
import { useRef, useState, type FormEvent } from "react";
import { addCard, loadCards, saveCards } from "@/lib/tiers/tracker";
import type { NewCard, TrackerCard } from "@/lib/tiers/types";
import { CheckIcon } from "../icons";
import { btnSecondary, linkClass } from "../ui";

interface Props {
  card: NewCard;
  onOpen: () => void;
}

const fieldCls = "mt-1.5 min-h-12 w-full rounded-[14px] border border-border bg-card px-4 text-[17px] placeholder:text-muted";
/** Company/role as the user confirmed them; a blank role stays blank (never a placeholder). */
export function addToTracker(before: TrackerCard[], company: string, role: string, base: NewCard): TrackerCard[] {
  return addCard(before, { ...base, company, role });
}

export default function SaveToTracker({ card, onOpen }: Props) {
  const [state, setState] = useState<"idle" | "form" | "saved" | "already">("idle");
  const [company, setCompany] = useState(card.company);
  const [role, setRole] = useState(card.role);
  const [error, setError] = useState<string | null>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function commit(co: string, ro: string) {
    const before = loadCards();
    const after = addToTracker(before, co, ro, card);
    if (after.length === before.length) {
      setState("already");
      return;
    }
    saveCards(after);
    setState("saved");
  }

  function onSave() {
    if (!card.company.trim()) {
      setCompany(card.company);
      setRole(card.role);
      setError(null);
      setState("form");
      return;
    }
    commit(card.company.trim(), card.role.trim());
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const co = company.trim();
    if (!co) {
      setError("Add the company name.");
      companyRef.current?.focus();
      return;
    }
    commit(co, role.trim());
  }

  function close() {
    setState("idle");
    triggerRef.current?.focus();
  }

  // Bug B: `contents` makes the trigger and the form flex items of the footer row; the form
  // and confirmation take `order-last basis-full` so they sit on their own left-aligned line
  // below every button instead of inside the centered row.
  return (
    <div className="contents">
      {(state === "idle" || state === "form") && (
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={state === "form"}
          aria-controls={state === "form" ? "st-form" : undefined}
          onClick={() => (state === "form" ? close() : onSave())}
          className={btnSecondary}
        >
          Save to tracker
        </button>
      )}
      {state === "form" && (
        <form
          id="st-form"
          onSubmit={submit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          noValidate
          className="animate-enter order-last mr-auto grid w-full max-w-[520px] basis-full gap-4 text-left"
          aria-label="Save to tracker"
        >
          <div>
            <label htmlFor="st-company" className="text-[15px] font-medium">
              Company
            </label>
            <input
              id="st-company"
              ref={companyRef}
              autoFocus
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              maxLength={120}
              required
              aria-required="true"
              aria-describedby={error ? "st-error" : undefined}
              className={fieldCls}
            />
          </div>
          <div>
            <label htmlFor="st-role" className="text-[15px] font-medium">
              Role <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="st-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} className={fieldCls} />
          </div>
          {error && (
            <p id="st-error" role="alert" className="text-[15px] font-medium">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={btnSecondary}>
              Save
            </button>
            <button type="button" onClick={close} className={btnSecondary}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <p role="status" className={state === "saved" || state === "already" ? "animate-enter order-last flex basis-full flex-wrap items-center gap-x-3 gap-y-1 text-left text-[15px]" : "sr-only"}>
        {(state === "saved" || state === "already") && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon size={16} className="text-accent" />
              {state === "saved" ? "Saved." : "Already in your tracker."}
            </span>
            {/* The Save button just unmounted: keep focus on the next step. */}
            <button type="button" autoFocus onClick={onOpen} className={`${linkClass} min-h-10 font-medium`}>
              Open my applications
            </button>
          </>
        )}
      </p>
    </div>
  );
}
