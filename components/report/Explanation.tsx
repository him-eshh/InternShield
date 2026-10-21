import { Fragment } from "react";

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

export default function Explanation({ text, quotes, loading }: { text: string; quotes: string[]; loading?: boolean }) {
  return (
    <div className={`space-y-4 text-[19px] leading-relaxed transition-opacity duration-300 ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
      {explanationParagraphs(text).map((para, n) => (
        <p key={n}>
          {highlightParts(para, quotes).map((p, i) => (
            <Fragment key={i}>
              {p.hit ? <mark className="rounded bg-accent/15 px-0.5 text-text">{p.text}</mark> : p.text}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
