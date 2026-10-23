import { Fragment } from "react";
import { explanationSections } from "@/lib/explainFallback";

/** Split `text` into plain and highlighted parts, marking any span that matches a flag quote. */
export function highlightParts(text: string, quotes: string[]): { text: string; hit: boolean }[] {
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const q of quotes) {
    const needle = q.trim().toLowerCase();
    if (needle.length < 8) continue;
    let from = 0;
    for (;;) {
      const i = lower.indexOf(needle, from);
      if (i < 0) break;
      ranges.push([i, i + needle.length]);
      from = i + needle.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  const parts: { text: string; hit: boolean }[] = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) parts.push({ text: text.slice(pos, s), hit: false });
    parts.push({ text: text.slice(s, e), hit: true });
    pos = e;
  }
  if (pos < text.length) parts.push({ text: text.slice(pos), hit: false });
  return parts;
}

/** At most two paragraphs (split on blank lines). */
export function explanationParagraphs(text: string): string[] {
  const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (parts.length ? parts : [text.trim()]).slice(0, 2);
}

function Highlighted({ text, quotes }: { text: string; quotes: string[] }) {
  return (
    <>
      {highlightParts(text, quotes).map((p, i) => (
        <Fragment key={i}>{p.hit ? <mark className="quote-mark">{p.text}</mark> : p.text}</Fragment>
      ))}
    </>
  );
}

interface Props {
  text: string;
  quotes: string[];
  loading?: boolean;
  /** "fallback" text is pre-written in titled sections; lay those out instead of paragraphs. */
  source?: "ai" | "fallback";
}

export default function Explanation({ text, quotes, loading, source }: Props) {
  const sections = source === "fallback" ? explanationSections(text) : null;
  if (sections) {
    return (
      <div className={`space-y-6 break-words transition-opacity duration-300 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
        {sections.map((sec, n) => (
          <section key={n} aria-label={sec.title || undefined}>
            {sec.title && <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{sec.title}</h3>}
            {sec.kind === "list" ? (
              <ul className="mt-2 space-y-2.5">
                {sec.items.map((item, i) => (
                  <li key={i} className="flex gap-3 text-[17px] leading-relaxed">
                    <span aria-hidden="true" className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-muted" />
                    <span className="min-w-0">
                      <Highlighted text={item} quotes={quotes} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`mt-1.5 leading-relaxed ${n === 0 ? "text-[19px] font-medium" : "text-[17px]"}`}>
                <Highlighted text={sec.items.join(" ")} quotes={quotes} />
              </p>
            )}
          </section>
        ))}
      </div>
    );
  }
  return (
    <div className={`space-y-4 break-words text-[19px] leading-relaxed transition-opacity duration-300 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
      {explanationParagraphs(text).map((para, n) => (
        <p key={n}>
          <Highlighted text={para} quotes={quotes} />
        </p>
      ))}
    </div>
  );
}
