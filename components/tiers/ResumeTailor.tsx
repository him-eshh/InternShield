"use client";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_TAILOR,
  MAX_INSTRUCTION_CHARS,
  MAX_JOB_CHARS,
  MAX_REWRITE_CHARS,
  type DiffPart,
  type Emphasis,
  type GuardIssue,
  type PostingContext,
  type Strength,
  type TailorOptions,
  type Tone,
} from "@/lib/tiers/types";
import type { ResumeData } from "@/lib/types";
import { postRewrite } from "@/lib/tiers/client";
import { buildResumePdf, downloadPdf } from "@/lib/tiers/pdf";
import { checkRewrite, wordDiff } from "@/lib/tiers/resumeGuard";
import { lineKinds, loadTailored, resetTailored, resumeLines, resumeSections, saveTailored, splitBullet } from "@/lib/tiers/tailored";
import { ArrowLeftIcon, Spinner } from "../icons";
import { btnPrimary, btnSecondary, card as cardCls, linkClass, pillOff, pillOn } from "../ui";

interface Props {
  resume: ResumeData | null;
  target: PostingContext | null;
  onOpenProfile: () => void;
  onBack: () => void;
}

const DEFAULT_INSTRUCTION = "Make it match the posting";
const RETRY_MESSAGE = "Couldn't reword that right now. Try again in a minute.";
const EMPHASIS_LABELS: [Emphasis, string][] = [
  ["skills", "Skills"],
  ["impact", "Impact and results"],
  ["leadership", "Leadership"],
  ["technical", "Technical depth"],
];
const TONE_LABELS: [Tone, string][] = [
  ["concise", "Concise"],
  ["confident", "Confident"],
  ["formal", "Formal"],
];
const STRENGTH_LABELS: [Strength, string][] = [
  ["light", "Light touch"],
  ["strong", "Stronger rewrite"],
];
const smallPill = "!min-h-9 !px-3.5 !py-1 !text-[14px]";

/** One line saying which options the next suggestion will use. */
export function optionsSummary(o: TailorOptions): string {
  const parts = [
    o.emphasis.length ? `Emphasizing ${o.emphasis.map((e) => EMPHASIS_LABELS.find(([k]) => k === e)![1].toLowerCase()).join(", ")}` : null,
    TONE_LABELS.find(([k]) => k === o.tone)![1],
    STRENGTH_LABELS.find(([k]) => k === o.strength)![1].toLowerCase(),
    o.keepLength ? "same length" : "length can change",
  ].filter(Boolean);
  return parts.join(" · ");
}

const fieldCls = "mt-1.5 min-h-12 w-full rounded-[14px] border border-border bg-card px-4 text-[17px] placeholder:text-muted";

type Outcome =
  | { kind: "ok"; index: number; suggestion: string; diff: DiffPart[] }
  | { kind: "blocked"; index: number; issues: GuardIssue[] }
  | { kind: "error"; message: string };

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className={`${linkClass} inline-flex min-h-10 items-center gap-1.5 text-[15px]`}>
      <ArrowLeftIcon size={16} /> Back
    </button>
  );
}

export default function ResumeTailor({ resume, target, onOpenProfile, onBack }: Props) {
  if (!resume) {
    return (
      <section className="mx-auto max-w-[640px] px-6 py-10 sm:py-16">
        <BackLink onBack={onBack} />
        <h1 className="mt-4 text-[clamp(30px,5vw,48px)] font-bold leading-[1.1] tracking-[-0.025em]">Tailor your resume</h1>
        <div className={`${cardCls} mt-8 p-6`}>
          <p className="text-[17px]">This needs your resume. Add it in your profile and come back.</p>
          <button type="button" onClick={onOpenProfile} className={`${btnPrimary} mt-5`}>
            Open my profile
          </button>
        </div>
      </section>
    );
  }
  return <Editor resume={resume} target={target} onBack={onBack} />;
}

