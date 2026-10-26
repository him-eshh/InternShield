"use client";
import { useEffect, useState } from "react";
import * as m from "motion/react-m";
import { ArrowRight, Trophy, ExternalLink, History as HistoryIcon } from "lucide-react";
import { buildSummary, overallBand, practiceAgain, trackerCardFor, type HistoryEntry, type PracticeState } from "@/lib/tiers/session";
import { CODE_ROUNDS, roundLabel, type SessionConfig, type SessionSummary } from "@/lib/tiers/types";
import { formatDuration, summaryNumbers } from "@/lib/tiers/sessionFeedback";
import SaveToTracker from "../tiers/SaveToTracker";
import { btnPrimary, btnSecondary } from "../ui";
import { useMotion } from "../motion/useMotion";

export function Summary({ state, summary: saved, sessionId, company, role, onAgain, onHome, onOpenTracker }: { state?: PracticeState; summary?: SessionSummary; sessionId?: string; company?: string | null; role?: string | null; onAgain: (c: SessionConfig) => void; onHome: () => void; onOpenTracker: () => void }) {
  const summary = saved ?? buildSummary(state!);
  const motion = useMotion();
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (summary.endedEarly || motion.reduce) return;
    const key = `is:celebrated:${sessionId ?? state?.id ?? "recent"}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    // One small finish moment per session; revisiting history is quiet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCelebrate(true);
  }, [motion.reduce, sessionId, state?.id, summary.endedEarly]);
  const n = summaryNumbers(summary);
  const stats: [string, string, string][] = [
    ["Answered", `${n.answered} of ${n.asked}`, n.skipped ? `${n.skipped} skipped` : "none skipped"],
    ...(n.tests ? [["Tests passed", `${n.tests.passed} of ${n.tests.total}`, n.solved ? `${n.solved.done} of ${n.solved.of} problems solved` : ""] as [string, string, string]] : n.solved ? [["Queries matched", `${n.solved.done} of ${n.solved.of}`, "result equals the expected rows"] as [string, string, string]] : []),
    ["Time", formatDuration(n.seconds), n.hints ? `${n.hints} ${n.hints === 1 ? "hint" : "hints"} used` : "no hints used"],
  ];
  const overall = overallBand(summary);
  const strengths = summary.grounded ? summary.strengths?.filter((strength) => summary.turns.some((turn) => CODE_ROUNDS.includes(turn.round) && turn.code?.total && turn.feedback?.strength === strength)) ?? [] : [];
  const next = summary.grounded ? summary.next : ["Review your saved answers and choose one detail to make more specific."];
  return <div className="space-y-8"><header className="relative overflow-hidden rounded-tr-[28px] bg-tool-deep px-6 py-10 text-on-deep sm:px-10">
    {celebrate && Array.from({ length: 12 }, (_, i) => <m.span key={i} aria-hidden="true" className={`pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 ${i % 3 === 0 ? "bg-coral" : i % 3 === 1 ? "bg-teal" : "bg-violet"}`} initial={{ opacity: 0, scale: 0, x: 0, y: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.7], x: (i % 6 - 2.5) * 27, y: (Math.floor(i / 6) ? 1 : -1) * (35 + (i % 3) * 14) }} transition={{ duration: motion.t.celebrate, ease: "easeOut" }} />)}
    <m.div className="mb-4 inline-flex rotate-[-2deg] items-center gap-2 rounded-[4px] border-2 border-current px-3 py-1 font-display font-bold" initial={celebrate ? { scale: 1.2, rotate: -7 } : false} animate={{ scale: 1, rotate: -2 }} transition={motion.spring.stamp}><Trophy size={22} />{summary.endedEarly ? "Session saved" : "Session done"}</m.div>
    <h1 className="max-w-xl font-display text-4xl font-extrabold sm:text-5xl">{n.answered === 0 ? "Nothing answered yet." : n.answered === n.asked ? `All ${n.asked} answered.` : `${n.answered} of ${n.asked} answered.`}</h1><p className="mt-3 max-w-xl opacity-90">{n.answered === 0 ? "Pick up where you left off with a fresh set." : "Your results are a practice snapshot. Use the specific checks below to choose what to try next."}</p>
  </header>
    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3" aria-label="Session numbers">{stats.map(([label, value, sub]) => <div key={label} className="border-t-2 border-tool py-4"><dt className="text-sm text-fg-2">{label}</dt><dd className="mt-2 font-display text-4xl text-tool-strong">{value}</dd>{sub && <p className="mt-1 text-sm text-fg-2">{sub}</p>}</div>)}</dl>
    <section className="border-l-4 border-tool bg-tool-tint p-5"><h2 className="text-sm font-medium">Overall practice</h2><p className="mt-1 font-display text-3xl text-tool-strong">{overall}</p><p className="mt-2 text-sm text-fg-2">{overall === "Not scored" ? "Answers without runnable results are recorded without a quality grade." : "Based on runnable checks; other answers are recorded without a quality grade."} Use the details below to choose your next drill.</p></section>
    <div className="grid gap-3 sm:grid-cols-2">{summary.rounds.map((r) => { const tested = !!summary.grounded && CODE_ROUNDS.includes(r.round) && summary.turns.some((t) => t.round === r.round && (t.code?.total ?? 0) > 0); return <section key={r.round} className="rounded-2xl border border-border bg-card p-5"><h2 className="text-sm text-muted">{roundLabel(r.round)}</h2><p className="mt-2 font-display text-2xl text-tool-strong">{tested ? r.band : "Not scored"}</p>{(() => { const k = n.rounds.find((x) => x.round === r.round); return k && <p className="mt-1 text-sm text-muted">{k.answered} of {k.asked} answered{k.tests ? ` · ${k.tests.passed} of ${k.tests.total} tests passed` : k.solved ? ` · ${k.solved.done} of ${k.solved.of} queries matched` : ""}</p>; })()}<p className="mt-2 text-sm">{summary.grounded ? r.note : "Earlier feedback is hidden; your answers remain below."}</p>{tested && <dl className="mt-4 space-y-2 border-t border-border pt-3">{r.axes?.map((a) => <div key={a.id} className="flex flex-wrap justify-between gap-2 text-sm"><dt>{a.label}</dt><dd className="font-medium">{a.band}</dd></div>)}</dl>}</section>; })}</div>
    {!!strengths.length && <section className="rounded-2xl bg-tool-tint p-5"><h2 className="font-display text-xl">Build on these strengths</h2><ul className="mt-3 list-inside list-disc space-y-2">{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></section>}
    <section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-display text-xl">Practice next</h2><ol className="mt-3 list-inside list-decimal space-y-2">{[...new Set(next)].map((n, i) => <li key={i}>{n}</li>)}</ol></section>
    <section><h2 className="mb-3 font-display text-xl">Question recap</h2><div className="space-y-3">{summary.turns.map((t, i) => <details key={i} open={i === 0} className="rounded-2xl border border-border bg-card p-5"><summary className="cursor-pointer font-medium">{i + 1}. {t.title ?? t.question}<span className="ml-2 text-xs text-muted">{t.skipped ? "Skipped" : summary.grounded && t.code?.total ? t.level ?? "Answered" : "Answered"}{t.code && !t.skipped ? (t.code.language === "sql" ? ` · ${t.code.passed === t.code.total ? "query matched" : "query did not match"}` : ` · ${t.code.passed} of ${t.code.total} tests`) : ""} · {t.hintsUsed} hints</span></summary><p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted">{t.answer || "No answer saved."}</p>{summary.grounded && t.feedback && <p className="mt-3 text-sm">{t.feedback.strength} {t.feedback.improve}</p>}{t.followUps?.map((f, k) => <div key={k} className="mt-3 border-t border-border pt-3 text-sm"><p className="font-medium">{summary.grounded ? f.question : `Saved follow-up answer ${k + 1}`}</p><p className="mt-2">{f.answer}</p>{summary.grounded && <p className="mt-2 text-muted">{f.note}</p>}</div>)}<button className={`${btnSecondary} mt-3`} onClick={() => onAgain({ ...summary.config, rounds: [t.round], topics: [], customQuestions: [t.question], limit: { kind: "questions", count: 1 } })}>Retry this one<ArrowRight size={16} /></button>{t.url && <a className="ml-3 mt-3 inline-flex min-h-11 items-center gap-2 text-tool-strong underline" href={t.url} target="_blank" rel="noopener noreferrer">Review on LeetCode<ExternalLink size={14} /></a>}</details>)}</div></section>
    <div className="flex flex-wrap gap-3"><button className={btnPrimary} onClick={() => onAgain(practiceAgain(summary))}>Practice these again<ArrowRight size={17} /></button><button className={btnSecondary} onClick={onHome}>Back to Practice</button><SaveToTracker card={trackerCardFor(summary, company ?? summary.config.company, role ?? summary.config.role)} label="Add to tracker" onOpen={onOpenTracker} /></div>
  </div>;
}

export function History({ entries, onOpen }: { entries: HistoryEntry[]; onOpen: (entry: HistoryEntry) => void }) {
  return <section className="mt-10 border-t border-border pt-7"><h2 className="flex items-center gap-2 font-display text-2xl"><HistoryIcon size={22} />Past sessions</h2>{!entries.length ? <p className="mt-3 text-muted">Your completed sessions will appear here.</p> : <div className="mt-4 space-y-3">{entries.map((e) => <button key={e.id} className="flex min-h-20 w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 text-left hover:bg-tool-tint" onClick={() => onOpen(e)}><span><span className="block font-medium">{e.company || "Interview practice"}</span><span className="text-sm text-muted">{e.summary.answered} answered · {e.summary.rounds.map((r) => roundLabel(r.round)).join(", ")}</span></span><span className="text-sm text-muted">{new Date(e.finishedAt).toLocaleDateString()}</span></button>)}</div>}</section>;
}

