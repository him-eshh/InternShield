"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Code2, Database, Bug, Network, MessagesSquare, Phone, ChartNoAxesCombined, PanelsTopLeft, ArrowRight, Check, ChevronDown, Info, Search, X, TrendingUp } from "lucide-react";
import { bankCompanies, bankTopics, filterBank } from "@/lib/tiers/bank";
import { companyScope, groupTopics } from "@/lib/tiers/bankPool";
import { defaultConfig, SETUP_ROUNDS } from "@/lib/tiers/session";
import { intelRounds, intelValues, presetForCompany } from "@/lib/tiers/sessionIntel";
import { PRESETS } from "@/lib/tiers/presets";
import { roundLabel, type BankQuestion, type SessionConfig, type SessionLanguage } from "@/lib/tiers/types";
import type { CompanyIntel } from "@/lib/server/companyIntel";
import type { UserLevel } from "@/lib/types";
import IntelCard from "./IntelCard";
import { btnPrimary, btnSecondary } from "../ui";

const ICONS = { coding: Code2, sql: Database, debugging: Bug, design: Network, behavioral: MessagesSquare, screen: Phone, case: ChartNoAxesCombined, portfolio: PanelsTopLeft };
const field = "min-h-12 w-full rounded-xl border border-border-strong bg-card px-3 py-2 text-text focus-visible:outline-2 focus-visible:outline-tool";
const panel = "space-y-5 border-t border-rule py-6";
const LANG_LABEL: Record<SessionLanguage, string> = { python: "Python", typescript: "TypeScript", sql: "SQL", java: "Java", cpp: "C++", go: "Go", javascript: "JavaScript" };

/** A select with its own chevron, so it reads as a control and not as a bare browser dropdown. */
function SelectField({ label, value, onChange, children, className = "" }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  return (
    <span className={`relative block ${className}`}>
      <select aria-label={label} className={`${field} cursor-pointer appearance-none pr-10 font-medium`} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
      <ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </span>
  );
}

