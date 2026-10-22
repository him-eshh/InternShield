"use client";
import { useId, useRef, useState } from "react";

/** Editable company name. Saving re-runs only the company and posting lookups. */
export default function CompanyChip({ name, busy, note, onSave }: { name: string | null; busy: boolean; note: string | null; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name ?? "");
  const id = useId();
  const editBtn = useRef<HTMLButtonElement>(null);

  function close() {
    setEditing(false);
    requestAnimationFrame(() => editBtn.current?.focus());
  }

  if (editing) {
    return (
      <form
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.trim();
          if (!v) return;
          onSave(v);
          close();
        }}
      >
        <label htmlFor={id} className="text-[14px] text-muted">Company</label>
        <input
          id={id}
          autoFocus
          value={value}
          maxLength={80}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && close()}
          className="h-9 w-[min(16rem,60vw)] rounded-full border border-border-strong bg-bg px-3 text-[15px] text-text"
        />
        <button type="submit" className="h-9 rounded-full bg-accent px-4 text-[14px] font-medium text-white">Recheck</button>
        <button type="button" onClick={close} className="h-9 rounded-full px-3 text-[14px] text-muted hover:text-text">Cancel</button>
      </form>
    );
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-soft py-1 pl-3 pr-1 text-[14px]">
        <span className="text-muted">Company</span>
        <span className="font-medium text-text">{name ?? "Not found"}</span>
        <button
          ref={editBtn}
          type="button"
          disabled={busy}
          onClick={() => {
            setValue(name ?? "");
            setEditing(true);
          }}
          className="rounded-full px-2.5 py-0.5 text-accent hover:bg-accent/10 disabled:text-muted"
        >
          {busy ? "Checking…" : name ? "Edit" : "Add"}
          {!busy && <span className="sr-only"> company name</span>}
        </button>
      </span>
      <p role="status" aria-live="polite" className="text-[13px] text-muted">{note}</p>
    </div>
  );
}
