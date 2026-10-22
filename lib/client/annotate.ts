// Annotated-message view (brief C6): where each verified quote sits in the text the user pasted.
// Pure. Matching uses the same tolerance as lib/quotes.ts (curly quotes, dashes, spacing, case) plus
// NFKC and stripped format characters (zero-width, bidi), so a quote checked against cleaned text still
// lands on the original characters the user sees.

export interface Mark {
  n: number; // 1-based number shown on the mark and its evidence card
  flagId: string;
}

export interface Segment {
  text: string;
  start: number; // index in the original text
  marks: Mark[]; // quotes covering this segment (more than one when quotes overlap)
  ends: Mark[]; // quotes that end here (the number badge goes after these)
}

interface Folded {
  s: string;
  from: number[]; // folded index -> original start index
  to: number[]; // folded index -> original end index (exclusive)
}

function foldChar(c: string): string {
  return c
    .normalize("NFKC")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[–—]/g, "-")
    .toLowerCase();
}

function fold(text: string): Folded {
  const out: Folded = { s: "", from: [], to: [] };
  let i = 0;
  for (const c of text) {
    const end = i + c.length;
    if (/\s/.test(c)) {
      if (out.s && !out.s.endsWith(" ")) {
        out.s += " ";
        out.from.push(i);
        out.to.push(end);
      }
    } else if (!/\p{Cf}/u.test(c)) {
      for (const f of foldChar(c)) {
        out.s += f;
        out.from.push(i);
        out.to.push(end);
      }
    }
    i = end;
  }
  return out;
}

/** [start, end) of the first place `quote` appears in `text`, or null. */
export function locate(text: string, quote: string, folded: Folded = fold(text)): [number, number] | null {
  const q = fold(quote).s.trim();
  if (q.length < 3) return null;
  const at = folded.s.indexOf(q);
  if (at === -1) return null;
  return [folded.from[at], folded.to[at + q.length - 1]];
}

/**
 * Splits `text` into plain and marked segments. `flags` should be in evidence-list order: the n-th flag
 * with a quote that can be found gets number n. Repeated quotes mark the first occurrence only.
 */
export function annotate(text: string, flags: { id: string; quote: string | null }[]): { segments: Segment[]; marks: Mark[] } {
  const folded = fold(text);
  const ranges: { start: number; end: number; mark: Mark }[] = [];
  for (const f of flags) {
    if (!f.quote) continue;
    const r = locate(text, f.quote, folded);
    if (r) ranges.push({ start: r[0], end: r[1], mark: { n: ranges.length + 1, flagId: f.id } });
  }
  const cuts = [...new Set([0, text.length, ...ranges.flatMap((r) => [r.start, r.end])])].sort((a, b) => a - b);
  const segments: Segment[] = [];
  for (let k = 0; k < cuts.length - 1; k++) {
    const [a, b] = [cuts[k], cuts[k + 1]];
    if (a === b) continue;
    const cover = ranges.filter((r) => r.start <= a && r.end >= b);
    segments.push({
      text: text.slice(a, b),
      start: a,
      marks: cover.map((r) => r.mark),
      ends: cover.filter((r) => r.end === b).map((r) => r.mark),
    });
  }
  return { segments, marks: ranges.map((r) => r.mark) };
}
