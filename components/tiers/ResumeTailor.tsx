"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, FlaskConical, RotateCw, Download, Eye, FilePenLine, FileUp, Keyboard, LoaderCircle, Undo2, X } from "lucide-react";
import { TAILOR_SAMPLE } from "@/lib/examples";
import { TailorIllustration } from "../illustrations";
import type { ResumeData, UserLevel } from "@/lib/types";
import type { PostingContext } from "@/lib/tiers/types";
import type { ResumeEdit, ResumeHighlight } from "@/lib/tiers/resumeTypes";
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
import ToolHero from "../ToolHero";
import { btnPrimary, btnSecondary } from "../ui";

interface Props { resume: ResumeData | null; target: PostingContext | null; profileLevel?: UserLevel; onOpenProfile: () => void }
const field = "mt-1.5 w-full rounded-xl border border-border-strong bg-surface px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-tool";
const primary = btnPrimary;
const secondary = btnSecondary;

export default function ResumeTailor({ resume, target, profileLevel, onOpenProfile }: Props) {
  const [text, setText] = useState(resume?.text ?? "");
  const [posting, setPosting] = useState(target?.description?.slice(0, 2000) ?? "");
  const [company, setCompany] = useState(target?.company ?? "");
  const [role, setRole] = useState(target?.role ?? "");
  const [upload, setUpload] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<ResumeFile | null>(null);
  const [revision, setRevision] = useState(0);
  const [plan, setPlan] = useState<ResumePlan | null>(null);
  const [edits, setEdits] = useState<ResumeEdit[]>([]);
  const [changed, setChanged] = useState<{ lineId: string } | null>(null);
  useEffect(() => {
    if (!changed) return;
    const timeout = setTimeout(() => setChanged(null), 900);
    return () => clearTimeout(timeout);
  }, [changed]);
  const [facts, setFacts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [stage, setStage] = useState(0);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [undo, setUndo] = useState<{ id: string; previous: ResumeEdit["status"]; action: string } | null>(null);
  const editList = useRef<HTMLElement>(null);
  const [generated, setGenerated] = useState<{ version: string; output: Rendered; highlights: ResumeHighlight[]; preparedPages?: PdfPreviewPage[] } | null>(null);
  const [previewReady, setPreviewReady] = useState("");
  const [renderError, setRenderError] = useState("");
  const progressPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (showProgress) progressPanel.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [showProgress]);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accepted = useMemo(() => edits.filter((e) => e.status === "accepted"), [edits]);
  const acceptAllIds = useMemo(() => {
    if (!file) return [];
    const selected = new Map(accepted.map((edit) => [edit.lineId, edit.proposed]));
    const ids: string[] = [];
    for (const edit of edits.filter((item) => item.status === "pending")) {
      selected.set(edit.lineId, edit.proposed);
      if (withinTotalBudget(file.doc, selected)) ids.push(edit.id);
      else selected.delete(edit.lineId);
    }
    return ids;
  }, [accepted, edits, file]);
  useEffect(() => {
    if (!undo) return;
    const timeout = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(timeout);
  }, [undo]);
  const version = useMemo(() => previewKey(accepted), [accepted]);
  const previewVersion = `${revision}:${version}`;
  const ready = generated?.version === previewVersion && previewReady === previewVersion && !renderError;
  const highlight = useMemo<ResumeHighlight[]>(() => {
    if (!file) return [];
    const lines = docLines(file.doc);
    const highlights = accepted.flatMap((edit) => {
      const line = lines.find((l) => l.id === edit.lineId);
      return line ? [{ ...line, text: edit.proposed, glow: changed?.lineId === line.id }] : [];
    });
    if (changed && !highlights.some((line) => line.id === changed.lineId)) {
      const restored = lines.find((line) => line.id === changed.lineId);
      if (restored) highlights.push({ ...restored, glow: true });
    }
    return highlights;
  }, [file, accepted, changed]);
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

  function fillSample() {
    setInputMode("text"); setText(TAILOR_SAMPLE.resume); setPosting(TAILOR_SAMPLE.posting); setCompany(TAILOR_SAMPLE.company); setRole(TAILOR_SAMPLE.role); setError(""); setNotice("Filled with a made-up resume and job post. Nothing here is a real person.");
  }
  function cancel() {
    controller.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    setBusy(false); setShowProgress(false); setError("Tailoring cancelled.");
  }
  async function start(nextFacts = facts, addOne = false) {
    const abort = new AbortController(); controller.current?.abort(); controller.current = abort;
    setChanged(null); setBusy(true); setError(""); setNotice(""); setOutcomes([]); setStage(0); setShowProgress(false);
    timer.current = setTimeout(() => setShowProgress(true), 200);
    try {
      const original = addOne && file ? file : inputMode === "file" && upload ? await openResumeFile(upload) : { doc: parseTextResume(text), bytes: null, name: resume?.fileName ?? "resume.txt" };
      abort.signal.throwIfAborted();
      if (!docLines(original.doc).some((l) => l.kind === "bullet")) throw new Error("Add bullet points to your resume before tailoring.");
      setOutcomes([original.doc.source === "docx" ? `${docLines(original.doc).length} paragraphs read` : original.doc.source === "text" ? `${docLines(original.doc).length} lines read` : `${original.doc.pageCount} ${original.doc.pageCount === 1 ? "page" : "pages"} read`]); setStage(1);
      const input = { resume: docText(original.doc), posting, company, role, facts: nextFacts };
      if (input.resume.length > 10000) throw new Error("Use a resume shorter than 10,000 characters for targeted edits.");
      const postingPlan = buildResumePlan(input);
      setOutcomes((o) => [...o, posting.trim() ? `${postingPlan.keywords.length} posting keywords identified` : "Using company and role details"]); setStage(2);
      const nextPlan = await loadResumePlan(input, abort.signal);
      abort.signal.throwIfAborted();
      setPlan(nextPlan); setOutcomes((o) => [...o, nextPlan.limited ? (posting.trim() ? "Using the job post only" : "Using role context only") : `${nextPlan.sources.length} company sources`]); setStage(3);
      const suggestions = await draftResumeEdits(original, posting, nextPlan, nextFacts, abort.signal, () => {
        setOutcomes((o) => [...o, "Draft received"]); setStage(4);
      }, profileLevel);
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
    const current = edits.find((edit) => edit.id === id);
    if (!current || current.status === status) return;
    const next = edits.map((e) => e.id === id ? { ...e, status } : e);
    if (file && !withinTotalBudget(file.doc, new Map(next.filter((e) => e.status === "accepted").map((e) => [e.lineId, e.proposed])))) {
      setError("That combination is longer than your original. Reject another edit first."); return;
    }
    setError(""); setChanged({ lineId: current.lineId }); setEdits(next);
    setUndo({ id, previous: current.status, action: status === "accepted" ? "Edit accepted" : status === "rejected" ? "Edit rejected" : "Decision undone" });
  }
  function handleEditKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest("input,textarea,select,[contenteditable='true']")) return;
    const rows = Array.from(editList.current?.querySelectorAll<HTMLElement>("[data-edit-id]") ?? []);
    const row = (event.target as HTMLElement).closest<HTMLElement>("[data-edit-id]");
    const index = rows.indexOf(row!);
    if (index < 0) return;
    const key = event.key.toLowerCase();
    if (key === "j" || key === "k") { event.preventDefault(); rows[Math.max(0, Math.min(rows.length - 1, index + (key === "j" ? 1 : -1)))]?.focus(); }
    if (key === "a" || key === "r") { event.preventDefault(); status(edits[index].id, key === "a" ? "accepted" : "rejected"); }
  }
  function acceptAllChecked() {
    if (!acceptAllIds.length) return;
    setEdits((current) => current.map((edit) => acceptAllIds.includes(edit.id) ? { ...edit, status: "accepted" } : edit));
    setChanged({ lineId: edits.find((edit) => edit.id === acceptAllIds[0])!.lineId });
    setError("");
  }
  async function editText(id: string, proposed: string): Promise<string | null> {
    proposed = proposed.trim();
    if (!file) return "Upload your resume first.";
    const edit = edits.find((e) => e.id === id)!;
    if (proposed === edit.proposed) return null;
    const check = checkEdit({ resume: docText(file.doc), original: edit.original, proposed, facts, posting, source: file.doc.source });
    if (!check.ok) return check.failures.includes("width") ? WORD_LAYOUT : check.failures.includes("length") ? TOO_LONG : "This line may add unsupported facts or wording. Compare it with your experience and try again.";
    const texts = new Map(edits.filter((e) => e.id !== id).map((e) => [e.lineId, e.proposed])); texts.set(edit.lineId, proposed);
    if (!withinTotalBudget(file.doc, texts)) return "Longer than your original. Shorten this line.";
    const selected = new Map(accepted.filter((e) => e.id !== id).map((e) => [e.lineId, e.proposed]));
    selected.set(edit.lineId, proposed);
    if (!withinTotalBudget(file.doc, selected)) return "Longer than your original. Shorten this line.";
    const output = await renderEdited(file.doc, file.bytes, [{ lineId: edit.lineId, text: proposed }]);
    if (output.rejected.length) return output.rejected[0].reason;
    const next = edits.map((e) => e.id === id ? { ...e, proposed, keywords: addedKeywords(plan?.keywords ?? [], e.original, proposed), reason: "Your wording. Review it against your experience.", status: "accepted" as const } : e);
    try {
      const signal = controller.current?.signal ?? new AbortController().signal;
      await prepareResumePreviews(file, next, signal);
      signal.throwIfAborted();
      setChanged({ lineId: edit.lineId }); setEdits(next);
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
  const steps = ["Reading your resume", posting.trim() ? "Reading the job post" : "Reading the role details", company.trim() ? `Looking up ${company.trim()}` : "Checking role context", "Drafting edits", "Checking facts and length"];
  const review = !!file;
  const baseName = (file?.name ?? "resume").replace(/\.[^.]+$/, "");
  function downloadMain() {
    if (!file) return;
    if (file.doc.source === "pdf" && accepted.length > 0) saveResumeBytes(new TextEncoder().encode(renderPlainText(file.doc, accepted.map((edit) => ({ lineId: edit.lineId, text: edit.proposed })))), "text/plain", `${baseName}-tailored.txt`);
    else if (generated) saveResumeBytes(generated.output.bytes, generated.output.mime, `${baseName}-tailored.${generated.output.ext}`);
  }

  return (
    <section data-resume-editor="" aria-label="Resume tailoring" data-tool="tailor" className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-9">
      <ToolHero Icon={FilePenLine} name="Tailor" title="Tailor your resume" art={<TailorIllustration size={150} />}>Review a few careful edits in the original layout. You decide what belongs.</ToolHero>
      {(!review || busy) && <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]" aria-label="Tailoring inputs">
        <div className="border-t-2 border-tool py-5"><h2 className="font-display text-2xl">01 / Your resume</h2><p className="mt-2 text-sm text-fg-2">Upload the original PDF or Word file to keep its layout, or use text from your profile.</p>
          <div className="mt-4 flex gap-2" role="group" aria-label="Resume input type"><button type="button" aria-pressed={inputMode === "text"} className={inputMode === "text" ? primary : secondary} onClick={() => setInputMode("text")}>Paste text</button><button type="button" aria-pressed={inputMode === "file"} className={inputMode === "file" ? primary : secondary} onClick={() => setInputMode("file")}>Upload file</button></div>
          {inputMode === "file" && <><label className={`relative mt-5 flex min-h-28 cursor-pointer items-center gap-3 rounded-[6px] border-2 border-dashed p-4 transition-colors ${dragging ? "border-tool bg-tool-tint" : "border-border-strong bg-paper-2"}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (busy) return; const picked = event.dataTransfer.files?.[0]; if (!picked) return; if (!/\.(pdf|docx)$/i.test(picked.name)) { setError("Choose a PDF or Word .docx file, then try again."); return; } setUpload(picked); setError(""); }}>
            <FileUp size={25} strokeWidth={1.75} className="shrink-0 text-tool-strong" /><span className="min-w-0 text-sm"><span className="block font-medium">Choose PDF or Word</span><span className="text-fg-2">Or drop it here · up to 5 MB</span></span>
            <input type="file" accept=".pdf,.docx" aria-label="Upload resume" disabled={busy} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => { setUpload(event.target.files?.[0] ?? null); setError(""); }} />
          </label>
          {upload && <div className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-[6px] bg-tool-tint px-3 text-sm"><span className="min-w-0 truncate">{upload.name}</span><button type="button" aria-label="Remove selected resume" className="inline-flex min-h-11 items-center gap-1 text-tool-strong" onClick={() => setUpload(null)}><X size={16} />Remove</button></div>}
          {upload?.name.toLowerCase().endsWith(".docx") && <p className="mt-3 text-sm text-fg-2">Word edits remove existing words to preserve layout; new wording is limited.</p>}</>}
          {inputMode === "text" && <label className="mt-5 block text-sm font-medium">Resume text<textarea value={text} onChange={(event) => setText(event.target.value)} disabled={busy} rows={8} maxLength={10000} className={`${field} resize-y text-sm`} placeholder="Paste your resume, including its bullet points" /></label>}
          {resume && inputMode === "text" && <p className="mt-2 text-sm text-fg-2">Profile text loaded. Upload the original file to preserve formatting.</p>}
          <button type="button" disabled={busy} onClick={fillSample} className="mt-3 mr-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-tool px-3 text-sm font-medium text-tool-strong hover:bg-tool-tint"><FlaskConical size={16} aria-hidden="true" />Try a made-up resume</button>{!resume && <button type="button" onClick={onOpenProfile} className="mt-3 min-h-11 text-sm text-tool-strong underline underline-offset-4">Open my profile</button>}
        </div>
        <div className="border-t-2 border-tool py-5"><h2 className="font-display text-2xl">02 / The role</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Company <span className="font-normal text-fg-2">(optional)</span><input value={company} onChange={(event) => setCompany(event.target.value)} maxLength={120} disabled={busy} className={field} /></label><label className="text-sm font-medium">Role <span className="font-normal text-fg-2">(optional)</span><input value={role} onChange={(event) => setRole(event.target.value)} maxLength={120} disabled={busy} className={field} /></label></div>
          <label className="mt-4 block text-sm font-medium">Job posting <span className="font-normal text-fg-2">(optional with a company or role)</span><textarea value={posting} onChange={(event) => setPosting(event.target.value)} disabled={busy} rows={8} maxLength={2000} className={`${field} resize-y text-sm`} placeholder="Paste the requirements and responsibilities" /></label>
          <p className="mt-3 border-l-2 border-tool pl-3 text-sm text-fg-2">Your resume and the role context above are sent to AI to suggest up to six edits. We check for common unsupported additions; review every line against your experience before sharing.</p>
          <div className="mt-5 flex flex-wrap gap-3"><button type="button" className={primary} disabled={busy || (inputMode === "file" ? !upload : !text.trim()) || (!posting.trim() && !company.trim() && !role.trim())} onClick={() => void start()}><FilePenLine size={17} strokeWidth={1.75} />Tailor my resume</button>{busy && !showProgress && <button type="button" className={secondary} onClick={cancel}><X size={16} />Cancel</button>}</div>
        </div>
      </section>}
      {showProgress && busy && <section ref={progressPanel} role="status" aria-live="polite" className="my-5 border-l-4 border-tool bg-paper-2 p-5"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-display text-xl">Preparing your edits</h2><button type="button" className={secondary} onClick={cancel}>Cancel</button></div><ol className="space-y-3">{steps.map((label, i) => <li key={label} className={`flex items-start gap-3 text-sm ${i > stage ? "text-fg-3" : "text-fg"}`}>{i < stage ? <Check size={18} className="text-tool-strong" /> : i === stage ? <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none text-tool-strong" /> : <span className="mt-1 h-3 w-3 rounded-full border border-border-strong" />}<span>{label}{outcomes[i] && <span className="ml-2 text-fg-2">{outcomes[i]}</span>}</span></li>)}</ol><div aria-hidden="true" className="mt-5 space-y-2"><div className="skeleton-paper h-4 w-4/5 rounded" /><div className="skeleton-paper h-4 w-2/3 rounded" /></div></section>}
      {notice && !review && <p role="status" className="my-4 border-l-4 border-tool bg-tool-tint p-4 text-sm">{notice}</p>}
      {error && <div role="alert" className="my-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-tool bg-paper-2 p-4 text-sm"><p className="min-w-0 flex-1">{error}{!busy && !review && <span className="mt-1 block text-fg-2">Your resume and role are still filled in. Try again, or change the text above and run it again.</span>}</p>{!busy && !review && <button type="button" className={secondary} onClick={() => void start()}><RotateCw size={16} aria-hidden="true" />Try again</button>}</div>}
      {review && plan && !busy && <div className="space-y-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5"><div className="min-w-52 flex-1"><p className="font-display text-xl">03 / Review the edits</p><p className="mt-1 text-sm text-fg-2">{edits.length} suggestions · {accepted.length} accepted. Each edit is yours to keep or reject.</p><div role="progressbar" aria-label="Edits accepted" aria-valuemin={0} aria-valuemax={Math.max(1, edits.length)} aria-valuenow={accepted.length} className="mt-3 flex flex-wrap gap-1.5">{edits.map((edit) => <span key={edit.id} aria-hidden="true" className={`h-3 w-6 rounded-[2px] border ${edit.status === "accepted" ? "border-tool bg-tool" : "border-rule bg-paper-2"}`} />)}</div></div><button type="button" className={secondary} onClick={() => { controller.current?.abort(); setChanged(null); setFile(null); setEdits([]); setPlan(null); setFacts([]); setUndo(null); }}>Change inputs</button></div>
        {file.doc.source === "docx" && <p className="border-l-2 border-tool pl-4 text-sm text-fg-2">Word edits shorten wording while keeping the remaining words in order. Check the downloaded file in Word before sending it.</p>}
        {plan.keywords.length > 0 && <section aria-label="Posting keyword gaps" className="border-t border-rule py-5"><h2 className="font-display text-xl">Words from the posting</h2><p className="mt-1 text-sm text-fg-2">Only confirm a skill you genuinely have. A keyword match is not proof of experience.</p><div className="mt-3 flex flex-wrap gap-2">{[...plan.gap.required, ...plan.gap.preferred].map((term) => <div key={term.term} className="flex min-h-11 items-center gap-2 rounded-full border border-rule px-3 text-sm">{term.bucket !== "missing" && <Check size={15} className="text-tool-strong" />}<span>{term.term}</span>{(term.bucket === "missing" || facts.includes(term.term)) && <button type="button" onClick={() => toggleFact(term.term)} aria-pressed={facts.includes(term.term)} className="min-h-11 text-xs font-medium text-tool-strong">{facts.includes(term.term) ? "Confirmed" : "I have this"}</button>}</div>)}</div></section>}
        <div className="flex gap-2 lg:hidden"><button type="button" className={secondary} aria-pressed={!previewOpen} onClick={() => setPreviewOpen(false)}>Edits</button><button type="button" className={secondary} aria-pressed={previewOpen} onClick={() => setPreviewOpen(true)}><Eye size={16} />Preview</button></div>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
          <section className={`${previewOpen ? "block" : "hidden lg:block"} min-w-0 space-y-3 lg:sticky lg:top-24`} aria-label="Live preview"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl">Your resume</h2><span className="text-xs text-fg-2">{file.doc.source === "text" ? "Text preview" : file.doc.source === "docx" ? (file.doc.pageCountEstimated ? "Word document" : `${file.doc.pageCount} original ${file.doc.pageCount === 1 ? "page" : "pages"}`) : `${file.doc.pageCount} ${file.doc.pageCount === 1 ? "page" : "pages"}`}</span></div>{generated && <DocumentPreview output={generated.output} version={generated.version} onReady={markReady} highlights={generated.highlights} preparedPages={generated.preparedPages} />}{renderError && <p role="alert" className="text-sm">{renderError}</p>}<p className="text-sm text-fg-2">{file.doc.source === "docx" ? "Edits remove words while keeping their order." : file.doc.source === "text" ? "Within your original text length." : "Same visible page count as the original."}</p>
            {file.doc.source === "pdf" && accepted.length > 0 && <p role="note" className="border-l-4 border-tool bg-tool-tint p-3 text-sm"><strong>Before you share an edited PDF:</strong> replacements are visual overlays. Covered original text remains extractable from the PDF. Choose clean plain text if the old wording must be removed.</p>}
            <div className="flex flex-wrap gap-3">{file.doc.source === "pdf" && accepted.length > 0 ? <><button type="button" disabled={!ready} className={primary} onClick={() => saveResumeBytes(new TextEncoder().encode(renderPlainText(file.doc, accepted.map((edit) => ({ lineId: edit.lineId, text: edit.proposed })))), "text/plain", `${baseName}-tailored.txt`)}><Download size={16} />Download clean text</button><button type="button" disabled={!ready} className={secondary} onClick={() => generated && saveResumeBytes(generated.output.bytes, generated.output.mime, `${baseName}-tailored.${generated.output.ext}`)}>Download PDF</button></> : <><button type="button" disabled={!ready} className={primary} onClick={() => generated && saveResumeBytes(generated.output.bytes, generated.output.mime, `${baseName}-tailored.${generated.output.ext}`)}><Download size={16} />Download {generated?.output.ext.toUpperCase() ?? "resume"}</button><button type="button" disabled={!ready} className={secondary} onClick={() => saveResumeBytes(new TextEncoder().encode(renderPlainText(file.doc, accepted.map((edit) => ({ lineId: edit.lineId, text: edit.proposed })))), "text/plain", `${baseName}-tailored.txt`)}>Plain text</button></>}</div>{!ready && <p className="text-sm text-fg-2">Preview first, then download.</p>}
          </section>
          <section ref={editList} onKeyDown={handleEditKeys} aria-label="Suggested edits" className={`${previewOpen ? "hidden lg:block" : "block"} min-w-0 space-y-4`}><PlanPanel plan={plan} /><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-xl">Review each line</h2><button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm text-tool-strong underline-offset-4 hover:underline" aria-expanded={shortcutsOpen} onClick={() => setShortcutsOpen((open) => !open)}><Keyboard size={17} />Shortcuts</button></div>{shortcutsOpen && <p className="border-l-2 border-tool pl-3 text-sm text-fg-2">Focus an edit, then press J or K to move, A to accept, or R to reject. Shortcuts do not run while you type in a field.</p>}{!!acceptAllIds.length && <div className="border-t border-rule pt-3"><button type="button" className={secondary} onClick={acceptAllChecked}>Accept all {acceptAllIds.length} checked edits</button><p className="mt-2 text-sm text-fg-2">Review every accepted line against your experience before downloading.</p></div>}{edits.length ? edits.map((edit) => <EditCard key={edit.id} edit={edit} onStatus={status} onEdit={editText} />) : <div className="border-l-2 border-tool bg-paper-2 p-6"><h3 className="font-display text-lg">No changes to review</h3><p className="mt-2 text-sm text-fg-2">The drafts didn’t pass our fact and length checks, so none are shown. {posting.trim() ? "Confirm a missing skill above, or try again." : "Add a job posting for more targeted suggestions."}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" className={primary} onClick={() => void start(facts)}><RotateCw size={16} aria-hidden="true" />Draft again</button><button type="button" className={secondary} onClick={() => { controller.current?.abort(); setChanged(null); setFile(null); setEdits([]); setPlan(null); setFacts([]); setUndo(null); }}>Change inputs</button></div></div>}</section>
        </div>
      </div>}
      {review && plan && !busy && <div data-tool="tailor" className="sticky bottom-[calc(var(--nav-bottom)+0.75rem)] z-20 mx-auto mt-8 flex max-w-xl items-center justify-between gap-3 rounded-full border border-border-strong bg-surface/95 py-2 pl-5 pr-2 shadow-[var(--shadow-3)] backdrop-blur-sm"><p aria-live="polite" className="min-w-0 text-sm font-semibold"><span className="text-tool-strong">{accepted.length} of {edits.length}</span> accepted</p><button type="button" disabled={!ready || !accepted.length} className={`${primary} !min-h-11 !w-auto !px-5 !py-2 !text-base`} onClick={downloadMain}><Download size={16} />{file?.doc.source === "pdf" && accepted.length > 0 ? "Download text" : "Download"}</button></div>}
      {undo && <div role="status" className="fixed bottom-[calc(var(--nav-bottom)+1rem)] left-4 z-30 flex max-w-sm items-center gap-3 border border-rule bg-paper-2 p-3 shadow-[var(--shadow-2)]"><span className="text-sm">{undo.action}</span><button type="button" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-tool-strong" onClick={() => { status(undo.id, undo.previous); setUndo(null); }}><Undo2 size={16} />Undo</button></div>}
    </section>
  );
}
