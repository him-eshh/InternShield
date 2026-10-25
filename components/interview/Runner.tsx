"use client";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Lightbulb, SkipForward, X, ExternalLink, CheckCircle2 } from "lucide-react";
import { addHint, advance, answerFollowUp, applyQuestion, applyReview, awaiting, buildReviewRequest, canCallModel, endEarly, finishRunnable, progress, skip, skipReview, submitAnswer, syncInner, type PracticeState } from "@/lib/tiers/session";
import { askInterview } from "@/lib/tiers/client";
import { MAX_ANSWER_CHARS, type BankQuestion, type InterviewSession, type RoundPanelProps } from "@/lib/tiers/types";
import CodingRound from "../tiers/interview/CodingRound";
import SqlRound from "../tiers/interview/SqlRound";
import { btnPrimary, btnSecondary } from "../ui";

export default function Runner({ state, bank, onChange }: { state: PracticeState; bank: BankQuestion[]; onChange: (s: PracticeState) => void }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const latest = useRef(state); latest.current = state;
  const locked = useRef(false);
  const reduced = useReducedMotion();
  const c = state.current!;
  const phase = awaiting(state);
  const p = progress(state);
  function update(s: PracticeState) { latest.current = s; onChange(s); }
  async function review(s: PracticeState) {
    if (!canCallModel(s)) { setMessage("You've used this session's 30 AI calls. You can keep practicing without AI feedback."); update(skipReview(s, Date.now())); return; }
    const request = buildReviewRequest(s, "review");
    if (!request || locked.current) return;
    locked.current = true; setBusy(true); setMessage("");
    try {
      const result = await askInterview(request);
      if (result.status === "done") update(applyReview(s, result.data, Date.now()));
      else { update(skipReview({ ...s, calls: s.calls + 1 }, Date.now())); setMessage(result.message ?? "Feedback is unavailable. Continue when you're ready."); }
    } finally { locked.current = false; setBusy(false); }
  }
  async function hint(s = latest.current, inner?: InterviewSession): Promise<InterviewSession | null> {
    if (locked.current || !s.current) return null;
    if (!canCallModel(s)) { setMessage("You've used this session's 30 AI calls. Continue without a hint."); return null; }
    if (s.current.item.kind === "text" && s.current.item.round !== "coding") {
      const text = s.current.item.round === "behavioral" ? "Name the situation, your own action, and a measurable result." : "State your assumptions, outline your approach, then give one concrete example.";
      update({ ...addHint(s, text, Date.now()), calls: s.calls }); return null;
    }
    const req = buildReviewRequest(s, "hint"); if (!req) return null;
    if (inner?.code) req.code = inner.code;
    locked.current = true; setBusy(true); setMessage("");
    try {
      const r = await askInterview(req);
      if (r.status !== "done" || !r.data.text) { update({ ...s, calls: s.calls + 1 }); setMessage(r.status === "failed" ? r.message ?? "Hint unavailable." : "Hint unavailable."); return null; }
      const next = addHint(s, r.data.text, Date.now());
      const nextInner = inner ? { ...inner, hints: [...inner.hints, r.data.text] } : null;
      update(nextInner ? syncInner(next, nextInner, Date.now()) : next);
      return nextInner;
    } finally { locked.current = false; setBusy(false); }
  }
  const panel: RoundPanelProps | null = c.inner ? {
    session: c.inner, busy,
    onUpdate: (inner) => update(syncInner(latest.current, inner, Date.now())),
    ask: async (inner, ask) => {
      if (ask === "hint") return hint(latest.current, inner);
      if (ask === "feedback") { const next = finishRunnable(latest.current, inner, Date.now()); update(next); await review(next); return inner; }
      return null;
    },
  } : null;
  const pendingFollow = c.followUps.find((f) => f.answer === null);
  const feedback = c.feedback;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-tool-strong">{p.label}</p><h1 className="font-display text-2xl sm:text-3xl">Question {p.question} of {p.questions}</h1>{state.config.limit.kind === "rounds" && <p className="text-sm text-muted">Round {p.round} of {p.rounds}</p>}</div><button className={btnSecondary} disabled={busy} onClick={() => setConfirmEnd(true)}><X size={17} />End session</button></header>
    <div role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={p.questions} aria-valuenow={state.turns.length} className="flex gap-1.5">{p.segments.map((segment, i) => <div key={i} className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-bg-soft"><motion.div className={`h-full rounded-full ${segment === "current" ? "bg-tool/40" : "bg-tool"}`} initial={false} animate={{ width: segment === "done" || segment === "current" ? "100%" : "0%" }} transition={{ duration: reduced ? 0 : 0.22 }} /></div>)}</div>
    {confirmEnd && <section role="alertdialog" aria-modal="true" aria-labelledby="end-title" className="rounded-2xl border border-tool bg-tool-tint p-5"><h2 id="end-title" className="font-display text-xl">End this session?</h2><p className="mt-2 text-muted">Your completed answers will be saved in the summary.</p><div className="mt-4 flex flex-wrap gap-3"><button autoFocus className={btnSecondary} onClick={() => setConfirmEnd(false)}>Keep practicing</button><button className={btnPrimary} onClick={() => update(endEarly(latest.current, Date.now()))}>End and view summary</button></div></section>}
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted">{c.item.difficulty && <span className="rounded-full bg-tool-tint px-3 py-1 text-tool-strong">{c.item.difficulty}</span>}{c.item.tags?.slice(0, 3).map((t) => <span key={t}>{t}</span>)}</div><h2 className="font-display text-xl leading-relaxed sm:text-2xl">{c.item.question || "This question pool is complete"}</h2>{c.item.note && <p className="mt-3 text-sm text-muted">{c.item.note}</p>}{c.item.url && <a className="mt-4 inline-flex min-h-11 items-center gap-2 text-tool-strong underline" href={c.item.url} target="_blank" rel="noopener noreferrer">Read the full problem on LeetCode<ExternalLink size={16} /></a>}{!c.item.question && <button className={btnSecondary + " mt-4"} onClick={() => update(applyQuestion(state, `Discuss a new ${p.label.toLowerCase()} example from your own experience (question ${p.question}). Explain your approach and what you learned.`, Date.now()))}>Use a project discussion question</button>}</section>
    {phase === "answer" && panel && <div key={c.item.id}>{c.item.kind === "sql" ? <SqlRound {...panel} /> : <CodingRound {...panel} />}</div>}
    {phase === "answer" && !panel && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const s = submitAnswer(latest.current, draft, Date.now()); setDraft(""); update(s); void review(s); }}><label className="block font-medium" htmlFor="practice-answer">Your answer</label><textarea id="practice-answer" className="min-h-52 w-full rounded-2xl border border-border-strong bg-card p-4 font-mono text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={MAX_ANSWER_CHARS} placeholder="Talk through your approach, then add a concrete example." /><p className="text-right text-xs text-muted">{draft.length}/{MAX_ANSWER_CHARS}</p><button className={btnPrimary} disabled={busy || !draft.trim()}>Get feedback<ArrowRight size={17} /></button></form>}
    {feedback && <section className="rounded-2xl border border-border bg-card p-5" aria-live="polite"><h2 className="flex items-center gap-2 font-display text-xl"><CheckCircle2 size={20} className="text-tool-strong" />Your feedback</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><h3 className="text-sm font-semibold text-tool-strong">What worked</h3><p className="mt-1">{feedback.strength}</p></div><div><h3 className="text-sm font-semibold">Try this next</h3><p className="mt-1">{feedback.improve}</p></div></div>{feedback.quote && <blockquote className="mt-4 border-l-2 border-tool pl-4 text-sm text-muted">“{feedback.quote}”</blockquote>}</section>}
    {c.followUps.filter((f) => f.answer !== null).map((f, i) => <div key={i} className="rounded-2xl border border-border p-5"><h3 className="font-medium">{f.question}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{f.answer}</p>{f.note && <p className="mt-3 text-sm">{f.note}</p>}</div>)}
    {phase === "followup" && pendingFollow && <form className="space-y-4 rounded-2xl border border-tool bg-tool-tint p-5" onSubmit={(e) => { e.preventDefault(); const s = answerFollowUp(latest.current, draft, Date.now()); setDraft(""); update(s); void review(s); }}><p className="text-sm font-semibold text-tool-strong">Follow-up {c.followUps.length} of 2</p><h2 className="font-display text-xl">{pendingFollow.question}</h2><label className="sr-only" htmlFor="followup-answer">Your follow-up answer</label><textarea id="followup-answer" className="min-h-32 w-full rounded-xl border border-border-strong bg-card p-3" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={MAX_ANSWER_CHARS} /><button className={btnPrimary} disabled={busy || !draft.trim()}>Answer follow-up<ArrowRight size={17} /></button></form>}
    {busy && <p role="status" className="text-tool-strong">Reviewing your answer…</p>}
    {message && <p role="status" className="rounded-xl bg-bg-soft p-4 text-sm">{message}</p>}
    {!!c.hints.length && <aside className="rounded-xl bg-tool-tint p-4"><h3 className="font-medium">Hints used: {c.hints.length}</h3>{c.hints.map((h, i) => <p key={i} className="mt-2 text-sm">{h}</p>)}</aside>}
    {!confirmEnd && <div className="flex flex-wrap gap-3">{phase === "next" && <button className={btnPrimary} disabled={busy} onClick={() => { setDraft(""); setMessage(""); update(advance(latest.current, bank, Date.now())); }}>{p.question === p.questions ? "View summary" : "Next question"}<ArrowRight size={17} /></button>}{phase === "review" && !busy && <><button className={btnPrimary} onClick={() => void review(latest.current)}>Review answer</button><button className={btnSecondary} onClick={() => update(skipReview(latest.current, Date.now()))}>Continue without feedback</button></>}{phase === "answer" && !panel && <button className={btnSecondary} disabled={busy} onClick={() => void hint()}><Lightbulb size={17} />Hint · noted in scorecard</button>}<button className={btnSecondary} disabled={busy} onClick={() => { setDraft(""); setMessage(""); update(skip(latest.current, bank, Date.now())); }}><SkipForward size={17} />Skip question</button></div>}
    <p className="text-xs text-muted">AI calls: {state.calls}/30 · Your session is saved on this browser.</p>
  </div>;
}