function Editor({ resume, target, onBack }: { resume: ResumeData; target: PostingContext | null; onBack: () => void }) {
  const [lines, setLines] = useState<string[]>(() => loadTailored(resume.text));
  const [company, setCompany] = useState(target?.company ?? "");
  const [role, setRole] = useState(target?.role ?? "");
  const [description, setDescription] = useState((target?.description ?? "").slice(0, MAX_JOB_CHARS));
  const [selected, setSelected] = useState<number | null>(null);
  const [instruction, setInstruction] = useState("");
  const [options, setOptions] = useState<TailorOptions>(DEFAULT_TAILOR);
  const [section, setSection] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [status, setStatus] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfNote, setPdfNote] = useState("");

  const original = useMemo(() => resumeLines(resume.text), [resume.text]);
  // Kinds come from the original lines (accepting a rewrite keeps the line count), so an edit never turns a bullet into a header.
  const kinds = useMemo(() => lineKinds(lines.length === original.length ? original : lines), [lines, original]);
  const sections = useMemo(
    () => resumeSections(lines.length === original.length ? original : lines).filter((sec) => sec.lines.some((i) => kinds[i] === "content")),
    [lines, original, kinds],
  );
  const shown = section === "all" ? null : new Set(sections.find((sec) => sec.title === section)?.lines ?? []);
  const edited = lines.length !== original.length || lines.some((l, i) => l !== original[i]);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function toggleEmphasis(e: Emphasis) {
    setOptions((o) => ({ ...o, emphasis: o.emphasis.includes(e) ? o.emphasis.filter((x) => x !== e) : [...o.emphasis, e] }));
  }

  function keepOriginal(i: number) {
    setOutcome(null);
    lineRefs.current[i]?.focus();
  }

  function select(i: number) {
    setSelected(selected === i ? null : i);
    setOutcome(null);
    setStatus("");
  }

  async function suggest() {
    if (selected === null || busy) return;
    const index = selected;
    const { body: original } = splitBullet(lines[index]);
    if (original.length > MAX_REWRITE_CHARS) return;
    setBusy(true);
    setOutcome(null);
    setStatus("Suggesting a rewrite…");
    const res = await postRewrite({
      text: original.slice(0, MAX_REWRITE_CHARS),
      instruction: instruction.trim().slice(0, MAX_INSTRUCTION_CHARS) || DEFAULT_INSTRUCTION,
      posting: { company: company.trim() || null, role: role.trim() || null, description: description.trim() || null },
      options,
    });
    setBusy(false);
    if (res.status !== "done") {
      setOutcome({ kind: "error", message: res.message ?? RETRY_MESSAGE });
      setStatus(res.message ?? RETRY_MESSAGE);
      return;
    }
    const suggestion = res.data.text.trim();
    const guard = checkRewrite(resume.text, original, suggestion);
    if (!suggestion || suggestion === original) {
      setOutcome({ kind: "error", message: "That suggestion didn't change anything. Try a stronger rewrite or a different note." });
      setStatus("No change suggested.");
    } else if (!guard.ok) {
      setOutcome({ kind: "blocked", index, issues: guard.issues });
      setStatus("We didn't use this suggestion.");
    } else {
      setOutcome({ kind: "ok", index, suggestion, diff: wordDiff(original, suggestion) });
      setStatus("Suggestion ready. Compare it with your original below.");
    }
  }

  function accept() {
    if (outcome?.kind !== "ok") return;
    const next = lines.map((l, i) => (i === outcome.index ? splitBullet(l).prefix + outcome.suggestion : l));
    setLines(next);
    saveTailored(resume.text, next);
    setOutcome(null);
    setStatus("Line updated.");
    lineRefs.current[outcome.index]?.focus();
  }

  function undoAll() {
    resetTailored();
    setLines(original);
    setOutcome(null);
    setSelected(null);
    setStatus("All changes undone.");
  }

  async function download() {
    setPdfBusy(true);
    setPdfNote("");
    try {
      downloadPdf(await buildResumePdf(lines, "Tailored resume"), "resume-tailored.pdf");
      setPdfNote("Downloaded resume-tailored.pdf.");
    } catch {
      setPdfNote("Couldn't make the PDF. Try again.");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-[760px] px-6 py-10 sm:py-16">
      <BackLink onBack={onBack} />
      <h1 className="mt-4 text-[clamp(30px,5vw,48px)] font-bold leading-[1.1] tracking-[-0.025em]">Tailor your resume</h1>
      <p className="mt-2 text-[15px] text-muted">
        Only the line you pick and the job details go to an AI. The rest stays here.
      </p>

      <fieldset className={`${cardCls} mt-8 p-5 sm:p-6`}>
        <legend className="px-1 text-[15px] font-semibold">The job you&apos;re targeting</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tl-company" className="text-[15px] font-medium">Company</label>
            <input id="tl-company" value={company} maxLength={120} onChange={(e) => setCompany(e.target.value)} className={fieldCls} />
          </div>
          <div>
            <label htmlFor="tl-role" className="text-[15px] font-medium">Role</label>
            <input id="tl-role" value={role} maxLength={120} onChange={(e) => setRole(e.target.value)} className={fieldCls} />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="tl-desc" className="text-[15px] font-medium">
            Paste the job description <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="tl-desc"
            value={description}
            maxLength={MAX_JOB_CHARS}
            rows={4}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1.5 w-full resize-y rounded-[14px] border border-border bg-card p-4 text-[17px] leading-relaxed"
          />
        </div>
      </fieldset>

      <section aria-labelledby="tl-how" className={`${cardCls} mt-6 p-5 sm:p-6`}>
        <h2 id="tl-how" className="text-[15px] font-semibold">How to tailor</h2>
        <div className="mt-4 space-y-4">
          <OptionRow label="Emphasize" hint="optional, pick any">
            {EMPHASIS_LABELS.map(([k, label]) => {
              const on = options.emphasis.includes(k);
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => toggleEmphasis(k)} className={`${on ? pillOn : pillOff} ${smallPill}`}>
                  {label}
                </button>
              );
            })}
          </OptionRow>
          <OptionRow label="Tone">
            {TONE_LABELS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={options.tone === k} onClick={() => setOptions((o) => ({ ...o, tone: k }))} className={`${options.tone === k ? pillOn : pillOff} ${smallPill}`}>
                {label}
              </button>
            ))}
          </OptionRow>
          <OptionRow label="How much to change">
            {STRENGTH_LABELS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={options.strength === k} onClick={() => setOptions((o) => ({ ...o, strength: k }))} className={`${options.strength === k ? pillOn : pillOff} ${smallPill}`}>
                {label}
              </button>
            ))}
          </OptionRow>
          <label className="flex min-h-10 items-center gap-3 text-[15px]">
            <input
              type="checkbox"
              checked={options.keepLength}
              onChange={(e) => setOptions((o) => ({ ...o, keepLength: e.target.checked }))}
              className="size-5 accent-accent"
            />
            Keep about the same length
          </label>
        </div>
      </section>

      <h2 className="mt-10 text-[20px] font-semibold">Your resume</h2>
      <p className="mt-1 text-[15px] text-muted">Pick a bullet to reword.</p>
      {sections.length > 1 && (
        <div role="group" aria-label="Show section" className="mt-4 flex flex-wrap gap-2">
          {[{ title: "all", label: "All sections" }, ...sections.map((sec) => ({ title: sec.title, label: sec.title }))].map((sec) => (
            <button
              key={sec.title}
              type="button"
              aria-pressed={section === sec.title}
              onClick={() => setSection(sec.title)}
              className={`${section === sec.title ? pillOn : pillOff} ${smallPill}`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      )}
      <ul className="mt-4 space-y-2">
        {lines.map((line, i) => {
          if (shown && !shown.has(i)) return null;
          const kind = kinds[i];
          if (kind === "header") {
            return (
              <li key={i} className="pt-4 first:pt-0">
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{line}</h3>
              </li>
            );
          }
          if (kind !== "content") {
            return (
              <li key={i} className="break-words px-1 text-[15px] leading-snug text-muted">
                {line}
              </li>
            );
          }
          const on = selected === i;
          const { body } = splitBullet(line);
          return (
            <li key={i}>
              <button
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                type="button"
                aria-pressed={on}
                onClick={() => select(i)}
                className={`w-full break-words rounded-[14px] border px-4 py-3 text-left text-[16px] leading-snug transition-colors duration-200 ${
                  on ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-bg-soft"
                }`}
              >
                {line}
              </button>
              {on && (
                <div className="animate-enter mt-3 mb-4 pl-1">
                  {body.length > MAX_REWRITE_CHARS ? (
                    <p className="text-[15px] text-muted">This line is too long to reword in one go. Pick a shorter line.</p>
                  ) : (
                  <>
                  <label htmlFor="tl-instruction" className="text-[15px] font-medium">
                    Anything else? <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <input
                    id="tl-instruction"
                    value={instruction}
                    maxLength={MAX_INSTRUCTION_CHARS}
                    placeholder="For example: mention teamwork"
                    onChange={(e) => setInstruction(e.target.value)}
                    className={fieldCls}
                  />
                  <p className="mt-2 text-[14px] text-muted">{optionsSummary(options)}</p>
                  <button type="button" onClick={() => void suggest()} disabled={busy} className={`${btnPrimary} mt-4`}>
                    {busy && <Spinner />}
                    {busy ? "Suggesting…" : "Suggest a rewrite"}
                  </button>
                  {outcome && outcome.kind !== "error" && outcome.index === i && <Result outcome={outcome} original={body} onAccept={accept} onKeep={() => keepOriginal(i)} />}
                  {outcome?.kind === "error" && (
                    <p className="animate-enter mt-4 text-[15px] text-muted">{outcome.message}</p>
                  )}
                  </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => void download()} disabled={pdfBusy} className={btnPrimary}>
          {pdfBusy && <Spinner />}
          Download PDF
        </button>
        {edited && (
          <button type="button" onClick={undoAll} className={btnSecondary}>
            Undo all changes
          </button>
        )}
        <p role="status" className={pdfNote ? "animate-enter self-center text-[15px]" : "sr-only"}>
          {pdfNote}
        </p>
      </div>
    </section>
  );
}

function OptionRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="sm:flex sm:items-start sm:gap-4">
      <p className="text-[15px] font-medium sm:w-40 sm:shrink-0 sm:pt-1.5">
        {label}
        {hint && <span className="block text-[13px] font-normal text-muted">{hint}</span>}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 sm:mt-0">{children}</div>
    </div>
  );
}

function Result({
  outcome,
  original,
  onAccept,
  onKeep,
}: {
  outcome: Extract<Outcome, { kind: "ok" | "blocked" }>;
  original: string;
  onAccept: () => void;
  onKeep: () => void;
}) {
  if (outcome.kind === "blocked") {
    const tokens = [...new Set(outcome.issues.map((x) => x.token))].join(", ");
    return (
      <div className={`${cardCls} animate-enter mt-4 p-4`}>
        <p className="text-[16px]">
          {tokens
            ? `We didn't use this suggestion because it added things that aren't in your resume: ${tokens}.`
            : "That suggestion couldn't be used. Try a light touch or a different note."}
        </p>
        <button type="button" onClick={onKeep} className={`${btnSecondary} mt-4`}>
          Keep original
        </button>
      </div>
    );
  }
  return (
    <div className={`${cardCls} animate-enter mt-4 p-4`}>
      <h3 className="text-[14px] font-semibold uppercase tracking-wide text-muted">Before</h3>
      <p className="mt-1 break-words text-[16px] leading-snug text-muted">{original}</p>
      <h3 className="mt-4 text-[14px] font-semibold uppercase tracking-wide text-muted">Suggested</h3>
      <p className="mt-1 break-words text-[16px] leading-snug">
        {outcome.diff.map((p, i) => {
          if (p.kind === "same") return <span key={i}>{p.text}</span>;
          if (p.kind === "added")
            return (
              <span key={i} className="underline decoration-accent decoration-2 underline-offset-4">
                <span className="sr-only">added: </span>
                {p.text}
              </span>
            );
          return (
            <span key={i} className="text-muted line-through">
              <span className="sr-only">removed: </span>
              {p.text}
            </span>
          );
        })}
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onAccept} className={btnPrimary}>
          Accept
        </button>
        <button type="button" onClick={onKeep} className={btnSecondary}>
          Keep original
        </button>
      </div>
    </div>
  );
}
