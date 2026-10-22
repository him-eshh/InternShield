"use client";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_TAILOR,
  DEFAULT_TAILOR_V2,
  MAX_FACT_CHARS,
  MAX_FACTS,
  MAX_INSTRUCTION_CHARS,
  MAX_JOB_CHARS,
  MAX_REWRITE_CHARS,
  type DiffPart,
  type Emphasis,
  type GapTerm,
  type GuardIssue,
  type GuardWarning,
  type PostingContext,
  type Region,
  type Strength,
  type TailorOptions,
  type TargetLevel,
  type Tone,
} from "@/lib/tiers/types";
import type { ResumeData } from "@/lib/types";
import { postRewrite } from "@/lib/tiers/client";
import { TIER_FLAGS } from "@/lib/tiers/flags";
import { gapCount, keywordGap } from "@/lib/tiers/keywordGap";
import { buildResumePdf, downloadPdf } from "@/lib/tiers/pdf";
import { guardRewrite, wordDiff } from "@/lib/tiers/resumeGuard";
import {
  lineKinds,
  loadPresets,
  loadTailored,
  resetTailored,
  resumeLines,
  resumeSections,
  savePreset,
  saveTailored,
  splitBullet,
  type TailorPreset,
} from "@/lib/tiers/tailored";
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
const LEVEL_LABELS: [TargetLevel, string][] = [
  ["internship", "Internship"],
  ["newgrad", "New grad"],
  ["changer", "Career changer"],
  ["experienced", "Experienced"],
];
const REGION_LABELS: [Region, string][] = [
  ["us", "US résumé"],
  ["uk", "UK CV"],
  ["canada", "Canada"],
  ["europe", "Europe"],
  ["other", "Other"],
];
const smallPill = "!min-h-9 !px-3.5 !py-1 !text-[14px]";
const V2 = TIER_FLAGS.rewriteOptions;

