// Quote Check (spec.md > Quote Check). Shared by the extract route and the scoring engine.

export const MAX_QUOTE_CHARS = 200;

function normalize(s: string): string {
  return s
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function quoteIsReal(quote: string | null | undefined, message: string): boolean {
  if (!quote) return false;
  const q = normalize(quote);
  if (q.length < 3 || q.length > MAX_QUOTE_CHARS) return false;
  return normalize(message).includes(q);
}
