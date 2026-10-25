"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Download, Eye, FilePenLine, FileUp, LoaderCircle, X } from "lucide-react";
import type { ResumeData } from "@/lib/types";
import type { PostingContext } from "@/lib/tiers/types";
import type { ResumeEdit, ResumeLine } from "@/lib/tiers/resumeTypes";
import { docLines, docText, parseTextResume } from "@/lib/tiers/resumeModel";
import { WORD_LAYOUT } from "@/lib/tiers/resumeLayout";
import { keywordGap } from "@/lib/tiers/keywordGap";
import { addedKeywords, checkEdit, withinTotalBudget } from "@/lib/tiers/resumeEdits";
import { buildResumePlan, loadResumePlan, type ResumePlan } from "@/lib/tiers/resumePlan";
import { lengthCheck, renderEdited, renderPlainText, TOO_LONG, type Rendered } from "@/lib/tiers/resumeRender";
import { draftResumeEdits, openResumeFile, prepareResumePreviews, previewKey, saveResumeBytes, type PdfPreviewPage, type ResumeFile } from "@/lib/client/resumeEditor";
import { PlanPanel } from "../resume/PlanPanel";
import { EditCard } from "../resume/EditCard";
import { DocumentPreview } from "../resume/DocumentPreview";
import "@/app/v3-resume.css";

interface Props { resume: ResumeData | null; target: PostingContext | null; onOpenProfile: () => void; onBack: () => void }
const field = "mt-1.5 w-full rounded-xl border border-border-strong bg-surface px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-tool";
const primary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-tool px-5 py-3 text-sm font-semibold text-on-tool disabled:opacity-40 hover:opacity-90";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-tool-tint disabled:opacity-40";

