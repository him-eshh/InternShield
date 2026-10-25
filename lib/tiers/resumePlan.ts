// Company guidance supports a plan; only resume facts authorize an edit.
import { keywordGap } from "./keywordGap";
import type { TailorPlan } from "./resumeTypes";
import type { KeywordGap } from "./types";

export interface ResumePlan extends TailorPlan {
  gap: KeywordGap;
  company: string;
  role: string;
}
export interface PlanInput {
  posting: string;
  resume: string;
  company?: string;
  role?: string;
  facts?: string[];
}

const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
const strings = (v: unknown): string[] => Array.isArray(v)
  ? [...new Set(v.filter((s): s is string => typeof s === "string" && !!s.trim()).map((s) => s.trim().slice(0, 240)))].slice(0, 4)
  : [];

/** Keep links usable and never display script URLs from an upstream response. */
function sourcesOf(v: unknown): TailorPlan["sources"] {
  if (!Array.isArray(v)) return [];
  const sources: TailorPlan["sources"] = [];
  for (const source of v.slice(0, 8)) {
    const r = record(source);
    if (typeof r?.url !== "string" || typeof r.label !== "string") continue;
    try {
      const url = new URL(r.url);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) continue;
      if (!sources.some((s) => s.url === url.href)) sources.push({ url: url.href, label: r.label.trim().slice(0, 120) || url.hostname });
    } catch { /* invalid source is not a citation */ }
  }
  return sources;
}

export function buildResumePlan(input: PlanInput, intel?: unknown): ResumePlan {
  const gap = keywordGap(input.posting, input.resume, input.facts);
  const keywords = [...gap.required, ...gap.preferred].map((t) => t.term);
  const data = record(intel);
  const sources = sourcesOf(data?.sources);
  const guidance = record(data?.resume);
  const emphasis = strings([...(strings(guidance?.emphasis)), ...strings(data?.values), ...strings(guidance?.notes)]);
  // A cap or an uncited claim must degrade to posting-only, even with partial upstream data.
  const limited = data?.limited === true || !sources.length || !emphasis.length;
  return {
    company: input.company?.trim() ?? "",
    role: input.role?.trim() ?? "",
    gap, keywords,
    missing: [...gap.required, ...gap.preferred].filter((t) => t.bucket === "missing").map((t) => t.term),
    emphasis: limited ? [] : emphasis,
    sources: limited ? [] : sources,
    limited,
  };
}

/** Uses the cached/capped intel route. Cancellation propagates; lookup failure uses posting only. */
export async function loadResumePlan(input: PlanInput, signal?: AbortSignal): Promise<ResumePlan> {
  signal?.throwIfAborted();
  if (!input.company?.trim()) return buildResumePlan(input);
  try {
    const response = await fetch("/api/intel", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ company: input.company.trim(), role: input.role?.trim() || null, kind: "resume" }),
      signal,
    });
    signal?.throwIfAborted();
    if (!response.ok) return buildResumePlan(input);
    const json = record(await response.json());
    signal?.throwIfAborted();
    return buildResumePlan(input, json?.status === "done" ? json.data : undefined);
  } catch (error) {
    if (signal?.aborted) throw error;
    return buildResumePlan(input);
  }
}
