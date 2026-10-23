// Quote Check (spec.md > Quote Check). Shared by the extract route and the scoring engine.
// Tolerant of Unicode tricks: a quote read from the cleaned text still matches the message the user sees,
// and `originalQuote` hands back the exact original wording (hidden characters and all).
import { cleanText, type CleanResult } from "./scoring/unicode";

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

const FOLD = new Map<string, string>([
  ...Array.from("‘’‚‛′").map((c): [string, string] => [c, "'"]),
  ...Array.from("“”„‟″").map((c): [string, string] => [c, '"']),
  ...Array.from("–—").map((c): [string, string] => [c, "-"]),
]);

/** Same folding as `normalize`, but keeps a map from each output character to its index in `s`. */
function normalizeWithMap(s: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  let spaceAt = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      if (spaceAt < 0) spaceAt = i;
      continue;
    }
    if (spaceAt >= 0 && text.length > 0) {
      text += " ";
      map.push(spaceAt);
    }
    spaceAt = -1;
    const out = (FOLD.get(ch) ?? ch).toLowerCase();
    for (let k = 0; k < out.length; k++) {
      text += out[k];
      map.push(i);
    }
  }
  return { text, map };
}

let memo: { raw: string; norm: string; clean: CleanResult; cleanNorm: string } | null = null;
function prepared(message: string) {
  if (memo?.raw === message) return memo;
  const clean = cleanText(message);
  memo = { raw: message, norm: normalize(message), clean, cleanNorm: normalize(clean.text) };
  return memo;
}

export function quoteIsReal(quote: string | null | undefined, message: string): boolean {
  if (!quote) return false;
  const q = normalize(quote);
  if (q.length < 3 || q.length > MAX_QUOTE_CHARS) return false;
  const m = prepared(message);
  if (m.norm.includes(q)) return true;
  if (m.clean.text !== message && m.cleanNorm.includes(q)) return true;
  const qc = normalize(cleanText(quote).text);
  return qc.length >= 3 && qc !== q && m.cleanNorm.includes(qc);
}

const unitLength = (s: string, i: number) => ((s.codePointAt(i) ?? 0) > 0xffff ? 2 : 1);

/**
 * The exact text in `message` that a quote refers to, or null if it isn't there.
 * For a quote read from the cleaned text this includes any hidden characters, so it matches what the user sees.
 */
export function originalQuote(quote: string, message: string): string | null {
  const q = normalizeWithMap(quote).text;
  if (q.length < 3) return null;
  const direct = normalizeWithMap(message);
  const d = direct.text.indexOf(q);
  if (d >= 0) return message.slice(direct.map[d], direct.map[d + q.length - 1] + 1);

  const { clean } = prepared(message);
  const cleaned = normalizeWithMap(clean.text);
  let needle = q;
  let at = cleaned.text.indexOf(needle);
  if (at < 0) {
    needle = normalizeWithMap(cleanText(quote).text).text;
    at = needle.length >= 3 ? cleaned.text.indexOf(needle) : -1;
  }
  if (at < 0) return null;
  const first = clean.map[cleaned.map[at]];
  const last = clean.map[cleaned.map[at + needle.length - 1]];
  return message.slice(first, last + unitLength(message, last));
}

/** The quote as it reads in the user's message: unchanged when it already matches, else the original wording. */
export function visibleQuote(quote: string | null, message: string): string | null {
  if (!quote) return quote;
  if (prepared(message).norm.includes(normalize(quote))) return quote;
  return originalQuote(quote, message) ?? quote;
}
