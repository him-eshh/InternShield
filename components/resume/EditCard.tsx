"use client";
import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { wordDiff } from "@/lib/tiers/resumeGuard";
import type { ResumeEdit } from "@/lib/tiers/resumeTypes";

export function EditCard({ edit, onStatus, onEdit }: { edit: ResumeEdit; onStatus: (id: string, status: ResumeEdit["status"]) => void; onEdit: (id: string, text: string) => Promise<string | null> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(edit.proposed);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  async function save() {
    setChecking(true);
    const message = await onEdit(edit.id, draft);
    setError(message ?? ""); setChecking(false);
    if (!message) setEditing(false);
  }
  const action = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium hover:bg-tool-tint disabled:opacity-40";
  return <article className={`rounded-2xl border bg-surface p-5 ${edit.status === "accepted" ? "border-tool" : "border-border"}`} aria-label={`Suggested edit in ${edit.section || "resume"}`}>
    <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wide text-fg-2"><span>{edit.section || "Resume"}</span><span>{edit.status}</span></div>
    <p className="mt-3 text-sm leading-relaxed text-fg-2"><span className="sr-only">Before: </span>{edit.original}</p>
    {editing ? <div className="mt-3"><label className="text-sm font-medium" htmlFor={`draft-${edit.id}`}>Your wording</label><textarea id={`draft-${edit.id}`} rows={4} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => void save()} className="mt-1 w-full rounded-lg border border-border-strong bg-surface p-3 text-sm" aria-describedby={error ? `error-${edit.id}` : undefined} aria-invalid={!!error} />{checking && <p role="status" className="text-sm">Checking your wording</p>}{error && <p role="alert" id={`error-${edit.id}`} className="mt-2 text-sm">{error}</p>}</div> : <p className="mt-3 text-sm leading-relaxed" aria-label="Suggested wording">{wordDiff(edit.original, edit.proposed).map((part, i) => part.kind === "removed" ? <del key={i} className="text-fg-3">{part.text}</del> : part.kind === "added" ? <ins key={i} className="rounded bg-tool-tint text-tool-strong no-underline">{part.text}</ins> : <span key={i}>{part.text}</span>)}</p>}
    <p className="mt-3 text-xs text-fg-2">{edit.reason}</p>
    {edit.keywords.length > 0 && <p className="mt-2 text-xs text-tool-strong">Keywords: {edit.keywords.join(", ")}</p>}
    <div className="mt-4 flex flex-wrap gap-1 border-t border-border pt-2">
      <button type="button" className={`${action} text-tool-strong`} aria-pressed={edit.status === "accepted"} disabled={editing || checking} onClick={() => onStatus(edit.id, edit.status === "accepted" ? "pending" : "accepted")}><Check size={16} strokeWidth={1.75} />{edit.status === "accepted" ? "Accepted" : "Accept"}</button>
      <button type="button" className={action} aria-pressed={edit.status === "rejected"} onClick={() => onStatus(edit.id, edit.status === "rejected" ? "pending" : "rejected")}><X size={16} strokeWidth={1.75} />{edit.status === "rejected" ? "Rejected" : "Reject"}</button>
      <button type="button" className={action} onClick={() => { setDraft(edit.proposed); setError(""); setEditing(!editing); }}><Pencil size={15} strokeWidth={1.75} />{editing ? "Cancel edit" : "Edit"}</button>
    </div>
  </article>;
}
