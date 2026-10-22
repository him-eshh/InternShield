import { SEVERITY_LABEL, severityOf, topReasons } from "@/lib/reportView";
import type { Flag } from "@/lib/types";

/** The three most severe red flags in one glance. Renders nothing when there are none. */
export default function TopReasons({ flags }: { flags: Flag[] }) {
  const top = topReasons(flags);
  if (top.length === 0) return null;
  return (
    <section aria-labelledby="top-reasons-title">
      <h3 id="top-reasons-title" className="text-[13px] font-semibold uppercase tracking-wide text-muted">Top reasons</h3>
      <ol className="mt-3 space-y-2.5">
        {top.map((f, i) => (
          <li key={f.id} className="flex items-baseline gap-3 text-[17px] leading-snug">
            <span aria-hidden="true" className="w-4 shrink-0 text-right tabular-nums text-fg-3">{i + 1}</span>
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {f.title}
              <span className="ml-2 whitespace-nowrap text-[13px] font-medium text-fg-2">{SEVERITY_LABEL[severityOf(f)]}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
