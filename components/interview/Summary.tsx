"use client";
import * as m from "motion/react-m";
import { useReducedMotion } from "motion/react";
import { ArrowRight, Trophy, ExternalLink, History as HistoryIcon } from "lucide-react";
import { buildSummary, practiceAgain, roundLabel, type HistoryEntry, type PracticeState } from "@/lib/tiers/session";
import type { SessionConfig, SessionSummary } from "@/lib/tiers/types";
import { formatDuration, summaryNumbers } from "@/lib/tiers/sessionFeedback";
import { btnPrimary, btnSecondary } from "../ui";

export function Summary({ state, summary: saved, onAgain, onHome }: { state?: PracticeState; summary?: SessionSummary; onAgain: (c: SessionConfig) => void; onHome: () => void }) {
  const summary = saved ?? buildSummary(state!);
  const reduced = useReducedMotion();
  const n = summaryNumbers(summary);
  const stats: [string, string, string][] = [
    ["Answered", `${n.answered} of ${n.asked}`, n.skipped ? `${n.skipped} skipped` : "none skipped"],
    ...(n.tests ? [["Tests passed", `${n.tests.passed} of ${n.tests.total}`, n.solved ? `${n.solved.done} of ${n.solved.of} problems solved` : ""] as [string, string, string]] : n.solved ? [["Queries matched", `${n.solved.done} of ${n.solved.of}`, "result equals the expected rows"] as [string, string, string]] : []),
    ["Time", formatDuration(n.seconds), n.hints ? `${n.hints} ${n.hints === 1 ? "hint" : "hints"} used` : "no hints used"],
  ];
  const bands = ["Strong", "Solid", "Developing", "Not yet"];
  const overall = summary.rounds.length ? bands[Math.round(summary.rounds.reduce((n, r) => n + bands.indexOf(r.band), 0) / summary.rounds.length)] : "Not yet";
  return <div className="space-y-6"><header className="py-4 text-center"><m.div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-tool-tint text-tool-strong" initial={reduced ? false : { scale: 0.8, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: reduced ? 0 : 0.6 }}><Trophy size={30} /></m.div><p className="text-sm font-medium text-tool-strong">{summary.endedEarly ? "Session saved" : "Session complete"}</p><h1 className="mt-2 font-display text-4xl">Keep the momentum.</h1></header>
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Session numbers">{stats.map(([label, value, sub]) => <div key={label} className="rounded-2xl border border-border bg-card p-5"><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 font-display text-3xl text-tool-strong">{value}</dd>{sub && <p className="mt-1 text-sm text-muted">{sub}</p>}</div>)}</dl>
    <section className="rounded-2xl border border-tool bg-tool-tint p-5"><h2 className="text-sm font-medium">Overall practice</h2><p className="mt-1 font-display text-3xl text-tool-strong">{overall}</p><p className="mt-2 text-sm text-muted">Across your practiced rounds. Use the scorecards below to choose your next drill.</p></section>
    <div className="grid gap-3 sm:grid-cols-2">{summary.rounds.map((r) => <section key={r.round} className="rounded-2xl border border-border bg-card p-5"><h2 className="text-sm text-muted">{roundLabel(r.round)}</h2><p className="mt-2 font-display text-2xl text-tool-strong">{r.band}</p>{(() => { const k = n.rounds.find((x) => x.round === r.round); return k && <p className="mt-1 text-sm text-muted">{k.answered} of {k.asked} answered{k.tests ? ` · ${k.tests.passed} of ${k.tests.total} tests passed` : k.solved ? ` · ${k.solved.done} of ${k.solved.of} queries matched` : ""}</p>; })()}<p className="mt-2 text-sm">{r.note}</p><dl className="mt-4 space-y-2 border-t border-border pt-3">{r.axes?.map((a) => <div key={a.id} className="flex flex-wrap justify-between gap-2 text-sm"><dt>{a.label}</dt><dd className="font-medium">{a.band}</dd></div>)}</dl></section>)}</div>
    {!!summary.strengths?.length && <section className="rounded-2xl bg-tool-tint p-5"><h2 className="font-display text-xl">Build on these strengths</h2><ul className="mt-3 list-inside list-disc space-y-2">{summary.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></section>}
    <section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-display text-xl">Practice next</h2><ol className="mt-3 list-inside list-decimal space-y-2">{summary.next.map((n, i) => <li key={i}>{n}</li>)}</ol></section>
    <section><h2 className="mb-3 font-display text-xl">Question recap</h2><div className="space-y-3">{summary.turns.map((t, i) => <details key={i} className="rounded-2xl border border-border bg-card p-5"><summary className="cursor-pointer font-medium">{i + 1}. {t.title ?? t.question}<span className="ml-2 text-xs text-muted">{t.skipped ? "Skipped" : t.level ?? "Answered"}{t.code && !t.skipped ? (t.code.language === "sql" ? ` · ${t.code.passed === t.code.total ? "query matched" : "query did not match"}` : ` · ${t.code.passed} of ${t.code.total} tests`) : ""} · {t.hintsUsed} hints</span></summary><p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted">{t.answer || "No answer saved."}</p>{t.feedback && <p className="mt-3 text-sm">{t.feedback.strength} {t.feedback.improve}</p>}{t.followUps?.map((f, k) => <div key={k} className="mt-3 border-t border-border pt-3 text-sm"><p className="font-medium">{f.question}</p><p className="mt-2">{f.answer}</p><p className="mt-2 text-muted">{f.note}</p></div>)}{t.url && <a className="mt-3 inline-flex min-h-11 items-center gap-2 text-tool-strong underline" href={t.url} target="_blank" rel="noopener noreferrer">Review on LeetCode<ExternalLink size={14} /></a>}</details>)}</div></section>
    <div className="flex flex-wrap gap-3"><button className={btnPrimary} onClick={() => onAgain(practiceAgain(summary))}>Practice these again<ArrowRight size={17} /></button><button className={btnSecondary} onClick={onHome}>Back to Practice</button></div>
  </div>;
}

export function History({ entries, onOpen }: { entries: HistoryEntry[]; onOpen: (entry: HistoryEntry) => void }) {
  return <section className="mt-10 border-t border-border pt-7"><h2 className="flex items-center gap-2 font-display text-2xl"><HistoryIcon size={22} />Past sessions</h2>{!entries.length ? <p className="mt-3 text-muted">Your completed sessions will appear here.</p> : <div className="mt-4 space-y-3">{entries.map((e) => <button key={e.id} className="flex min-h-20 w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 text-left hover:bg-tool-tint" onClick={() => onOpen(e)}><span><span className="block font-medium">{e.company || "Interview practice"}</span><span className="text-sm text-muted">{e.summary.answered} answered · {e.summary.rounds.map((r) => roundLabel(r.round)).join(", ")}</span></span><span className="text-sm text-muted">{new Date(e.finishedAt).toLocaleDateString()}</span></button>)}</div>}</section>;
}

