"use client";
import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { impactCopy, type AnswerImpact } from "@/lib/impact";
import ImpactCard from "./ImpactCard";
import { MAX_MESSAGE_CHARS } from "@/lib/types";
import ScreenshotUpload from "../tiers/ScreenshotUpload";
import { btnSecondary } from "../ui";

/** Keep additions next to their confirmation; the report and answered questions stay mounted. */
export default function AddInformation({ busy, note, onSave }: {
  busy: boolean; note: AnswerImpact | string | null; onSave: (text: string, sender: string) => void;
}) {
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [error, setError] = useState("");
  const field = "mt-2 min-h-11 w-full rounded-xl border border-border bg-card p-3 text-[16px]";
  return (
    <details className="rounded-[20px] border border-border bg-card p-5 shadow-[var(--shadow-1)]">
      <summary className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold"><MessageSquarePlus size={21} aria-hidden="true" />Add to this check</summary>
      <p className="mt-2 text-[15px] text-muted">Got another message or the sender&apos;s address? Check it alongside the original.</p>
      <form className="mt-4 space-y-4" aria-label="Add information" onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() && !sender.trim()) { setError("Add a message or sender first."); return; }
        setError(""); onSave(text.trim(), sender.trim());
      }}>
        <div><label htmlFor="additional-message">Another message</label>
          <textarea id="additional-message" value={text} maxLength={MAX_MESSAGE_CHARS} onChange={(e) => setText(e.target.value)} rows={4} className={field} placeholder="Paste the next message" />
          <ScreenshotUpload disabled={busy} onText={(value) => setText(value.slice(0, MAX_MESSAGE_CHARS))} />
        </div>
        <div><label htmlFor="additional-sender">Sender&apos;s email or phone</label><input id="additional-sender" value={sender} maxLength={200} onChange={(e) => setSender(e.target.value)} className={field} placeholder="name@company.com" /></div>
        <button type="submit" disabled={busy} className={btnSecondary}>{busy ? "Checking addition…" : "Update this check"}</button>
        {error && <p role="alert" className="text-[15px]">{error}</p>}
        <p role="status" aria-live="polite" className={typeof note === "string" || !note ? "whitespace-pre-line text-[15px] leading-relaxed text-muted" : "sr-only"}>{typeof note === "string" || !note ? note : impactCopy(note)}</p>
        {note && typeof note !== "string" && <div aria-hidden="true"><ImpactCard impact={note} /></div>}
      </form>
    </details>
  );
}
