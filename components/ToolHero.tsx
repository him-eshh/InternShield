// One hero shape for Check, Tailor and Practice: tool-tinted wash, icon chip, title, illustration on the right.
// Colors come from the nearest data-tool wrapper, so it is right in light and dark.
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export default function ToolHero({ Icon, name, title, children, art }: { Icon: LucideIcon; name: string; title: string; children?: ReactNode; art: ReactNode }) {
  return (
    <header className="tool-hero mb-8 flex flex-wrap items-center justify-between gap-5 rounded-[var(--radius-lg)] border border-border px-5 py-6 sm:px-8 sm:py-8">
      <div className="min-w-0 flex-1 basis-80">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-tool-strong"><span aria-hidden="true" className="grid size-8 place-items-center rounded-[var(--radius-sm)] bg-tool-tint"><Icon size={18} strokeWidth={1.75} /></span>{name}</p>
        <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(2rem,4.4vw,3.2rem)] font-extrabold leading-[1.06] tracking-[-0.025em]">{title}</h1>
        {children && <p className="mt-3 max-w-[56ch] text-fg-2">{children}</p>}
      </div>
      <div aria-hidden="true" className="hidden shrink-0 sm:block">{art}</div>
    </header>
  );
}
