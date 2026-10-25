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
  const settled = edit.status !== "pending";

  async function save() {
    setChecking(true);
    const message = await onEdit(edit.id, draft);
    setError(message ?? ""); setChecking(false);
    if (!message) setEditing(false);
  }

  const action = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-tool-strong hover:bg-tool-tint disabled:opacity-40";
  const wording = <>
    <p className="mt-3 text-sm leading-relaxed text-fg-2"><span className="sr-only">Before: </span>{edit.original}</p>
    <p className="mt-3 text-sm leading-relaxed" aria-label="Suggested wording">{wordDiff(edit.original, edit.proposed).map((part, i) => part.kind === "removed" ? <del key={i} className="text-fg-3">{part.text}</del> : part.kind === "added" ? <ins key={i} className="bg-tool-tint text-tool-strong no-underline">{part.text}</ins> : <span key={i}>{part.text}</span>)}</p>
    <p className="mt-3 text-xs text-fg-2">{edit.reason}</p>
    {edit.keywords.length > 0 && <p className="mt-2 text-xs text-tool-strong">Keywords: {edit.keywords.join(", ")}</p>}
  </>;

  return <article tabIndex={0} data-edit-id={edit.id} data-line-id={edit.lineId} className={`border-l-4 bg-paper-2 px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 ${edit.status === "rejected" ? "border-rule" : "border-tool"}`} aria-label={`Suggested edit in ${edit.section || "resume"}`}>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="font-medium">{edit.section || "Resume"}</span><span className="text-fg-2">{edit.status === "pending" ? "Review this line" : edit.status === "accepted" ? "Accepted" : "Rejected"}</span></div>
    {settled && !editing ? <details className="mt-2"><summary className="min-h-11 cursor-pointer py-2 text-sm text-tool-strong">Review the wording</summary>{wording}</details> : editing ? <div className="mt-3"><label className="text-sm font-medium" htmlFor={`draft-${edit.id}`}>Your wording</label><textarea id={`draft-${edit.id}`} rows={4} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => void save()} className="mt-1 w-full rounded-[6px] border border-border-strong bg-paper-2 p-3 text-sm" aria-describedby={error ? `error-${edit.id}` : undefined} aria-invalid={!!error} />{checking && <p role="status" className="text-sm">Checking your wording</p>}{error && <p role="alert" id={`error-${edit.id}`} className="mt-2 text-sm">{error}</p>}</div> : wording}
    <div className="mt-4 flex flex-wrap gap-1 border-t border-rule pt-2">
      <button type="button" className={action} aria-pressed={edit.status === "accepted"} disabled={editing || checking} onClick={() => onStatus(edit.id, edit.status === "accepted" ? "pending" : "accepted")}><Check size={16} strokeWidth={1.75} aria-hidden="true" />{edit.status === "accepted" ? "Accepted" : "Accept"}</button>
      <button type="button" className={action} aria-pressed={edit.status === "rejected"} onClick={() => onStatus(edit.id, edit.status === "rejected" ? "pending" : "rejected")}><X size={16} strokeWidth={1.75} aria-hidden="true" />{edit.status === "rejected" ? "Rejected" : "Reject"}</button>
      <button type="button" className={action} onClick={() => { setDraft(edit.proposed); setError(""); setEditing(!editing); }}><Pencil size={15} strokeWidth={1.75} aria-hidden="true" />{editing ? "Cancel edit" : "Edit"}</button>
    </div>
  </article>;
}
