"use client";
import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { addCard, loadCards, moveCard, removeCard, saveCards, updateDescription, updateNotes } from "@/lib/tiers/tracker";
import { MAX_JOB_CHARS, TRACKER_COLUMNS, type TrackerCard, type TrackerColumn } from "@/lib/tiers/types";
import { LEVEL_LABELS, type RiskLevel } from "@/lib/types";
import { CircleAlert, CircleCheck, TriangleAlert, SquareKanban } from "lucide-react";
import { EmptyIllustration } from "../illustrations";
import { ArrowLeftIcon, ExternalIcon } from "../icons";
import { btnPrimary, card as cardCls, chip, fieldInput, linkClass } from "../ui";

// Same wording as the report, so a card never contradicts it.
const RISK: Record<RiskLevel, { label: string; cls: string }> = {
  low: { label: LEVEL_LABELS.low, cls: "border-good/40 text-good" },
  medium: { label: LEVEL_LABELS.medium, cls: "border-warn/40 text-warn" },
  high: { label: LEVEL_LABELS.high, cls: "border-bad/40 text-bad" },
};

const EMPTY: Record<string, string> = {
  saved: "Jobs you want to look at later land here.",
  applied: "Move a job here after you send your application.",
  interviewing: "Got an interview? Move it here to practice for it.",
  interviewed: "Finished an interview? Keep the application here while you wait.",
};

/** Display fallback only; never stored. */
const nameOf = (c: TrackerCard) => c.company.trim() || "Untitled application";

const small =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-card px-3.5 text-[14px] font-medium transition-colors duration-200 hover:bg-bg-soft disabled:opacity-40";
const menuItem = "min-h-11 rounded-[10px] px-3 text-left text-[15px] hover:bg-bg-soft";
const fieldCls = `${fieldInput} mt-1.5`;

