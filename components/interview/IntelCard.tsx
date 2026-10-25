"use client";
import { ExternalLink, Building2 } from "lucide-react";
import type { CompanyIntel } from "@/lib/server/companyIntel";
import { getPreset } from "@/lib/tiers/presets";

export default function IntelCard({ company, intel, loading, preset }: { company: string; intel: CompanyIntel | null; loading: boolean; preset?: string }) {
  const fallback = !intel || intel.limited || !intel.sources.length;
  const p = getPreset(preset);
  return <aside className="rounded-2xl border border-border bg-tool-tint p-5" aria-live="polite">
    <h2 className="flex items-center gap-2 font-display text-xl"><Building2 size={20} /> How {company} interviews</h2>
    {loading ? <p className="mt-2 text-muted">Finding interview sources…</p> : fallback ? <p className="mt-2 text-muted">Research is unavailable. Using {p ? p.label : "your selected rounds"}.</p> : <>
      <p className="mt-2">{intel.interview?.rounds.join(" · ")}</p>
      {intel.interview?.notes.slice(0, 2).map((n) => <p key={n} className="mt-2 text-sm text-muted">{n}</p>)}
      {!!intel.values?.length && <p className="mt-2 text-sm">Behavioral themes: {intel.values.join(" · ")}</p>}
      <div className="mt-3 flex flex-wrap gap-3">{intel.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm text-tool-strong underline">{s.label}<ExternalLink size={14} /></a>)}</div>
    </>}
    {fallback && p && <a href={p.source.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm underline">{p.source.label}<ExternalLink size={14} /></a>}
  </aside>;
}
