"use client";
import { useRef, useState } from "react";
import { postTranscribe } from "@/lib/tiers/client";
import { prepareStrips } from "@/lib/tiers/image";
import type { ApiErrorCode } from "@/lib/types";
import { Upload } from "lucide-react";

interface Props {
  onText: (text: string) => void;
  disabled?: boolean;
}

const DEFAULT_ERROR = "Couldn't read that screenshot. Try again or paste the text.";
const PARTIAL = "We read the top part of this screenshot. Check the text below and paste anything that's missing.";
const TOO_TALL = "This screenshot is very long. Upload it in two parts, or paste the text.";
const CANT_READ ="We couldn't read this screenshot. Paste the text instead.";

function failCopy(code: ApiErrorCode | undefined, retryAfter: number | undefined, message: string | undefined): string {
  switch (code) {
    case "RATE_LIMITED":
      return retryAfter
        ? `Screenshot reading is busy. Try again in ${retryAfter} seconds.`
        : "Screenshot reading is busy. Try again in a moment.";
    case "TOO_LARGE":
      return "That screenshot is too large. Try cropping it, or paste the text.";
    case "DAILY_CAP":
      return "Screenshot reading is done for today. Paste the text instead, or come back tomorrow.";
    case "MODEL_UNAVAILABLE":
    case "TRANSCRIBE_FAILED":
    case "TIMEOUT":
      return CANT_READ;
    case "BAD_INPUT":
      return message ?? "That doesn't look like a PNG, JPEG or WebP image. Try another screenshot.";
    default:
      return message ?? DEFAULT_ERROR;
  }
}

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
      const prepared = await prepareStrips(file);
      if (!prepared.ok) {
        setError(prepared.code === "TOO_TALL" ? TOO_TALL : failCopy(prepared.code, undefined, undefined));
        return;
      }
      const res = await postTranscribe(prepared.images);
      if (res.status === "done" && res.data.text.trim()) {
        onText(res.data.text);
        if (res.data.partial) setError(PARTIAL);
      } else if (res.status === "failed") setError(failCopy(res.code, res.retryAfter, res.message));
      else setError("No text found in that image.");
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
        className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-accent-fg underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Upload size={16} />
        Upload a screenshot
      </button>
      <span role="status" aria-live="polite" className={busy || error ? "mt-1 text-[14px] text-muted" : "sr-only"}>
        {busy ? "Reading screenshot…" : (error ?? "")}
      </span>
    </span>
  );
}