function isHttp(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function Tracker({
  onBack,
  onPractice,
  onTailor,
  initialCards,
}: {
  onBack: () => void;
  onPractice?: (card: TrackerCard) => void;
  onTailor?: (card: TrackerCard) => void;
  /** Seed cards (used by render tests); the saved cards replace them after mount. */
  initialCards?: TrackerCard[];
}) {
  const [cards, setCards] = useState<TrackerCard[]>(initialCards ?? []);
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
  const [undo, setUndo] = useState<{ card: TrackerCard; index: number } | null>(null);
  const [holdUndo, setHoldUndo] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const refocus = useRef<string | null>(null);
  const dragging = useRef<string | null>(null);

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

  useEffect(() => {
    if (!undo || holdUndo) return;
    const timer = window.setTimeout(() => setUndo(null), 6000);
    return () => window.clearTimeout(timer);
  }, [undo, holdUndo]);

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
    setAnnounce(`Moved ${nameOf(c)} to ${target.label}`);
  }

  function setStatus(c: TrackerCard, column: TrackerColumn) {
    if (c.column === column) return;
    refocus.current = c.id;
    commit(cards.map((item) => item.id === c.id ? { ...item, column } : item));
    setAnnounce(`Moved ${nameOf(c)} to ${TRACKER_COLUMNS.find((item) => item.id === column)?.label ?? column}`);
  }

  function drop(e: DragEvent<HTMLElement>, column: TrackerColumn) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragging.current;
    const card = cards.find((item) => item.id === id);
    if (card) setStatus(card, column);
    dragging.current = null;
  }

  function remove(c: TrackerCard) {
    setUndo({ card: c, index: cards.findIndex((x) => x.id === c.id) });
    commit(removeCard(cards, c.id));
    setAnnounce(`Deleted ${nameOf(c)}`);
  }

  function undoDelete() {
    if (!undo) return;
    const next = [...cards];
    next.splice(undo.index, 0, undo.card);
    commit(next);
    setAnnounce(`Restored ${nameOf(undo.card)}`);
    setUndo(null);
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
    setAdded(null);
    const co = company.trim();
    const ro = role.trim();
    const li = link.trim();
    if (!co) return setFormError("Add the company name.");
    if (li && !isHttp(li)) return setFormError("The link should start with http:// or https://.");
    const next = addCard(cards, { company: co, role: ro, link: li || null, risk: null, description });
    if (next.length === cards.length) return setFormError("That one is already in your tracker.");
    commit(next);
    setCompany("");
    setRole("");
    setLink("");
    setDescription("");
    setFormError(null);
    setAdded(`Added ${co}`);
  }

  return (
    <section className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 sm:py-12">
      <button type="button" onClick={onBack} className={`${linkClass} inline-flex min-h-11 items-center gap-1.5 text-[15px]`}>
        <ArrowLeftIcon size={16} /> Back
      </button>
      <h1 className="mt-4 font-display text-[clamp(30px,5vw,48px)] font-bold leading-[1.1] tracking-[-0.025em]">Your application notebook</h1>
      <p className="mt-2 max-w-[560px] text-[17px] text-fg-2">Keep each next step in view. Saved on this device.</p>

      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
      <p id="card-hint" className="sr-only">
        Use left and right arrow keys to move this card.
      </p>

      {ready && cards.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-4 border-l-4 border-ink bg-paper-2 p-6 text-center sm:flex-row sm:text-left">
          <EmptyIllustration size={144} />
          <div>
            <h2 className="font-display text-[24px] font-bold">Your next move starts here</h2>
            <p className="mt-1 max-w-[42ch] text-[16px] text-fg-2">Nothing tracked yet. Save a job from Check or add one to remember your next move.</p>
            <a href="#add-application" className={`${linkClass} mt-2 inline-flex min-h-11 items-center font-semibold`}>Add an application</a>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {TRACKER_COLUMNS.map((col, ci) => {
          const items = cards.filter((c) => c.column === col.id);
          return (
            <section key={col.id} aria-labelledby={`col-${col.id}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => drop(e, col.id)} className="min-w-0 border-l border-rule bg-paper-2/30 px-3 pb-3">
              <h2 id={`col-${col.id}`} className="flex items-center gap-2 font-display text-[18px] font-bold">
                <SquareKanban size={18} strokeWidth={1.75} aria-hidden="true" className="text-ink-strong" />
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
                      draggable
                      onDragStart={(e) => {
                        dragging.current = c.id;
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", c.id);
                      }}
                      onDragEnd={() => { dragging.current = null; }}
                      onKeyDown={(e) => onKey(e, c)}
                      aria-describedby="card-hint"
                      className={`${cardCls} animate-enter border-l-2 border-l-ink p-4 outline-offset-2 transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-[var(--shadow-2)]`}
                    >
                      <p className="break-words text-[17px] font-semibold leading-snug">{nameOf(c)}</p>
                      {c.role.trim() && <p className="break-words text-[15px] text-muted">{c.role}</p>}
                      <p className={`${chip} mt-2 bg-ink-tint text-ink-strong`}>{col.label}</p>
                      <label className="mt-3 block text-[13px] font-medium text-fg-2" htmlFor={`status-${c.id}`}>Application status</label>
                      <select id={`status-${c.id}`} aria-label={`Status for ${nameOf(c)}`} value={c.column} onChange={(e) => setStatus(c, e.target.value as TrackerColumn)} className="mt-1 min-h-11 w-full rounded-[6px] border border-border-strong bg-paper-2 px-3 text-[15px]">{TRACKER_COLUMNS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
                      {risk && (
                        <p className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[13px] font-medium ${risk.cls}`}>
                          {c.risk === "high" ? <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" /> : c.risk === "medium" ? <TriangleAlert size={14} strokeWidth={1.75} aria-hidden="true" /> : <CircleCheck size={14} strokeWidth={1.75} aria-hidden="true" />}
                          {risk.label}
                        </p>
                      )}
                      {c.link && (
                        <p className="mt-2 break-all text-[14px]">
                          <a href={c.link} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex min-h-11 items-center gap-1`}>
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
                      {editingDescription === c.id ? (
                        <div className="mt-3">
                          <label htmlFor={`posting-${c.id}`} className="text-[14px] font-medium">Job posting</label>
                          <p id={`posting-help-${c.id}`} className="mt-1 text-[13px] text-muted">Paste the posting so Tailor and Practice can use the exact role details.</p>
                          <textarea id={`posting-${c.id}`} value={descriptionDraft} maxLength={MAX_JOB_CHARS} rows={5} aria-describedby={`posting-help-${c.id}`} onChange={(e) => setDescriptionDraft(e.target.value)} className="mt-1 w-full rounded-[14px] border border-border bg-card p-3 text-[15px]" />
                          <div className="mt-2 flex gap-2">
                            <button type="button" className={small} onClick={() => { commit(updateDescription(cards, c.id, descriptionDraft)); setEditingDescription(null); }}>Save posting</button>
                            <button type="button" className={small} onClick={() => setEditingDescription(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : c.description ? (
                        <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-[14px] text-fg-2">Job posting saved: {c.description}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {next && (
                          <button type="button" className={small} onClick={() => move(c, 1)}>
                            Move to {next.label}
                            <span aria-hidden="true" className="ml-1.5">→</span>
                          </button>
                        )}
                        <details className="relative">
                          <summary
                            aria-label={`More actions for ${nameOf(c)}`}
                            className={`${small} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
                          >
                            <span aria-hidden="true">…</span>
                          </summary>
                          <div className="absolute left-0 z-10 mt-1 flex w-52 flex-col gap-1 rounded-[14px] border border-border bg-card p-2 shadow-lg">
                            {prev && (
                              <button type="button" className={menuItem} onClick={() => move(c, -1)}>
                                Move to {prev.label}
                              </button>
                            )}
                            {onTailor && (
                              <button type="button" className={`${menuItem} text-accent`} onClick={() => onTailor(c)}>
                                Tailor resume
                              </button>
                            )}
                            {onPractice && (
                              <button type="button" className={`${menuItem} text-accent`} onClick={() => onPractice(c)}>
                                Practice interview
                              </button>
                            )}
                            {editingDescription !== c.id && (
                              <button type="button" className={menuItem} onClick={() => { setDescriptionDraft(c.description ?? ""); setEditingDescription(c.id); }}>
                                {c.description ? "Edit job posting" : "Add job posting"}
                              </button>
                            )}
                            {editing !== c.id && (
                              <button
                                type="button"
                                className={menuItem}
                                onClick={() => {
                                  setDraft(c.notes);
                                  setEditing(c.id);
                                }}
                              >
                                Edit notes
                              </button>
                            )}
                            <button type="button" className={menuItem} onClick={() => remove(c)}>
                              Delete
                            </button>
                          </div>
                        </details>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {items.length === 0 && (
                <div className="mt-3 min-h-28 border border-dashed border-rule p-4 text-[15px] text-fg-2"><p>{EMPTY[col.id]}</p><p className="mt-2 font-mono text-xs">A clear space for the next step.</p></div>
              )}
            </section>
          );
        })}
      </div>

      {undo && (
        <div role="status" onMouseEnter={() => setHoldUndo(true)} onMouseLeave={() => setHoldUndo(false)} onFocusCapture={() => setHoldUndo(true)} onBlurCapture={() => setHoldUndo(false)} className="shell-tracker-toast animate-enter fixed bottom-[calc(var(--nav-bottom)+1rem)] left-1/2 z-20 flex w-max -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-[6px] border border-rule bg-paper-2 px-5 py-2 shadow-lg">
          <span className="min-w-0 break-words text-[15px]">Deleted {nameOf(undo.card)}</span>
          <button type="button" onClick={undoDelete} className={`${linkClass} min-h-11 text-[15px] font-semibold`}>
            Undo
          </button>
          <button type="button" onClick={() => setUndo(null)} aria-label="Dismiss" className="min-h-11 min-w-11 px-1 text-muted">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      <form id="add-application" onSubmit={submit} className="mt-10 max-w-[640px] border-t-2 border-ink bg-paper-2 p-5 sm:p-6" noValidate>
        <h2 className="text-[20px] font-semibold">Add an application</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="t-company" className="text-[15px] font-medium">Company</label>
            <input id="t-company" value={company} onChange={(e) => {
                setCompany(e.target.value);
                setAdded(null);
              }}
              maxLength={120} className={fieldCls} required aria-required="true" />
          </div>
          <div>
            <label htmlFor="t-role" className="text-[15px] font-medium">Role <span className="font-normal text-muted">(optional)</span></label>
            <input id="t-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} className={fieldCls} />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="t-link" className="text-[15px] font-medium">
            Link <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="t-link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={fieldCls} aria-describedby={formError ? "t-error" : undefined} />
        </div>
        <div className="mt-4">
          <label htmlFor="t-posting" className="text-[15px] font-medium">Job posting <span className="font-normal text-muted">(optional)</span></label>
          <p id="t-posting-help" className="mt-1 text-[13px] text-muted">Paste the posting to carry its details into Tailor and Practice.</p>
          <textarea id="t-posting" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={MAX_JOB_CHARS} rows={5} aria-describedby="t-posting-help" className={fieldCls} />
        </div>
        {formError && (
          <p id="t-error" role="alert" className="mt-3 text-[15px] font-medium">
            {formError}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="submit" className={btnPrimary}>
            Add application
          </button>
          <p role="status" className={added ? "animate-enter text-[15px]" : "sr-only"}>
            {added}
          </p>
        </div>
      </form>
    </section>
  );
}
