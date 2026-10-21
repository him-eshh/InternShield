"use client";
import { useState } from "react";
import { autofill } from "@/lib/autofill";
import { EXAMPLES } from "@/lib/examples";
import { TIER_FLAGS } from "@/lib/tiers/flags";
import { MAX_MESSAGE_CHARS, type Source, type Stage } from "@/lib/types";
import ScreenshotUpload from "./tiers/ScreenshotUpload";
import { btnPrimary, linkClass, pillOff, pillOn } from "./ui";

export interface CheckSubmit {
  text: string;
  form: { sender: string | null; company: string | null };
  source: Source | null;
  stage: Stage | null;
  exampleId: "scam" | "real" | null;
}

const SOURCES: { value: Source; label: string }[] = [
  { value: "company_site", label: "Applied on the company site" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "handshake", label: "Handshake" },
  { value: "email", label: "Email" },
  { value: "text_whatsapp", label: "Surprise text or WhatsApp" },
];
const STAGES: { value: Stage; label: string }[] = [
  { value: "message", label: "Just got a message" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Got an offer" },
  { value: "signed", label: "Signed an offer letter" },
];

type Tracked = "sender" | "company";

function FilledTag({ label }: { label: string }) {
  return <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[12px] font-medium text-accent">{label}</span>;
}

export default function CheckForm({ initial, onSubmit }: { initial: CheckSubmit | null; onSubmit: (s: CheckSubmit) => void }) {
  const [text, setText] = useState(initial?.text ?? "");
  const [sender, setSender] = useState(initial?.form.sender ?? "");
  const [company, setCompany] = useState(initial?.form.company ?? "");
  const [source, setSource] = useState<Source | null>(initial?.source ?? null);
  const [stage, setStage] = useState<Stage | null>(initial?.stage ?? null);
  const [filled, setFilled] = useState<Record<Tracked, boolean>>({ sender: false, company: false });
  const [example, setExample] = useState<"scam" | "real" | null>(null);
  const [trimmed, setTrimmed] = useState(false);
  const [fromShot, setFromShot] = useState(false);
  // Fields the user typed in themselves: auto-fill never overwrites these.
  const [touched, setTouched] = useState<Record<Tracked | "source" | "stage", boolean>>({
    sender: !!initial?.form.sender,
    company: !!initial?.form.company,
    source: !!initial?.source,
    stage: !!initial?.stage,
  });

  function onTextChange(raw: string, screenshot = false) {
    setFromShot(screenshot);
    const over = raw.length > MAX_MESSAGE_CHARS;
    const next = over ? raw.slice(0, MAX_MESSAGE_CHARS) : raw;
    setTrimmed(over);
    setText(next);
    setExample(null);
    const g = autofill(next);
    const f = { ...filled };
    if (!touched.sender) {
      setSender(g.sender ?? "");
      f.sender = !!g.sender;
    }
    if (!touched.company) {
      setCompany(g.company ?? "");
      f.company = !!g.company;
    }
    if (!touched.source) setSource(g.source);
    if (!touched.stage) setStage(g.stage);
    setFilled(f);
  }

  function submit() {
    if (!text.trim()) return;
    onSubmit({
      text,
      form: { sender: sender.trim() || null, company: company.trim() || null },
      source,
      stage,
      exampleId: example,
    });
  }

  function tryExample(id: "scam" | "real") {
    const ex = EXAMPLES[id];
    setText(ex.text);
    setSender(ex.form.sender);
    setCompany(ex.form.company);
    setSource(ex.source);
    setStage(ex.stage);
    setExample(id);
    setTrimmed(false);
    setFromShot(false);
    onSubmit({ text: ex.text, form: { sender: ex.form.sender, company: ex.form.company }, source: ex.source, stage: ex.stage, exampleId: id });
  }

  const inputCls = "mt-1.5 min-h-12 w-full rounded-[14px] border border-border bg-card px-4 text-[17px] placeholder:text-muted";
  const noSender = text.trim().length > 0 && !sender.trim();

  return (
    <section className="mx-auto max-w-[640px] px-6 py-10 sm:py-16">
      <h1 className="text-[clamp(36px,6vw,72px)] font-bold leading-[1.05] tracking-[-0.025em]">Is this offer real?</h1>
      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <label htmlFor="message" className="flex items-center text-[15px] font-medium">
            The message
            {example && <FilledTag label="Example" />}
            {fromShot && !example && <FilledTag label="from screenshot, check it" />}
          </label>
          {TIER_FLAGS.screenshot && (
            <ScreenshotUpload
              onText={(t) => {
                onTextChange(t, true);
              }}
            />
          )}
        </div>
        <textarea
          id="message"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Paste the whole message here"
          rows={8}
          className="mt-1.5 w-full resize-y rounded-[18px] border border-border bg-card p-5 text-[17px] leading-relaxed placeholder:text-muted [field-sizing:content] min-h-48 max-h-[60dvh]"
        />
        {trimmed && (
          <p role="status" className="mt-2 text-[14px] text-muted">
            That message was longer than {MAX_MESSAGE_CHARS.toLocaleString()} characters, so we kept the first {MAX_MESSAGE_CHARS.toLocaleString()}.
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sender" className="flex items-center text-[15px] font-medium">
              Sender&apos;s email or phone
              {filled.sender && !touched.sender && <FilledTag label="filled from message" />}
            </label>
            <input
              id="sender"
              value={sender}
              onChange={(e) => {
                setSender(e.target.value);
                setTouched((t) => ({ ...t, sender: true }));
                setFilled((f) => ({ ...f, sender: false }));
              }}
              placeholder="name@company.com"
              aria-describedby={noSender ? "sender-hint" : undefined}
              className={inputCls}
            />
            {noSender && (
              <p id="sender-hint" className="mt-1.5 text-[14px] text-muted">
                We couldn&apos;t find it. Add it if you have it.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="company" className="flex items-center text-[15px] font-medium">
              Company
              {filled.company && !touched.company && <FilledTag label="filled from message" />}
            </label>
            <input
              id="company"
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setTouched((t) => ({ ...t, company: true }));
                setFilled((f) => ({ ...f, company: false }));
              }}
              placeholder="Company name"
              className={inputCls}
            />
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="text-[15px] font-medium">Where did it come from? <span className="font-normal text-muted">(optional)</span></legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={source === s.value}
                className={source === s.value ? pillOn : pillOff}
                onClick={() => {
                  setSource(source === s.value ? null : s.value);
                  setTouched((t) => ({ ...t, source: true }));
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-6">
          <legend className="text-[15px] font-medium">Where are you with them? <span className="font-normal text-muted">(optional)</span></legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={stage === s.value}
                className={stage === s.value ? pillOn : pillOff}
                onClick={() => {
                  setStage(stage === s.value ? null : s.value);
                  setTouched((t) => ({ ...t, stage: true }));
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-10 flex flex-col items-center gap-4">
          <button type="submit" className={`${btnPrimary} w-full sm:w-auto sm:min-w-56`} disabled={!text.trim()} aria-describedby={text.trim() ? undefined : "check-hint"}>
            Check it
          </button>
          {!text.trim() && (
            <p id="check-hint" className="-mt-2 text-[14px] text-muted">
              Paste a message to check it.
            </p>
          )}
          <p className="text-[15px] text-muted">
            Try an example:{" "}
            <button type="button" className={linkClass} onClick={() => tryExample("scam")}>
              a scam
            </button>
            {" · "}
            <button type="button" className={linkClass} onClick={() => tryExample("real")}>
              a real one
            </button>
          </p>
        </div>
      </form>
    </section>
  );
}
