import { ChevronDown as ChevronIcon } from "lucide-react";

export const COULDNT_CHECK_ID = "couldnt-check";

export default function CouldntCheck({ items }: { items: { check: string; reason: string }[] }) {
  if (items.length === 0) return null;
  return (
    <details id={COULDNT_CHECK_ID} className="group rounded-[18px] border border-border bg-bg-soft">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[18px] px-5 py-4 text-[17px] font-medium text-muted [&::-webkit-details-marker]:hidden">
        <span>
          Couldn&apos;t check <span className="ml-1 text-[14px]">({items.length})</span>
        </span>
        <span className="transition-transform duration-200 group-open:rotate-180">
          <ChevronIcon size={18} />
        </span>
      </summary>
      <ul className="space-y-3 px-5 pb-5">
        {items.map((c) => (
          <li key={c.check} className="text-[15px]">
            <span className="font-medium text-text">{c.check}</span>
            <span className="block text-muted">{c.reason}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