/** One line saying which options the next suggestion will use. */
export function optionsSummary(o: TailorOptions): string {
  const parts = [
    o.emphasis.length ? `Emphasizing ${o.emphasis.map((e) => EMPHASIS_LABELS.find(([k]) => k === e)![1].toLowerCase()).join(", ")}` : null,
    TONE_LABELS.find(([k]) => k === o.tone)![1],
    STRENGTH_LABELS.find(([k]) => k === o.strength)![1].toLowerCase(),
    o.keepLength ? "same length" : "length can change",
    o.level ? LEVEL_LABELS.find(([k]) => k === o.level)![1].toLowerCase() : null,
    o.region ? REGION_LABELS.find(([k]) => k === o.region)![1] : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Short copy for a Check-tier warning. */
export function warningText(w: GuardWarning): string {
  if (w.kind === "inflated") return w.was ? `"${w.token}" claims more than "${w.was}"` : `"${w.token}" may claim more than you did`;
  if (w.kind === "qualifier") return `Drops "${w.token}"`;
  if (w.kind === "scope") return `Adds "${w.token}"`;
  if (w.kind === "seniority") return `"${w.token}" reads senior for your level`;
  return `Buzzword: "${w.token}"`;
}

const fieldCls = "mt-1.5 min-h-12 w-full rounded-[14px] border border-border bg-card px-4 text-[17px] placeholder:text-muted";

interface Choice {
  text: string;
  diff: DiffPart[];
  warnings: GuardWarning[];
}
type Outcome =
  | { kind: "ok"; index: number; choices: Choice[]; pick: number; heldBack: string[]; hidden: number }
  | { kind: "blocked"; index: number; issues: GuardIssue[]; fromPosting: string[] }
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
  const [options, setOptions] = useState<TailorOptions>(V2 ? DEFAULT_TAILOR_V2 : DEFAULT_TAILOR);
  const [facts, setFacts] = useState<string[]>([]);
  const [leftOut, setLeftOut] = useState<string[]>([]);
  const [presets, setPresets] = useState<TailorPreset[]>(() => (V2 ? loadPresets() : []));
  const [presetName, setPresetName] = useState("");
  const [presetNote, setPresetNote] = useState("");
  const gap = useMemo(
    () => (TIER_FLAGS.keywordGap && description.trim() ? keywordGap(description, resume.text, facts) : null),
    [description, resume.text, facts],
  );

  function addFact(term: string) {
    const t = term.trim().slice(0, MAX_FACT_CHARS);
    setFacts((f) => (f.includes(t) || f.length >= MAX_FACTS ? f : [...f, t]));
    setLeftOut((l) => l.filter((x) => x !== t));
    setStatus(`Added ${t} as something you have.`);
  }
  function leaveOut(term: string) {
    setLeftOut((l) => (l.includes(term) ? l : [...l, term]));
    setStatus(`Left out ${term}.`);
  }
  function keepPreset() {
    if (!presetName.trim()) return;
    setPresets(savePreset(presetName, options));
    setPresetNote(`Saved "${presetName.trim().slice(0, 40)}".`);
    setPresetName("");
  }
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
      ...(V2 ? { count: 3 as const, ...(facts.length ? { facts } : {}) } : {}),
    });
    setBusy(false);
    if (res.status !== "done") {
      setOutcome({ kind: "error", message: res.message ?? RETRY_MESSAGE });
      setStatus(res.message ?? RETRY_MESSAGE);
      return;
    }
    const texts = [...new Set((res.data.options ?? [res.data.text]).map((t) => t.trim()))].filter((t) => t && t !== original);
    if (!texts.length) {
      setOutcome({ kind: "error", message: "That suggestion didn't change anything. Try a stronger rewrite or a different note." });
      setStatus("No change suggested.");
      return;
    }
    // Every option goes through the guard; blocked ones are never shown.
    const checked = texts.map((text) => ({
      text,
      g: guardRewrite({ resume: resume.text, original, rewrite: text, posting: description, facts, level: options.level, noBuzzwords: options.noBuzzwords }),
    }));
    const choices = checked.filter((c) => c.g.tier !== "block").map((c) => ({ text: c.text, diff: wordDiff(original, c.text), warnings: c.g.warnings }));
    if (!choices.length) {
      const all = checked.flatMap((c) => c.g.issues);
      setOutcome({ kind: "blocked", index, issues: all, fromPosting: [...new Set(checked.flatMap((c) => c.g.fromPosting))] });
      setStatus("We didn't use this suggestion.");
      return;
    }
    const heldBack = (res.data.heldBack ?? []).filter((t) => !facts.includes(t));
    setOutcome({ kind: "ok", index, choices, pick: 0, heldBack, hidden: checked.length - choices.length });
    setStatus(choices.length > 1 ? `${choices.length} options ready. Compare them with your original below.` : "Suggestion ready. Compare it with your original below.");
  }

  function accept() {
    if (outcome?.kind !== "ok") return;
    const suggestion = outcome.choices[outcome.pick].text;
    const next = lines.map((l, i) => (i === outcome.index ? splitBullet(l).prefix + suggestion : l));
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

      {gap && <KeywordPanel required={gap.required} preferred={gap.preferred} facts={facts} leftOut={leftOut} onHave={addFact} onLeave={leaveOut} />}

      <details open={!V2} className={`${cardCls} group mt-6 p-5 sm:p-6`}>
        <summary className="flex min-h-10 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
          <h2 id="tl-how" className="text-[15px] font-semibold">How to tailor</h2>
          <span className="text-[14px] text-muted">{optionsSummary(options)}</span>
          <span aria-hidden="true" className="ml-auto text-muted transition-transform duration-200 group-open:rotate-180">▾</span>
        </summary>
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
          {V2 && (
            <>
              <OptionRow label="Target level">
                {LEVEL_LABELS.map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={options.level === k} onClick={() => setOptions((o) => ({ ...o, level: k }))} className={`${options.level === k ? pillOn : pillOff} ${smallPill}`}>
                    {label}
                  </button>
                ))}
              </OptionRow>
              <OptionRow label="Region">
                {REGION_LABELS.map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={options.region === k} onClick={() => setOptions((o) => ({ ...o, region: k }))} className={`${options.region === k ? pillOn : pillOff} ${smallPill}`}>
                    {label}
                  </button>
                ))}
              </OptionRow>
              {(
                [
                  ["postingWords", "Use the posting's words"],
                  ["noBuzzwords", "Avoid buzzwords"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex min-h-10 items-center gap-3 text-[15px]">
                  <input type="checkbox" checked={!!options[k]} onChange={(e) => setOptions((o) => ({ ...o, [k]: e.target.checked }))} className="size-5 accent-accent" />
                  {label}
                </label>
              ))}
              <div className="border-t border-border pt-4">
                {presets.length > 0 && (
                  <OptionRow label="Saved">
                    {presets.map((p) => (
                      <button key={p.name} type="button" onClick={() => { setOptions(p.options); setPresetNote(`Using "${p.name}".`); }} className={`${pillOff} ${smallPill}`}>
                        {p.name}
                      </button>
                    ))}
                  </OptionRow>
                )}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="tl-preset" className="text-[15px] font-medium">Save these options as</label>
                    <input id="tl-preset" value={presetName} maxLength={40} placeholder="For example: Finance internships" onChange={(e) => setPresetName(e.target.value)} className={fieldCls} />
                  </div>
                  <button type="button" onClick={keepPreset} disabled={!presetName.trim()} className={btnSecondary}>
                    Save
                  </button>
                </div>
                <p role="status" className={presetNote ? "mt-2 text-[14px] text-muted" : "sr-only"}>
                  {presetNote}
                </p>
              </div>
            </>
          )}
        </div>
      </details>

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
                  {outcome && outcome.kind !== "error" && outcome.index === i && (
                    <Result
                      outcome={outcome}
                      original={body}
                      onPick={(pick) => setOutcome((o) => (o?.kind === "ok" ? { ...o, pick } : o))}
                      onAccept={accept}
                      onKeep={() => keepOriginal(i)}
                      onHave={(t) => {
                        addFact(t);
                        setOutcome((o) => (o?.kind === "ok" ? { ...o, heldBack: o.heldBack.filter((x) => x !== t) } : o));
                      }}
                    />
                  )}
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

