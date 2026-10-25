"use client";
import { useEffect, useState } from "react";
import { Code2, Database, Bug, Network, MessagesSquare, Phone, ChartNoAxesCombined, PanelsTopLeft, ArrowRight, Check } from "lucide-react";
import { bankTopics } from "@/lib/tiers/bank";
import { defaultConfig, roundLabel, SETUP_ROUNDS } from "@/lib/tiers/session";
import { intelRounds, intelValues, presetForCompany } from "@/lib/tiers/sessionIntel";
import { PRESETS } from "@/lib/tiers/presets";
import type { BankQuestion, RoundKind, SessionConfig, SessionLanguage } from "@/lib/tiers/types";
import type { CompanyIntel } from "@/lib/server/companyIntel";
import IntelCard from "./IntelCard";
import { btnPrimary, btnSecondary } from "../ui";

const ICONS = { coding: Code2, sql: Database, debugging: Bug, design: Network, behavioral: MessagesSquare, screen: Phone, case: ChartNoAxesCombined, portfolio: PanelsTopLeft };
const field = "min-h-12 w-full rounded-xl border border-border-strong bg-card px-3 py-2 text-text focus-visible:outline-2 focus-visible:outline-tool";
export default function Setup({ bank, initial, onStart }: { bank: BankQuestion[]; initial?: SessionConfig; onStart: (config: SessionConfig, values: string[]) => void }) {
  const [config, setConfig] = useState(() => initial ?? defaultConfig());
  const [custom, setCustom] = useState(config.customQuestions.join("\n"));
  const [intel, setIntel] = useState<CompanyIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [researched, setResearched] = useState("");
  const topics = bankTopics(bank).slice(0, 24);
  function change(patch: Partial<SessionConfig>) { setConfig((c) => ({ ...c, ...patch })); }
  useEffect(() => {
    if (!initial?.company) return;
    // A prefilled company is researched once; typing uses the explicit research button.
    void research(initial.company, initial.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial target is fixed for this setup mount
  }, []);
  async function research(company = config.company ?? "", role = config.role) {
    if (!company.trim()) return;
    setLoading(true); setResearched(company); setIntel(null);
    const preset = presetForCompany(company);
    let data: CompanyIntel | null = null;
    try {
      const res = await fetch("/api/intel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ company, role, kind: "interview" }) });
      const json = await res.json();
      data = json.status === "done" ? json.data : null;
    } catch { /* presets remain available offline */ }
    setIntel(data); setLoading(false);
    const rounds = intelRounds(data, preset);
    setConfig((c) => ({ ...c, ...(preset ? { companyPreset: preset } : {}), ...(rounds.length ? { rounds } : {}) }));
  }
  return <form className="space-y-7" onSubmit={(e) => { e.preventDefault(); onStart({ ...config, customQuestions: custom.split("\n").filter((q) => q.trim()) }, researched === config.company ? intelValues(intel) : []); }}>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2"><span className="font-medium">Company <span className="text-muted">(optional)</span></span><input className={field} maxLength={120} value={config.company ?? ""} onChange={(e) => change({ company: e.target.value })} placeholder="e.g. Amazon" /></label>
      <label className="space-y-2"><span className="font-medium">Role</span><input className={field} maxLength={120} value={config.role ?? ""} onChange={(e) => change({ role: e.target.value })} placeholder="e.g. Backend engineer" /></label>
    </div>
    <div className="flex flex-wrap items-center gap-3"><button type="button" className={btnSecondary} disabled={!config.company?.trim() || loading} onClick={() => void research()}>Research company</button><label className="flex flex-wrap items-center gap-2 text-sm">Practice preset<select aria-label="Practice preset" className={field + " !w-auto"} value={config.companyPreset ?? ""} onChange={(e) => { const p = PRESETS.find((p) => p.id === e.target.value); change({ companyPreset: p?.id, ...(p ? { rounds: p.rounds.filter((r) => SETUP_ROUNDS.includes(r)) } : {}) }); }}><option value="">Your own mix</option>{PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label></div>
    {researched && <IntelCard company={researched} intel={intel} loading={loading} preset={config.companyPreset} />}
    <fieldset><legend className="mb-3 font-display text-xl">Choose your rounds</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{SETUP_ROUNDS.map((round) => {
      const Icon = ICONS[round as keyof typeof ICONS]; const selected = config.rounds.includes(round);
      return <button key={round} type="button" aria-pressed={selected} className={`flex min-h-24 flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${selected ? "border-tool bg-tool-tint text-tool-strong" : "border-border bg-card"}`} onClick={() => change({ rounds: selected ? config.rounds.filter((r) => r !== round) : [...config.rounds, round] })}><span className="flex w-full justify-between"><Icon size={22} />{selected && <Check size={17} />}</span><span className="text-sm font-medium">{roundLabel(round)}</span></button>;
    })}</div></fieldset>
    <fieldset><legend className="mb-3 font-display text-xl">Focus on a topic</legend><p className="mb-3 text-sm text-muted">Optional · applies to coding discussion questions.</p><div className="flex flex-wrap gap-2">{topics.map((topic) => <button key={topic} type="button" aria-pressed={config.topics.includes(topic)} className={`min-h-11 rounded-full border px-3 text-sm ${config.topics.includes(topic) ? "border-tool bg-tool-tint text-tool-strong" : "border-border bg-card"}`} onClick={() => change({ topics: config.topics.includes(topic) ? config.topics.filter((t) => t !== topic) : [...config.topics, topic] })}>{topic}</button>)}</div></fieldset>
    <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="font-medium">Difficulty</span><select className={field} value={config.difficulty} onChange={(e) => change({ difficulty: e.target.value as SessionConfig["difficulty"] })}>{["easy", "medium", "hard", "mixed"].map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}</select></label><label className="space-y-2"><span className="font-medium">Language</span><select className={field} value={config.language} onChange={(e) => change({ language: e.target.value as SessionLanguage })}>{["python", "typescript", "sql", "java", "cpp", "go", "javascript"].map((l) => <option key={l} value={l}>{({ python: "Python", typescript: "TypeScript", sql: "SQL", java: "Java", cpp: "C++", go: "Go", javascript: "JavaScript" })[l]}</option>)}</select></label></div>
    <p className="text-sm text-muted">Python, TypeScript and SQL run in your browser. Java, C++, Go and JavaScript use discussion and code review. Fixed difficulty applies to bank questions; runnable exercises use their own test sets.</p>
    <label className="block space-y-2"><span className="font-medium">Your questions <span className="text-muted">(optional)</span></span><textarea className={field} rows={3} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="One question per line. We'll ask these first." maxLength={6000} /></label>
    <div className="flex flex-wrap items-end gap-3"><label className="space-y-2"><span className="block font-medium">Session length</span><input aria-label="Session length" className={field + " !w-24"} type="number" min={1} max={15} value={config.limit.count} onChange={(e) => change({ limit: { ...config.limit, count: Number(e.target.value) } })} /></label><select aria-label="Count by" className={field + " !w-auto"} value={config.limit.kind} onChange={(e) => change({ limit: { ...config.limit, kind: e.target.value as "questions" | "rounds" } })}><option value="questions">questions</option><option value="rounds">rounds</option></select></div>
    <p className="text-sm text-muted">Each round has 1–3 questions. Follow-ups stay within the same question.</p>
    <button className={btnPrimary} disabled={!config.rounds.length || loading || !bank.length}>Start session<ArrowRight size={18} /></button>
  </form>;
}
