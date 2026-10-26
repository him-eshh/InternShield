"use client";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { prefillTarget } from "@/lib/client/storage";
import { PracticeIllustration } from "../../illustrations";
import { loadBank } from "@/lib/tiers/bank";
import { clearActive, defaultConfig, loadActive, loadHistory, newPractice, saveActive, saveToHistory, type HistoryEntry, type PracticeState } from "@/lib/tiers/session";
import type { BankQuestion, SessionConfig } from "@/lib/tiers/types";
import { useAppState } from "../../shell/AppStateProvider";
import Setup from "../../interview/Setup";
import Runner from "../../interview/Runner";
import { History, Summary } from "../../interview/Summary";
import { band, btnPrimary } from "../../ui";
export default function PracticePage() {
  const router = useRouter();
  const { ready, profile, resume, targets, prefs } = useAppState();
  const [bank, setBank] = useState<BankQuestion[]>([]);
  const [session, setSession] = useState<PracticeState | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saved, setSaved] = useState<HistoryEntry | null>(null);
  const [resumeSession, setResumeSession] = useState<PracticeState | null>(null);
  const [initial, setInitial] = useState<SessionConfig | undefined>();
  useEffect(() => {
    let live = true;
    void loadBank().then((b) => { if (live) setBank(b); });
    /* eslint-disable react-hooks/set-state-in-effect -- browser storage initializes after mount */
    const active = loadActive();
    setResumeSession(active);
    // Home's "Continue" opens /practice?resume=1: go straight back into the unfinished session.
    if (active && new URLSearchParams(window.location.search).get("resume") === "1") setSession(active);
    setHistory(loadHistory());
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => { live = false; };
  }, []);
  function update(s: PracticeState) {
    if (session?.activeQuestion?.item.id !== s.activeQuestion?.item.id) window.scrollTo(0, 0);
    setSession(s);
    if (s.status === "done") { saveToHistory(s); clearActive(); setResumeSession(null); setHistory(loadHistory()); }
    else saveActive(s);
  }
  function home(config?: SessionConfig) { setSession(null); setSaved(null); setInitial(config); window.scrollTo(0, 0); }
  if (!ready) return null;
  // A target from a report or the tracker wins; the profile's first company/role only fills an empty start.
  const target = prefillTarget(targets.practice, prefs);
  const config = initial ?? defaultConfig({ company: target?.company ?? undefined, role: target?.role ?? undefined });
  return <main data-tool="practice" className={`mx-auto w-full px-4 py-8 pb-28 sm:px-8 sm:py-12 ${session?.status === "active" && session.activeQuestion?.inner ? "max-w-7xl" : "max-w-4xl"}`}>
    {session?.status === "active" ? <Runner state={session} bank={bank} onChange={update} /> : session?.status === "done" || saved ? <Summary state={session ?? undefined} summary={saved?.summary} sessionId={session?.id ?? saved?.id} company={session?.context.company ?? saved?.company} role={session?.context.role ?? saved?.role} onAgain={home} onHome={() => home()} onOpenTracker={() => router.push("/tracker")} /> : <>
      <header className={`${band} mb-8 flex flex-wrap items-center justify-between gap-5`}><div><p className="text-sm font-semibold opacity-85">Practice / your next interview</p><h1 className="mt-2 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">Make the next answer better.</h1><p className="mt-3 max-w-xl opacity-90">Choose a few rounds, answer real questions, and see what to work on next.</p></div><PracticeIllustration size={104} className="shrink-0" /></header>
      {resumeSession && <aside className="mb-7 rounded-2xl border border-tool bg-tool-tint p-5"><h2 className="font-display text-xl">Pick up where you left off</h2><p className="mt-2 text-sm text-muted">{resumeSession.turns.length} of {resumeSession.slots.length} questions complete.</p><button className={btnPrimary + " mt-4"} onClick={() => update(resumeSession)}>Resume session<ArrowRight size={17} /></button></aside>}
      {!bank.length ? <p role="status">Loading practice questions…</p> : <Setup key={JSON.stringify(config)} bank={bank} initial={config} targetDescription={target?.description ?? null} level={profile?.level ?? null} autoResearch={!!targets.practice} onStart={(chosen, values) => {
        const s = newPractice(chosen, { company: chosen.company || null, role: chosen.role || null, description: target?.description?.slice(0, 2000) ?? null, resume: resume?.text.slice(0, 1500) ?? null, field: profile?.field ?? null, level: profile?.level ?? null, ...(chosen.companyPreset ? { preset: chosen.companyPreset as "google" | "meta" | "amazon" | "mckinsey" | "goldman" } : {}) }, { id: crypto.randomUUID(), now: Date.now(), seed: Math.floor(Math.random() * 100000), values }, bank);
        update(s);
      }} />}
      <History entries={history} onOpen={setSaved} />
      <p className="mt-8 text-xs text-muted">Question metadata from public MIT-licensed datasets. Full problem statements remain on LeetCode. Practice presets are unaffiliated.</p>
    </>}
  </main>;
}