function DiffText({ diff }: { diff: DiffPart[] }) {
  return (
    <>
      {diff.map((p, i) => {
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
    </>
  );
}

const OPTION_NAMES = ["Closest to yours", "Results first", "Posting's words"];

function Result({
  outcome,
  original,
  onPick,
  onAccept,
  onKeep,
  onHave,
}: {
  outcome: Extract<Outcome, { kind: "ok" | "blocked" }>;
  original: string;
  onPick: (i: number) => void;
  onAccept: () => void;
  onKeep: () => void;
  onHave: (term: string) => void;
}) {
  if (outcome.kind === "blocked") {
    const own = [...new Set(outcome.issues.map((x) => x.token))].filter((t) => !outcome.fromPosting.includes(t));
    const any = own.length > 0 || outcome.fromPosting.length > 0;
    return (
      <div className={`${cardCls} animate-enter mt-4 p-4`}>
        <p className="text-[16px]">
          {any
            ? "We didn't use this suggestion. It added things that aren't in your resume:"
            : "That suggestion couldn't be used. Try a light touch or a different note."}
        </p>
        {any && (
          <ul className="mt-2 space-y-1 text-[15px]">
            {own.length > 0 && <li>{own.join(", ")}</li>}
            {outcome.fromPosting.length > 0 && (
              <li>
                {outcome.fromPosting.join(", ")} <span className="text-muted">(from the posting, not your resume)</span>
              </li>
            )}
          </ul>
        )}
        <button type="button" onClick={onKeep} className={`${btnSecondary} mt-4`}>
          Keep original
        </button>
      </div>
    );
  }
  const many = outcome.choices.length > 1;
  const chosen = outcome.choices[outcome.pick];
  return (
    <div className={`${cardCls} animate-enter mt-4 p-4`}>
      <h3 className="text-[14px] font-semibold uppercase tracking-wide text-muted">Before</h3>
      <p className="mt-1 break-words text-[16px] leading-snug text-muted">{original}</p>
      <h3 className="mt-4 text-[14px] font-semibold uppercase tracking-wide text-muted">{many ? "Options" : "Suggested"}</h3>
      {many ? (
        <div role="radiogroup" aria-label="Rewrite options" className="mt-2 space-y-2">
          {outcome.choices.map((c, i) => {
            const on = outcome.pick === i;
            return (
              <label
                key={i}
                className={`block cursor-pointer rounded-[14px] border px-4 py-3 transition-colors duration-200 ${on ? "border-accent bg-accent/10" : "border-border hover:bg-bg-soft"}`}
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
                  <input type="radio" name="tl-choice" checked={on} onChange={() => onPick(i)} className="size-4 accent-accent" />
                  {OPTION_NAMES[i] ?? `Option ${i + 1}`}
                </span>
                <span className="mt-1 block break-words text-[16px] leading-snug">
                  <DiffText diff={c.diff} />
                </span>
                <Warnings warnings={c.warnings} />
              </label>
            );
          })}
        </div>
      ) : (
        <>
          <p className="mt-1 break-words text-[16px] leading-snug">
            <DiffText diff={chosen.diff} />
          </p>
          <Warnings warnings={chosen.warnings} />
        </>
      )}
      {outcome.hidden > 0 && (
        <p className="mt-2 text-[14px] text-muted">
          {outcome.hidden === 1 ? "1 option" : `${outcome.hidden} options`} hidden: added things not in your resume.
        </p>
      )}
      {outcome.heldBack.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[14px] font-semibold">Not added: not in your resume</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {outcome.heldBack.map((t) => (
              <li key={t} className="flex items-center gap-1 rounded-full border border-border py-0.5 pl-3 pr-1 text-[14px]">
                {t}
                <button type="button" onClick={() => onHave(t)} className={`${linkClass} min-h-8 rounded-full px-2 text-[14px]`}>
                  I have this<span className="sr-only">: {t}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onAccept} className={btnPrimary}>
          {many ? "Use this option" : "Accept"}
        </button>
        <button type="button" onClick={onKeep} className={btnSecondary}>
          Keep original
        </button>
      </div>
    </div>
  );
}

function Warnings({ warnings }: { warnings: GuardWarning[] }) {
  if (!warnings.length) return null;
  return (
    <ul className="mt-2 space-y-1 text-[14px] text-warn">
      {warnings.map((w, i) => (
        <li key={i}>
          <span aria-hidden="true">⚠ </span>
          <span className="sr-only">Check: </span>
          {warningText(w)}
        </li>
      ))}
    </ul>
  );
}

function KeywordPanel({
  required,
  preferred,
  facts,
  leftOut,
  onHave,
  onLeave,
}: {
  required: GapTerm[];
  preferred: GapTerm[];
  facts: string[];
  leftOut: string[];
  onHave: (t: string) => void;
  onLeave: (t: string) => void;
}) {
  const all = [...required.map((t) => ({ ...t, pref: false })), ...preferred.map((t) => ({ ...t, pref: true }))];
  const req = gapCount(required);
  const pref = gapCount(preferred);
  const found = all.filter((t) => t.bucket === "found");
  const alias = all.filter((t) => t.bucket === "alias");
  const missing = all.filter((t) => t.bucket === "missing" && !leftOut.includes(t.term));
  const tag = (p: boolean) => (p ? <span className="text-muted"> · preferred</span> : null);
  return (
    <section aria-labelledby="tl-gap" className={`${cardCls} animate-enter mt-6 p-5 sm:p-6`}>
      <h2 id="tl-gap" className="text-[15px] font-semibold">Posting keywords</h2>
      {all.length === 0 ? (
        <p className="mt-2 text-[15px] text-muted">No skills or tools we know of in this posting.</p>
      ) : (
        <>
          <p className="mt-1 text-[15px]">
            {[req.total ? `${req.have} of ${req.total} required terms in your resume` : "", pref.total ? `${pref.have} of ${pref.total} preferred` : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {found.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[14px] font-semibold">In your resume</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {found.map((t) => (
                  <li key={t.term} className="rounded-full border border-border px-3 py-1 text-[14px]">
                    <span aria-hidden="true" className="text-good">✓ </span>
                    {t.term}
                    {facts.includes(t.term) && <span className="text-muted"> · you added</span>}
                    {tag(t.pref)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {alias.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[14px] font-semibold">Same idea, different words</h3>
              <ul className="mt-2 space-y-1 text-[15px]">
                {alias.map((t) => (
                  <li key={t.term}>
                    {t.term} <span className="text-muted">· you wrote &ldquo;{t.alias}&rdquo;</span>
                    {tag(t.pref)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {missing.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[14px] font-semibold">Not found: add only if true</h3>
              <ul className="mt-2 space-y-2">
                {missing.map((t) => (
                  <li key={t.term} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
                    <span className="min-w-0 break-words">
                      {t.term}
                      {tag(t.pref)}
                    </span>
                    <span className="flex gap-1.5">
                      <button type="button" onClick={() => onHave(t.term)} className={`${pillOff} ${smallPill}`}>
                        I have this<span className="sr-only">: {t.term}</span>
                      </button>
                      <button type="button" onClick={() => onLeave(t.term)} className={`${pillOff} ${smallPill}`}>
                        Leave out<span className="sr-only">: {t.term}</span>
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {leftOut.length > 0 && <p className="mt-3 text-[14px] text-muted">Left out: {leftOut.join(", ")}</p>}
        </>
      )}
    </section>
  );
}
