"use client";
import { useRef, useState } from "react";
import { postTranscribe } from "@/lib/tiers/client";
import { prepareImage } from "@/lib/tiers/image";
import { UploadIcon } from "../icons";

interface Props {
  onText: (text: string) => void;
  disabled?: boolean;
}

const DEFAULT_ERROR = "Couldn't read that screenshot. Try again or paste the text.";

export default function ScreenshotUpload({ onText, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (input.current) input.current.value = ""; // lets the same file be chosen again
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      if (!prepared.ok) {
        setError(prepared.message);
        return;
      }
      const res = await postTranscribe(prepared.dataUrl);
      if (res.status === "done" && res.data.text.trim()) onText(res.data.text);
      else setError(res.status === "failed" ? (res.message ?? DEFAULT_ERROR) : "No text found in that image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start sm:items-end">
      <input
        ref={input}
        id="screenshot-file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only peer"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled || busy}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
        className="inline-flex min-h-10 items-center gap-1.5 text-[15px] font-medium text-accent underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
      >
        <UploadIcon size={16} />
        Upload a screenshot
      </button>
      <span role="status" aria-live="polite" className={busy || error ? "mt-1 text-[14px] text-muted" : "sr-only"}>
        {busy ? "Reading screenshot…" : (error ?? "")}
      </span>
    </span>
  );
}
