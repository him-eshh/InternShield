"use client";
import { MessageSquareText, ChevronRight, ClipboardPaste, X } from "lucide-react";
import { useRef, useState } from "react";
import { autofill } from "@/lib/autofill";
import { EXAMPLES } from "@/lib/examples";
import { MAX_MESSAGE_CHARS, type Source, type Stage } from "@/lib/types";
import ScreenshotUpload from "./tiers/ScreenshotUpload";
import { btnPrimary, btnSecondary, linkClass, pillOff, pillOn } from "./ui";

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

const MIN_MESSAGE_CHARS = 20;

/** Inline hint for text that can't be checked yet; null when it can. */
export function messageIssue(text: string): string | null {
  const n = text.trim().length;
  if (n === 0) return "Paste a message to check.";
  if (n < MIN_MESSAGE_CHARS) return "That's too short. Paste the whole message.";
  return null;
}

function FilledTag({ label }: { label: string }) {
  return <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[12px] font-medium text-tool-strong">{label}</span>;
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
  const [hint, setHint] = useState<string | null>(null);
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  // Sender/Company stay hidden until autofill finds something or the user asks.
  const [showFields, setShowFields] = useState(!!(initial?.form.sender || initial?.form.company));
  const areaRef = useRef<HTMLTextAreaElement>(null);
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
    setHint(null);
    setClipboardError(null);
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
    if ((!touched.sender && g.sender) || (!touched.company && g.company)) setShowFields(true);
  }

  function submit() {
    const issue = messageIssue(text);
    if (issue) {
      setHint(issue);
      areaRef.current?.focus();
      return;
    }
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
    setHint(null);
    setShowFields(true);
    areaRef.current?.focus();
  }

  function clearForm() {
    setText(""); setSender(""); setCompany(""); setSource(null); setStage(null);
    setExample(null); setTrimmed(false); setFromShot(false); setHint(null); setClipboardError(null);
    setFilled({ sender: false, company: false }); setShowFields(false);
    setTouched({ sender: false, company: false, source: false, stage: false });
    areaRef.current?.focus();
  }

  async function pasteFromClipboard() {
    try {
      const copied = await navigator.clipboard.readText();
      if (!copied.trim()) { setClipboardError("The clipboard is empty. Copy the message, then try again."); return; }
      onTextChange(copied);
      areaRef.current?.focus();
    } catch {
      setClipboardError("Clipboard access was blocked. Paste the message into the box instead.");
    }
  }

  const inputCls = "mt-1.5 min-h-12 w-full rounded-[14px] border border-border bg-card px-4 text-[17px] placeholder:text-muted";
  const noSender = text.trim().length > 0 && !sender.trim();
  const contextSet = (source ? 1 : 0) + (stage ? 1 : 0);
  const describedBy = hint ? "message-hint" : trimmed ? "message-trimmed" : undefined;
  const issue = messageIssue(text);

  return (
    <section data-tool="check" className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
      <header className="rounded-tr-[28px] bg-tool-deep px-5 py-6 text-on-deep sm:px-8"><div className="flex items-start gap-4"><MessageSquareText size={30} strokeWidth={1.75} aria-hidden="true" className="mt-1 shrink-0" /><div><p className="text-sm font-medium opacity-85">Check a message</p><h1 className="mt-1 font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-tight">What does this message actually say?</h1><p className="mt-2 max-w-[62ch] opacity-90">Paste the whole recruiter message. We’ll mark the evidence, what we could not verify, and what to do next.</p></div></div></header>
      <form
        className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <label htmlFor="message" className="flex items-center text-[15px] font-medium">
            The message
            {example && <FilledTag label="Example" />}
            {fromShot && !example && <FilledTag label="from screenshot" />}
          </label>
          <div className="flex flex-wrap items-center gap-2"><button type="button" className={`${btnSecondary} !min-h-11 !w-auto !px-3 !py-1.5 !text-sm`} onClick={() => void pasteFromClipboard()}><ClipboardPaste size={16} aria-hidden="true" />Paste from clipboard</button><ScreenshotUpload
            onText={(t) => {
              onTextChange(t, true);
            }}
          /></div>
        </div>
        <textarea
          id="message"
          ref={areaRef}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); submit(); } }}
          placeholder="Paste the whole message here"
          rows={8}
          aria-invalid={hint ? true : undefined}
          aria-describedby={describedBy}
          className="ruled mt-2 min-h-56 max-h-[60dvh] w-full resize-y rounded-[6px] border border-border-strong bg-paper-2 px-5 py-[17px] font-mono text-[15px] leading-7 placeholder:text-fg-3 [field-sizing:content]"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-fg-2"><span>{text.length > 200 ? `${text.length.toLocaleString()} of ${MAX_MESSAGE_CHARS.toLocaleString()} characters` : "Include the sender, links, and the full request when you can."}</span>{text && <button type="button" className="inline-flex min-h-11 items-center gap-1 px-2 text-tool-strong underline-offset-4 hover:underline" onClick={clearForm}><X size={16} aria-hidden="true" />Clear</button>}</div>
        {clipboardError && <p role="alert" className="mt-2 text-sm">{clipboardError}</p>}
        {hint && (
          <p id="message-hint" role="alert" className="mt-2 text-[14px] text-text">
            {hint}
          </p>
        )}
        {trimmed && (
          <p id="message-trimmed" role="status" className="mt-2 text-[14px] text-muted">
            Too long. We kept the first {MAX_MESSAGE_CHARS.toLocaleString()} characters.
          </p>
        )}

        {showFields ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sender" className="flex items-center text-[15px] font-medium">
                Sender&apos;s email or phone
                {filled.sender && !touched.sender && <FilledTag label="from message" />}
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
                  No sender found.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="company" className="flex items-center text-[15px] font-medium">
                Company
                {filled.company && !touched.company && <FilledTag label="from message" />}
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
        ) : (
          <button type="button" className={`${linkClass} !text-tool-strong mt-3 inline-flex min-h-11 items-center text-[15px]`} onClick={() => setShowFields(true)}>
            Add details
          </button>
        )}

        <details className="group mt-4 rounded-[14px] border border-border bg-card px-4">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
            <ChevronRight size={16} aria-hidden="true" className="text-muted transition-transform motion-reduce:transition-none group-open:rotate-90" />
            <span>
              Add context <span className="font-normal text-muted">(optional)</span>
            </span>
            {contextSet > 0 && <FilledTag label={`${contextSet} set`} />}
          </summary>
          <div className="pb-5">
            <fieldset>
              <legend className="text-[15px] font-medium">Where did it come from?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {SOURCES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={source === s.value}
                    className={`${source === s.value ? pillOn : pillOff} !min-h-11 ${source === s.value ? "!text-tool-strong" : ""}`}
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
            <fieldset className="mt-5">
              <legend className="text-[15px] font-medium">Where are you with them?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={stage === s.value}
                    className={`${stage === s.value ? pillOn : pillOff} !min-h-11 ${stage === s.value ? "!text-tool-strong" : ""}`}
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
          </div>
        </details>

        <div className="mt-8 flex flex-col items-start gap-4">
          <button type="submit" className={`${btnPrimary} w-full sm:w-auto sm:min-w-56`} disabled={!!issue} aria-describedby={issue ? "submit-reason" : hint ? "message-hint" : undefined} title="Ctrl or Command + Enter">
            Check this message
          </button>
          {issue && <p id="submit-reason" className="text-sm text-fg-2">{issue}</p>}
          <p className="text-sm text-fg-2">Press Ctrl or Command + Enter to check.</p>
        </div>
        </div>
        <aside className="border-t border-rule pt-5 lg:sticky lg:top-6"><h2 className="font-display text-xl">Try a made-up example</h2><p className="mt-2 text-sm text-fg-2">The examples fill the sheet so you can see what gets checked before submitting.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={`${pillOff} !w-auto`} onClick={() => tryExample("scam")}>A suspicious offer</button><button type="button" className={`${pillOff} !w-auto`} onClick={() => tryExample("real")}>An ordinary update</button></div><p className="mt-7 border-l-2 border-tool pl-4 text-sm text-fg-2">Your message is sent to AI and search services for these checks. Extracted facts may be cached temporarily in server memory; your report is saved on this device.</p></aside>
      </form>
    </section>
  );
}