export default function Setup({ bank, initial, targetDescription = null, level = null, autoResearch = true, onStart }: { bank: BankQuestion[]; initial?: SessionConfig; targetDescription?: string | null; level?: UserLevel | null; /** Look up a prefilled company on mount. Off for a company that only came from the profile (no surprise lookups). */ autoResearch?: boolean; onStart: (config: SessionConfig, values: string[]) => void }) {
  const [config, setConfig] = useState(() => initial ?? defaultConfig());
  const [customError, setCustomError] = useState("");
  const [custom, setCustom] = useState(config.customQuestions.join("\n"));
  const [intel, setIntel] = useState<CompanyIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [researched, setResearched] = useState("");
  const [topicQuery, setTopicQuery] = useState("");
  const allTopics = useMemo(() => bankTopics(bank), [bank]);
  const companies = useMemo(() => bankCompanies(bank).slice(0, 60), [bank]);
  const scope = useMemo(() => companyScope(bank, config.company), [bank, config.company]);
  const exactCount = useMemo(() => (scope.kind === "exact" ? filterBank(bank, { company: config.company }).length : 0), [bank, config.company, scope.kind]);
  const query = topicQuery.trim().toLowerCase();
  const groups = useMemo(() => groupTopics(allTopics).map((g) => ({ ...g, topics: query ? g.topics.filter((t) => t.includes(query)) : g.topics })).filter((g) => g.topics.length), [allTopics, query]);
  function change(patch: Partial<SessionConfig>) { setConfig((c) => ({ ...c, ...patch })); }
  const toggleTopic = (t: string) => change({ topics: config.topics.includes(t) ? config.topics.filter((x) => x !== t) : [...config.topics, t] });
  useEffect(() => {
    if (!autoResearch || !initial?.company) return;
    // A prefilled company is researched once; typing uses the explicit research button.
    void research(initial.company, initial.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial target is fixed for this setup mount
  }, []);
  async function research(company = config.company ?? "", role = config.role) {
    if (!company.trim()) return null;
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
    return { data, rounds, preset };
  }
  const companyName = config.company?.trim() ?? "";
  const mostAskedLabel = companyName ? `Most asked at ${companyName}` : "Most asked across top companies";
  return <form className="space-y-6" onSubmit={async (e) => {
    e.preventDefault();
    const customQuestions = custom.split("\n").filter((q) => q.trim());
    if (customQuestions.some((q) => q.length > 400)) { setCustomError("Keep each question under 400 characters so it can be asked verbatim."); return; }
    if (config.company?.trim() && researched !== config.company) {
      const result = await research();
      onStart({ ...config, customQuestions, ...(result?.preset ? { companyPreset: result.preset } : {}), ...(result?.rounds.length ? { rounds: result.rounds } : {}) }, intelValues(result?.data ?? null));
    } else onStart({ ...config, customQuestions }, researched === config.company ? intelValues(intel) : []);
  }}>
    <section className={panel} aria-labelledby="setup-target">
      <h2 id="setup-target" className="font-display text-xl">Who are you practicing for?</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2"><span className="font-medium">Company <span className="text-muted">(optional)</span></span><input disabled={loading} list="bank-companies" className={field} maxLength={120} value={config.company ?? ""} onChange={(e) => change({ company: e.target.value })} placeholder="e.g. Amazon, Stripe" autoComplete="off" /><datalist id="bank-companies">{companies.map((c) => <option key={c} value={c} />)}</datalist></label>
        <label className="space-y-2"><span className="font-medium">Role</span><input disabled={loading} className={field} maxLength={120} value={config.role ?? ""} onChange={(e) => change({ role: e.target.value })} placeholder="e.g. Backend engineer" /></label>
      </div>
      {(targetDescription || level) && <p className="flex items-start gap-2 rounded-xl bg-tool-tint p-3 text-sm"><Info size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-tool-strong" />Questions will use {targetDescription ? "the selected job description" : "your selected role"}{level ? ` and your ${level.replace("_", " ")} level` : ""} as context. Posting text guides the interview; it is not treated as your experience.</p>}
      {companyName && (scope.kind === "exact"
        ? <p className="flex items-start gap-2 text-sm text-muted"><Check size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-tool-strong" />{exactCount} {scope.label} coding questions in the bank (historical tags from public 2022 lists, not current employer frequency).</p>
        : scope.message && <p role="status" className="flex items-start gap-2 rounded-xl bg-tool-tint p-3 text-sm"><Info size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-tool-strong" />{scope.message} Behavioral and design questions still use your company and role.</p>)}
      <div className="flex flex-wrap items-center gap-3"><button type="button" className={btnSecondary} disabled={!config.company?.trim() || loading} onClick={() => void research()}>Research company</button><label className="flex flex-wrap items-center gap-2 text-sm font-medium">Practice preset<SelectField label="Practice preset" className="min-w-52" value={config.companyPreset ?? ""} onChange={(id) => { const p = PRESETS.find((p) => p.id === id); change({ companyPreset: p?.id, ...(p ? { rounds: p.rounds.filter((r) => SETUP_ROUNDS.includes(r)) } : {}) }); }}><option value="">Your own mix</option>{PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</SelectField></label></div>
      {researched && <IntelCard company={researched} intel={intel} loading={loading} preset={config.companyPreset} />}
    </section>

    <fieldset className={panel}><legend className="float-left mb-3 w-full font-display text-xl">Choose your rounds</legend><div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">{SETUP_ROUNDS.map((round) => {
      const Icon = ICONS[round as keyof typeof ICONS]; const selected = config.rounds.includes(round);
      return <button key={round} type="button" aria-pressed={selected} className={`flex min-h-24 flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${selected ? "border-tool bg-tool-tint text-tool-strong" : "border-border bg-card hover:bg-bg-soft"}`} onClick={() => change({ rounds: selected ? config.rounds.filter((r) => r !== round) : [...config.rounds, round] })}><span className="flex w-full justify-between"><Icon size={22} />{selected && <Check size={17} />}</span><span className="text-sm font-medium">{roundLabel(round)}</span></button>;
    })}</div></fieldset>

    <section className={panel} aria-labelledby="setup-focus">
      <h2 id="setup-focus" className="font-display text-xl">Focus</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2"><span className="font-medium">Difficulty</span><SelectField label="Difficulty" value={config.difficulty} onChange={(v) => change({ difficulty: v as SessionConfig["difficulty"] })}>{["easy", "medium", "hard", "mixed"].map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}</SelectField></label>
        <label className="space-y-2"><span className="font-medium">Language</span><SelectField label="Language" value={config.language} onChange={(v) => change({ language: v as SessionLanguage })}>{(Object.keys(LANG_LABEL) as SessionLanguage[]).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}</SelectField></label>
      </div>
      <p className="text-sm text-muted">Python, TypeScript and SQL run in your browser. Java, C++, Go and JavaScript use discussion and code review. Fixed difficulty applies to bank questions; runnable exercises use their own test sets.</p>
      {config.rounds.includes("coding") && <button type="button" role="switch" aria-checked={!!config.mostAsked} className={`flex min-h-14 w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${config.mostAsked ? "border-tool bg-tool-tint" : "border-border bg-card hover:bg-bg-soft"}`} onClick={() => change({ mostAsked: !config.mostAsked })}>
        <span aria-hidden="true" className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors ${config.mostAsked ? "justify-end border-tool bg-tool" : "justify-start border-border-strong bg-bg-soft"}`}><span className={`h-4 w-4 rounded-full ${config.mostAsked ? "bg-on-tool" : "bg-border-strong"}`} /></span>
        <span><span className="flex items-center gap-2 font-medium"><TrendingUp size={17} aria-hidden="true" />{mostAskedLabel}</span><span className="mt-1 block text-sm text-muted">Starts with the coding questions that appear on the most company lists (public 2022 lists, so they show what was asked, not what is asked today).</span></span>
      </button>}
      <fieldset>
        <legend className="mb-1 font-medium">Topics <span className="text-muted">(optional, coding questions)</span></legend>
        {!!config.topics.length && <ul className="mb-3 flex flex-wrap gap-2" aria-label="Selected topics">{config.topics.map((t) => <li key={t}><button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-tool bg-tool-tint px-3 text-sm text-tool-strong" aria-label={`Remove topic ${t}`} onClick={() => toggleTopic(t)}>{t}<X size={14} aria-hidden="true" /></button></li>)}</ul>}
        <label className="relative block"><span className="sr-only">Search topics</span><Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input type="search" className={`${field} pl-10`} value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} placeholder={`Search ${allTopics.length} topics`} /></label>
        <div className="mt-3 space-y-2">
          {!groups.length && <p className="text-sm text-muted">No topic matches “{topicQuery}”.</p>}
          {groups.map((g, i) => {
            const picked = g.topics.filter((t) => config.topics.includes(t)).length;
            return <details key={g.label + (query ? "-q" : "")} open={!!query || i === 0} className="group rounded-xl border border-border bg-bg-soft/50">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-2 font-medium [&::-webkit-details-marker]:hidden"><span>{g.label} <span className="text-sm font-normal text-muted">{g.topics.length}{picked ? ` · ${picked} selected` : ""}</span></span><ChevronDown size={18} aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180" /></summary>
              <div className="flex flex-wrap gap-2 px-4 pb-4">{g.topics.map((topic) => <button key={topic} type="button" aria-pressed={config.topics.includes(topic)} className={`min-h-11 rounded-full border px-3 text-sm ${config.topics.includes(topic) ? "border-tool bg-tool-tint text-tool-strong" : "border-border bg-card hover:bg-bg-soft"}`} onClick={() => toggleTopic(topic)}>{topic}</button>)}</div>
            </details>;
          })}
        </div>
      </fieldset>
    </section>

    <section className={panel} aria-labelledby="setup-length">
      <h2 id="setup-length" className="font-display text-xl">Session</h2>
      <label className="block space-y-2"><span className="font-medium">Your questions <span className="text-muted">(optional)</span></span><textarea className={field} rows={3} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="One question per line. We'll ask these first." maxLength={6000} /></label>
      {customError && <p role="alert" className="text-sm">{customError}</p>}
      <div className="flex flex-wrap items-end gap-3"><label className="space-y-2"><span className="block font-medium">Session length</span><input aria-label="Session length" className={field + " !w-24"} type="number" min={1} max={15} value={config.limit.count} onChange={(e) => change({ limit: { ...config.limit, count: Number(e.target.value) } })} /></label><SelectField label="Count by" className="w-40" value={config.limit.kind} onChange={(v) => change({ limit: { ...config.limit, kind: v as "questions" | "rounds" } })}><option value="questions">questions</option><option value="rounds">rounds</option></SelectField></div>
      <p className="text-sm text-muted">Each round has 1–3 questions. Follow-ups stay within the same question.</p>
    </section>
    <aside className="border-l-4 border-tool bg-tool-tint px-5 py-4" aria-live="polite">
      <p className="font-display text-xl">Your session at a glance</p>
      <p className="mt-1 text-sm text-fg-2">{config.limit.count} {config.limit.kind} · {config.rounds.length ? config.rounds.map(roundLabel).join(", ") : "Choose at least one round"}</p>
      <p className="mt-1 text-sm text-fg-2">About {Math.max(1, config.limit.kind === "questions" ? config.limit.count : config.limit.count * 2) * 4} minutes. Your progress is saved on this device.</p>
    </aside>
    <button className={btnPrimary} disabled={!config.rounds.length || loading || !bank.length}>Start session<ArrowRight size={18} /></button>
    <p className="text-xs text-muted">Question metadata comes from two MIT-licensed public datasets; notices are in data/question-bank/LICENSES.md. Not affiliated with LeetCode.</p>
  </form>;
}
