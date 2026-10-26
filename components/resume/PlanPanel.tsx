import { ListChecks } from "lucide-react";
import type { ResumePlan } from "@/lib/tiers/resumePlan";

export function PlanPanel({ plan }: { plan: ResumePlan }) {
  return (
    <section aria-labelledby="resume-plan-title" className="border-l-2 border-tool bg-tool-tint/50 p-5" data-tool="tailor">
      <h2 id="resume-plan-title" className="flex items-center gap-2 font-display text-lg font-semibold">
        <ListChecks size={20} strokeWidth={1.75} aria-hidden="true" className="text-tool-strong" />
        What we&apos;ll emphasize
      </h2>
      {plan.role && <p className="mt-1 text-sm text-fg-2">{plan.role}{plan.company ? ` at ${plan.company}` : ""}</p>}
      {plan.limited && <p className="mt-2 text-sm text-fg-2">{plan.keywords.length ? "Using the job post only" : plan.company && plan.role ? "Using the company and role details only" : plan.role ? "Using the role details only" : "Using the company details only"}</p>}
      {plan.emphasis.length > 0 && <ul className="mt-3 list-inside list-disc space-y-1 text-sm">{plan.emphasis.map((point) => <li key={point}>{point}</li>)}</ul>}
      {plan.keywords.length > 0 && <div className="mt-3 space-y-2 text-sm">
        <p><span className="font-medium">Required: </span>{plan.gap.required.map((t) => t.term).join(", ") || "No specific tools named"}</p>
        {plan.gap.preferred.length > 0 && <p><span className="font-medium">Preferred: </span>{plan.gap.preferred.map((t) => t.term).join(", ")}</p>}
      </div>}
      {plan.sources.length > 0 && <ul aria-label="Company sources" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {plan.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-tool-strong underline underline-offset-4">{source.label}</a></li>)}
      </ul>}
    </section>
  );
}