export default function ResumeTailor({ resume, target, onOpenProfile, onBack }: Props) {
  const [text, setText] = useState(resume?.text ?? "");
  const [posting, setPosting] = useState(target?.description?.slice(0, 2000) ?? "");
  const [company, setCompany] = useState(target?.company ?? "");
  const [role, setRole] = useState(target?.role ?? "");
  const [upload, setUpload] = useState<File | null>(null);
  const [file, setFile] = useState<ResumeFile | null>(null);
  const [revision, setRevision] = useState(0);
  const [plan, setPlan] = useState<ResumePlan | null>(null);
  const [edits, setEdits] = useState<ResumeEdit[]>([]);
  const [facts, setFacts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [stage, setStage] = useState(0);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generated, setGenerated] = useState<{ version: string; output: Rendered; highlights: ResumeLine[]; preparedPages?: PdfPreviewPage[] } | null>(null);
  const [previewReady, setPreviewReady] = useState("");
  const [renderError, setRenderError] = useState("");
  const progressPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (showProgress) progressPanel.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [showProgress]);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accepted = useMemo(() => edits.filter((e) => e.status === "accepted"), [edits]);
  const version = useMemo(() => previewKey(accepted), [accepted]);
  const previewVersion = `${revision}:${version}`;
  const ready = generated?.version === previewVersion && previewReady === previewVersion && !renderError;
  const highlight = useMemo(() => file ? accepted.flatMap((edit) => {
    const line = docLines(file.doc).find((l) => l.id === edit.lineId);
    return line ? [{ ...line, text: edit.proposed }] : [];
  }) : [], [file, accepted]);
  const markReady = useCallback((key: string) => setPreviewReady(key), []);

  useEffect(() => () => { controller.current?.abort(); if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!file) return;
    let stale = false;
    const prepared = file.previews?.get(version);
    const work = prepared ? Promise.resolve(prepared.output) : renderEdited(file.doc, file.bytes, accepted.map((e) => ({ lineId: e.lineId, text: e.proposed })));
    work.then((output) => {
      if (stale) return;
      const check = lengthCheck(file.doc, accepted.map((e) => ({ lineId: e.lineId, text: e.proposed })), output);
      if (!check.ok) { setRenderError(check.problems.join(". ")); return; }
      setRenderError(""); setGenerated({ version: previewVersion, output, highlights: highlight, preparedPages: prepared?.pages });
    }).catch(() => { if (!stale) setRenderError("Couldn't prepare your preview. Try again."); });
    return () => { stale = true; };
  }, [file, accepted, previewVersion, highlight, version]);

  function cancel() {
    controller.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    setBusy(false); setShowProgress(false); setError("Tailoring cancelled.");
  }
  async function start(nextFacts = facts, addOne = false) {
    const abort = new AbortController(); controller.current?.abort(); controller.current = abort;
    setBusy(true); setError(""); setOutcomes([]); setStage(0); setShowProgress(false);
    timer.current = setTimeout(() => setShowProgress(true), 200);
    try {
      const original = addOne && file ? file : upload ? await openResumeFile(upload) : { doc: parseTextResume(text), bytes: null, name: resume?.fileName ?? "resume.txt" };
      abort.signal.throwIfAborted();
      if (!docLines(original.doc).some((l) => l.kind === "bullet")) throw new Error("Add bullet points to your resume before tailoring.");
      setOutcomes([original.doc.source === "docx" ? `${docLines(original.doc).length} paragraphs read` : original.doc.source === "text" ? `${docLines(original.doc).length} lines read` : `${original.doc.pageCount} ${original.doc.pageCount === 1 ? "page" : "pages"} read`]); setStage(1);
      const input = { resume: docText(original.doc), posting, company, role, facts: nextFacts };
      if (input.resume.length > 10000) throw new Error("Use a resume shorter than 10,000 characters for targeted edits.");
      const postingPlan = buildResumePlan(input);
      setOutcomes((o) => [...o, `${postingPlan.keywords.length} posting keywords identified`]); setStage(2);
      const nextPlan = await loadResumePlan(input, abort.signal);
      abort.signal.throwIfAborted();
      setPlan(nextPlan); setOutcomes((o) => [...o, nextPlan.limited ? "Using the job post only" : `${nextPlan.sources.length} company sources`]); setStage(3);
      const suggestions = await draftResumeEdits(original, posting, nextPlan, nextFacts, abort.signal, () => {
        setOutcomes((o) => [...o, "Draft received"]); setStage(4);
      });
      abort.signal.throwIfAborted();
      let nextEdits = suggestions;
      if (addOne) {
        const combined = [...edits, ...suggestions.filter((e) => !edits.some((p) => p.lineId === e.lineId)).slice(0, Math.min(1, 6 - edits.length))];
        nextEdits = withinTotalBudget(original.doc, new Map(combined.map((e) => [e.lineId, e.proposed]))) ? combined : edits;
      }
      await prepareResumePreviews(original, nextEdits, abort.signal);
      abort.signal.throwIfAborted();
      setFile(original); setRevision((n) => n + 1); setEdits(nextEdits);
      setOutcomes((o) => [...o, `${suggestions.length} edits passed checks`]); setStage(5);
      setPreviewOpen(false);
    } catch (issue) {
      if (!abort.signal.aborted) setError(issue instanceof Error ? issue.message : "Couldn't read that resume. Try another file.");
    } finally {
      if (controller.current === abort) {
        if (timer.current) clearTimeout(timer.current);
        setBusy(false); setShowProgress(false);
      }
    }
  }
  function status(id: string, status: ResumeEdit["status"]) {
    const next = edits.map((e) => e.id === id ? { ...e, status } : e);
    if (file && !withinTotalBudget(file.doc, new Map(next.filter((e) => e.status === "accepted").map((e) => [e.lineId, e.proposed])))) {
      setError("That combination is longer than your original. Reject another edit first."); return;
    }
    setError(""); setEdits(next);
  }
  async function editText(id: string, proposed: string): Promise<string | null> {
    proposed = proposed.trim();
    if (!file) return "Upload your resume first.";
    const edit = edits.find((e) => e.id === id)!;
    if (proposed === edit.proposed) return null;
    const check = checkEdit({ resume: docText(file.doc), original: edit.original, proposed, facts, posting, source: file.doc.source });
    if (!check.ok) return check.failures.includes("width") ? WORD_LAYOUT : check.failures.includes("length") ? TOO_LONG : "Keep your original facts, voice and punctuation. Remove AI phrases.";
    const texts = new Map(edits.filter((e) => e.id !== id).map((e) => [e.lineId, e.proposed])); texts.set(edit.lineId, proposed);
    if (!withinTotalBudget(file.doc, texts)) return "Longer than your original. Shorten this line.";
    const selected = new Map(accepted.filter((e) => e.id !== id).map((e) => [e.lineId, e.proposed]));
    selected.set(edit.lineId, proposed);
    if (!withinTotalBudget(file.doc, selected)) return "Longer than your original. Shorten this line.";
    const output = await renderEdited(file.doc, file.bytes, [{ lineId: edit.lineId, text: proposed }]);
    if (output.rejected.length) return output.rejected[0].reason;
    const next = edits.map((e) => e.id === id ? { ...e, proposed, keywords: addedKeywords(plan?.keywords ?? [], e.original, proposed), reason: "Your wording, checked against your original facts.", status: "accepted" as const } : e);
    try {
      const signal = controller.current?.signal ?? new AbortController().signal;
      await prepareResumePreviews(file, next, signal);
      signal.throwIfAborted();
      setEdits(next);
      return null;
    } catch { return "Couldn't prepare that preview. Try again."; }
  }
  function toggleFact(term: string) {
    const next = facts.includes(term) ? facts.filter((f) => f !== term) : [...facts, term];
    if (next.length > 12) { setError("Confirm up to 12 skills."); return; }
    setFacts(next);
    if (file) setPlan((previous) => {
      if (!previous) return previous;
      const gap = keywordGap(posting, docText(file.doc), next);
      return { ...previous, gap, missing: [...gap.required, ...gap.preferred].filter((t) => t.bucket === "missing").map((t) => t.term) };
    });
    // Removing confirmation removes every dependent suggestion immediately.
    if (facts.includes(term) && file) setEdits((all) => all.filter((e) => checkEdit({ resume: docText(file.doc), original: e.original, proposed: e.proposed, facts: next, posting, source: file.doc.source }).ok));
    else if (file) void start(next, true);
  }
  const steps = ["Reading your resume", "Reading the job post", company.trim() ? `Looking up ${company.trim()}` : "Checking company context", "Drafting edits", "Checking facts and length"];
  const review = !!file;
  const baseName = (file?.name ?? "resume").replace(/\.[^.]+$/, "");

  return <section data-resume-editor="" aria-label="Resume tailoring" data-tool="tailor" className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pt-9">
    <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm text-fg-2"><ArrowLeft size={17} strokeWidth={1.75} />Back</button>
    <header className="mb-7 mt-3 flex items-start gap-4"><div className="rounded-2xl bg-tool-tint p-3 text-tool-strong"><FilePenLine size={30} strokeWidth={1.75} aria-hidden="true" /></div><div><h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Tailor your resume</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-2">Small edits for this role. Your facts, your voice, your original layout.</p></div></header>
    {(!review || busy) && <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]" aria-label="Tailoring inputs">
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6"><h2 className="font-display text-lg font-semibold">Your resume</h2><p className="mt-1 text-sm text-fg-2">Upload your file to keep its layout, or use your profile text.</p>
        <label className="mt-4 flex min-h-24 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border-strong bg-bg-subtle p-4"><FileUp size={24} strokeWidth={1.75} className="shrink-0 text-tool-strong" /><span className="min-w-0 text-sm"><span className="block font-medium break-words">{upload?.name ?? "Choose PDF or Word"}</span><span className="text-xs text-fg-2">Up to 5 MB. Edited in your browser.</span></span><input type="file" accept=".pdf,.docx" aria-label="Upload resume" disabled={busy} className="sr-only" onChange={(e) => { setUpload(e.target.files?.[0] ?? null); setError(""); }} /></label>
        {!upload && <label className="mt-5 block text-sm font-medium">Resume text<textarea value={text} onChange={(e) => setText(e.target.value)} disabled={busy} rows={8} maxLength={10000} className={`${field} resize-y text-sm`} placeholder="Paste your resume, including its bullet points" /></label>}
        {upload?.name.toLowerCase().endsWith(".docx") && <p className="mt-3 text-xs text-fg-2">Word edits remove words to keep your layout. Choose PDF for new wording.</p>}
        {resume && !upload && <p className="mt-2 text-xs text-fg-2">Profile text loaded. Upload the original file to preserve its formatting.</p>}
        {!resume && <button type="button" onClick={onOpenProfile} className="mt-3 min-h-11 text-sm text-tool-strong underline underline-offset-4">Open my profile</button>}
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6"><h2 className="font-display text-lg font-semibold">The role you want</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Company <span className="font-normal text-fg-2">(optional)</span><input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} disabled={busy} className={field} /></label><label className="text-sm font-medium">Role <span className="font-normal text-fg-2">(optional)</span><input value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} disabled={busy} className={field} /></label></div><label className="mt-4 block text-sm font-medium">Job posting<textarea value={posting} onChange={(e) => setPosting(e.target.value)} disabled={busy} rows={8} maxLength={2000} className={`${field} resize-y text-sm`} placeholder="Paste the requirements and responsibilities" /></label><p className="mt-2 text-xs text-fg-2">We suggest up to six edits. You choose what stays.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" className={primary} disabled={busy || (!upload && !text.trim()) || !posting.trim()} onClick={() => void start()}><FilePenLine size={17} strokeWidth={1.75} />Tailor my resume</button>{busy && <button type="button" className={secondary} onClick={cancel}><X size={16} />Cancel</button>}</div></div>
    </section>}
    {showProgress && busy && <section ref={progressPanel} role="status" aria-live="polite" className="my-5 rounded-2xl border border-border bg-surface p-5"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-display text-base font-semibold">Preparing your edits</h2><button type="button" className={secondary} onClick={cancel}>Cancel tailoring</button></div><ol className="space-y-3">{steps.map((label, i) => <li key={label} className={`flex items-start gap-3 text-sm ${i > stage ? "text-fg-3" : "text-fg"}`}>{i < stage ? <Check size={18} className="text-tool-strong" /> : i === stage ? <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none text-tool-strong" /> : <span className="mt-1 h-3 w-3 rounded-full border border-border-strong" />}<span>{label}{outcomes[i] && <span className="ml-2 text-fg-2">{outcomes[i]}</span>}</span></li>)}</ol></section>}
    {error && <p role="alert" className="my-4 rounded-xl border border-border bg-surface p-4 text-sm">{error}</p>}
    {review && plan && !busy && <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-fg-2">{edits.length} suggestions <span aria-hidden="true">/</span> {accepted.length} accepted</p><button type="button" className={secondary} onClick={() => { controller.current?.abort(); setFile(null); setEdits([]); setPlan(null); setFacts([]); }}>Change inputs</button></div>{file.doc.source === "docx" && <p className="text-sm text-fg-2">Word edits shorten your wording while keeping the remaining words in order. Use a PDF for broader rewrites.</p>}<PlanPanel plan={plan} />
      <section aria-label="Posting keyword gaps" className="rounded-2xl border border-border bg-surface p-5"><h2 className="text-sm font-semibold">Posting keywords</h2><p className="mt-1 text-xs text-fg-2">Only add a missing skill if you have it.</p><div className="mt-3 flex flex-wrap gap-2">{[...plan.gap.required, ...plan.gap.preferred].map((term) => <div key={term.term} className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm">{term.bucket !== "missing" && <Check size={15} className="text-tool-strong" />}<span>{term.term}</span>{(term.bucket === "missing" || facts.includes(term.term)) && <button type="button" onClick={() => toggleFact(term.term)} aria-pressed={facts.includes(term.term)} className="min-h-11 text-xs font-medium text-tool-strong">{facts.includes(term.term) ? "Confirmed" : "I have this"}</button>}</div>)}</div></section>
      <div className="flex gap-2 lg:hidden"><button type="button" className={secondary} aria-pressed={!previewOpen} onClick={() => setPreviewOpen(false)}>Edits</button><button type="button" className={secondary} aria-pressed={previewOpen} onClick={() => setPreviewOpen(true)}><Eye size={16} />Preview</button></div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"><section aria-label="Suggested edits" className={`${previewOpen ? "hidden lg:block" : "block"} space-y-4`}>{edits.length ? edits.map((edit) => <EditCard key={edit.id} edit={edit} onStatus={status} onEdit={editText} />) : <div className="rounded-2xl border border-border bg-surface p-6"><h2 className="font-display text-lg font-semibold">No changes to review</h2><p className="mt-2 text-sm text-fg-2">No suggestions passed all the checks. You can confirm a missing skill above or try another posting.</p></div>}</section>
        <section className={`${previewOpen ? "block" : "hidden lg:block"} min-w-0 space-y-3 lg:sticky lg:top-24`} aria-label="Live preview"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">Your resume</h2><span className="text-xs text-fg-2">{file.doc.source === "text" ? "Text preview" : file.doc.source === "docx" ? (file.doc.pageCountEstimated ? "Word document" : `${file.doc.pageCount} original ${file.doc.pageCount === 1 ? "page" : "pages"}`) : `${file.doc.pageCount} ${file.doc.pageCount === 1 ? "page" : "pages"}`}</span></div>{generated && <DocumentPreview output={generated.output} version={generated.version} onReady={markReady} highlights={generated.highlights} preparedPages={generated.preparedPages} />}{renderError && <p role="alert" className="text-sm">{renderError}</p>}<p className="text-xs text-fg-2">{file.doc.source === "docx" ? "Word layout kept: edits only remove words, keeping their order." : file.doc.source === "text" ? "Within your original text length" : "Same length as your original"}</p>{file.doc.source === "pdf" && <p className="text-xs text-fg-3">PDF changes cover the old text visually. Use plain text for a clean text layer.</p>}<div className="flex flex-wrap gap-2"><button type="button" disabled={!ready} className={primary} onClick={() => generated && saveResumeBytes(generated.output.bytes, generated.output.mime, `${baseName}-tailored.${generated.output.ext}`)}><Download size={16} />Download {generated?.output.ext.toUpperCase() ?? "resume"}</button><button type="button" disabled={!ready} className={secondary} onClick={() => saveResumeBytes(new TextEncoder().encode(renderPlainText(file.doc, accepted.map((e) => ({ lineId: e.lineId, text: e.proposed })))), "text/plain", `${baseName}-tailored.txt`)}>Plain text</button></div>{!ready && <p className="text-xs text-fg-2">Preview first, then download.</p>}</section>
      </div></div>}
  </section>;
}
