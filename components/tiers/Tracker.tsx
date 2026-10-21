"use client";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { addCard, loadCards, moveCard, removeCard, saveCards, updateNotes } from "@/lib/tiers/tracker";
import { TRACKER_COLUMNS, type TrackerCard } from "@/lib/tiers/types";
import type { RiskLevel } from "@/lib/types";
import { ArrowLeftIcon, ExternalIcon } from "../icons";
import { btnPrimary, card as cardCls, linkClass } from "../ui";

const RISK: Record<RiskLevel, { label: string; cls: string }> = {
  low: { label: "Low risk", cls: "border-good/40 text-good" },
  medium: { label: "Medium risk", cls: "border-warn/40 text-warn" },
  high: { label: "High risk", cls: "border-bad/40 text-bad" },
};

const small =
  "inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 text-[14px] font-medium transition-colors duration-200 hover:bg-bg-soft disabled:opacity-40";
const fieldCls = "mt-1.5 min-h-12 w-full rounded-[14px] border border-border bg-card px-4 text-[17px] placeholder:text-muted";

function isHttp(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function Tracker({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState<TrackerCard[]>([]);
  const [ready, setReady] = useState(false);
  const [announce, setAnnounceRaw] = useState("");
  const notesRef = useRef<HTMLTextAreaElement>(null);
  // Clear first, then set next frame, so an identical message is announced again.
  const setAnnounce = (msg: string) => {
    setAnnounceRaw("");
    requestAnimationFrame(() => setAnnounceRaw(msg));
  };
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [link, setLink] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const refocus = useRef<string | null>(null);

  useEffect(() => {
    // Storage is only readable in the browser, so load after mount.
    /* eslint-disable react-hooks/set-state-in-effect -- read browser storage once after mount */
    setCards(loadCards());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (editing) notesRef.current?.focus();
  }, [editing]);

  // After a move the card re-mounts in another column; put focus back on it.
  useEffect(() => {
    if (!refocus.current) return;
    document.getElementById(`card-${refocus.current}`)?.focus();
    refocus.current = null;
  }, [cards]);

  function commit(next: TrackerCard[]) {
    setCards(next);
    saveCards(next);
  }

  function move(c: TrackerCard, dir: -1 | 1) {
    const idx = TRACKER_COLUMNS.findIndex((col) => col.id === c.column) + dir;
    const target = TRACKER_COLUMNS[idx];
    if (!target) return;
    refocus.current = c.id;
    commit(moveCard(cards, c.id, dir));
    setAnnounce(`Moved ${c.company} to ${target.label}`);
  }

  function onKey(e: KeyboardEvent<HTMLElement>, c: TrackerCard) {
    if (e.target !== e.currentTarget) return; // only when the card itself is focused
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(c, -1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      move(c, 1);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const co = company.trim();
    const ro = role.trim();
    const li = link.trim();
    if (!co || !ro) return setFormError("Add a company and a role.");
    if (li && !isHttp(li)) return setFormError("The link should start with http:// or https://.");
    commit(addCard(cards, { company: co, role: ro, link: li || null, risk: null }));
    setCompany("");
    setRole("");
    setLink("");
    setFormError(null);
    setAnnounce(`Added ${co}`);
  }

  return (
    <section className="mx-auto max-w-[1040px] px-6 py-10 sm:py-16">
      <button type="button" onClick={onBack} className={`${linkClass} inline-flex min-h-10 items-center gap-1.5 text-[15px]`}>
        <ArrowLeftIcon size={16} /> Back
      </button>
      <h1 className="mt-4 text-[clamp(30px,5vw,48px)] font-bold leading-[1.1] tracking-[-0.025em]">My applications</h1>
      <p className="mt-2 max-w-[560px] text-[17px] text-muted">Kept in this browser only. Use the buttons on a card, or the arrow keys, to move it along.</p>

      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
      <p id="card-hint" className="sr-only">
        Use left and right arrow keys to move this card.
      </p>

      {ready && cards.length === 0 && (
        <p className={`${cardCls} mt-8 p-6 text-[17px] text-muted`}>
          Nothing here yet. Save a checked offer from its report, or add one below.
        </p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {TRACKER_COLUMNS.map((col, ci) => {
          const items = cards.filter((c) => c.column === col.id);
          return (
            <section key={col.id} aria-labelledby={`col-${col.id}`} className="min-w-0">
              <h2 id={`col-${col.id}`} className="flex items-baseline gap-2 text-[17px] font-semibold">
                {col.label}
                <span className="text-[15px] font-normal text-muted">
                  <span className="sr-only">, </span>
                  {items.length}
                  <span className="sr-only"> {items.length === 1 ? "application" : "applications"}</span>
                </span>
              </h2>
              <ul className="mt-3 space-y-3">
                {items.map((c) => {
                  const prev = TRACKER_COLUMNS[ci - 1];
                  const next = TRACKER_COLUMNS[ci + 1];
                  const risk = c.risk ? RISK[c.risk] : null;
                  return (
                    <li
                      key={c.id}
                      id={`card-${c.id}`}
                      tabIndex={0}
                      onKeyDown={(e) => onKey(e, c)}
                      aria-describedby="card-hint"
                      className={`${cardCls} animate-enter p-4 outline-offset-2`}
                    >
                      <p className="break-words text-[17px] font-semibold leading-snug">{c.company}</p>
                      <p className="break-words text-[15px] text-muted">{c.role}</p>
                      {risk && (
                        <p className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[13px] font-medium ${risk.cls}`}>{risk.label}</p>
                      )}
                      {c.link && (
                        <p className="mt-2 break-all text-[14px]">
                          <a href={c.link} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1`}>
                            {c.link.replace(/^https?:\/\//, "")}
                            <ExternalIcon size={13} />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                        </p>
                      )}
                      {editing === c.id ? (
                        <div className="mt-3">
                          <label htmlFor={`notes-${c.id}`} className="text-[14px] font-medium">
                            Notes
                          </label>
                          <textarea
                            id={`notes-${c.id}`}
                            value={draft}
                            maxLength={500}
                            rows={3}
                            ref={notesRef}
                            onChange={(e) => setDraft(e.target.value)}
                            className="mt-1 w-full rounded-[14px] border border-border bg-card p-3 text-[15px]"
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              className={small}
                              onClick={() => {
                                commit(updateNotes(cards, c.id, draft.trim()));
                                setEditing(null);
                              }}
                            >
                              Save
                            </button>
                            <button type="button" className={small} onClick={() => setEditing(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        c.notes && <p className="mt-3 whitespace-pre-wrap break-words text-[15px]">{c.notes}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {prev && (
                          <button type="button" className={small} onClick={() => move(c, -1)}>
                            Move to {prev.label}
                          </button>
                        )}
                        {next && (
                          <button type="button" className={small} onClick={() => move(c, 1)}>
                            Move to {next.label}
                          </button>
                        )}
                        {editing !== c.id && (
                          <button
                            type="button"
                            className={small}
                            onClick={() => {
                              setDraft(c.notes);
                              setEditing(c.id);
                            }}
                          >
                            Edit notes
                          </button>
                        )}
                        {confirming === c.id ? (
                          <span role="group" aria-label={`Delete ${c.company}?`} className="flex flex-wrap items-center gap-2 text-[14px]">
                            Delete this?
                            <button
                              type="button"
                              className={`${small} border-accent text-accent`}
                              onClick={() => {
                                commit(removeCard(cards, c.id));
                                setConfirming(null);
                                setAnnounce(`Deleted ${c.company}`);
                              }}
                            >
                              Delete
                            </button>
                            <button type="button" className={small} onClick={() => setConfirming(null)}>
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button type="button" className={small} onClick={() => setConfirming(c.id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {items.length === 0 && <p className="mt-3 text-[15px] text-muted">None yet.</p>}
            </section>
          );
        })}
      </div>

      <form onSubmit={submit} className={`${cardCls} mt-10 max-w-[640px] p-5 sm:p-6`} noValidate>
        <h2 className="text-[20px] font-semibold">Add an application</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="t-company" className="text-[15px] font-medium">Company</label>
            <input id="t-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} className={fieldCls} required aria-required="true" />
          </div>
          <div>
            <label htmlFor="t-role" className="text-[15px] font-medium">Role</label>
            <input id="t-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} className={fieldCls} required aria-required="true" />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="t-link" className="text-[15px] font-medium">
            Link <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="t-link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={fieldCls} aria-describedby={formError ? "t-error" : undefined} />
        </div>
        {formError && (
          <p id="t-error" role="alert" className="mt-3 text-[15px] font-medium">
            {formError}
          </p>
        )}
        <button type="submit" className={`${btnPrimary} mt-5`}>
          Add application
        </button>
      </form>
    </section>
  );
}
