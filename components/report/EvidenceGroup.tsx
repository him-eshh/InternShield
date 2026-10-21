import type { Flag, FlagGroup } from "@/lib/types";
import EvidenceCard from "./EvidenceCard";

const TITLES: Record<FlagGroup, string> = { sender: "Sender", message: "Message", offer: "Offer" };

export function countLabel(flags: Flag[]): string {
  const red = flags.filter((f) => f.kind === "red").length;
  const good = flags.length - red;
  const parts: string[] = [];
  if (red) parts.push(`${red} red flag${red === 1 ? "" : "s"}`);
  if (good) parts.push(`${good} good sign${good === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "Nothing found";
}

export default function EvidenceGroup({ group, flags }: { group: FlagGroup; flags: Flag[] }) {
  const ordered = [...flags].sort((a, b) => Number(b.critical) - Number(a.critical) || (a.kind === b.kind ? 0 : a.kind === "red" ? -1 : 1));
  return (
    <section aria-labelledby={`group-${group}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 id={`group-${group}`} className="text-[24px] font-semibold tracking-[-0.02em]">
          {TITLES[group]}
        </h3>
        <span className="rounded-full bg-bg-soft px-3 py-1 text-[14px] text-muted">{countLabel(flags)}</span>
      </div>
      {ordered.length > 0 && (
        <ul className="mt-4 space-y-3">
          {ordered.map((f) => (
            <EvidenceCard key={f.id} flag={f} />
          ))}
        </ul>
      )}
    </section>
  );
}
