// Unicode cleanup (research 01 > rule 4). Pure. Runs before the regex backstop and the AI extract,
// so invisible characters, look-alike letters, and "W h a t s A p p" spacing can't hide a warning sign.
// `map` ties every cleaned character back to the message the user actually sees, so quotes can be
// shown word for word (lib/quotes.ts).

export interface CleanResult {
  text: string;
  /** map[i] = index in the original string of the character that produced text[i]. */
  map: number[];
  /** Hidden characters removed (zero-width, bidi, tag, other format characters). Emoji joiners don't count. */
  stripped: number;
  /** Look-alike Cyrillic/Greek letters swapped for Latin ones inside a word that also has Latin letters. */
  replaced: number;
}

const lookalikes = (from: string, to: string): [string, string][] => Array.from(from).map((c, i) => [c, to[i]]);

const CONFUSABLES = new Map<string, string>([
  // Cyrillic lowercase: а е о р с у х і ј ѕ ԁ ԛ ԝ һ ӏ
  ...lookalikes("аеорсухіјѕԁԛԝһӏ", "aeopcyxijsdqwhl"),
  // Cyrillic uppercase: А В Е К М Н О Р С Т Х У І Ј Ѕ Ԛ Ԝ
  ...lookalikes("АВЕКМНОРСТХУІЈЅԚԜ", "ABEKMHOPCTXYIJSQW"),
  // Greek uppercase: Α Β Ε Ζ Η Ι Κ Μ Ν Ο Ρ Τ Υ Χ
  ...lookalikes("ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ", "ABEZHIKMNOPTYX"),
  // Greek lowercase: ο α ν ρ ι κ υ χ
  ...lookalikes("οανρικυχ", "oavpikux"),
]);

// Format characters (\p{Cf}: zero-width, bidi, tag characters, soft hyphen), variation selectors,
// and a few invisible fillers.
const INVISIBLE = new RegExp("^[\\p{Cf}\\u034F\\u115F\\u1160\\u180E\\u3164\\uFFA0\\uFE00-\\uFE0F\\u{E0100}-\\u{E01EF}]$", "u");
const BENIGN = new Set([0x00ad, 0x200e, 0x200f, 0x034f]);
const PICTOGRAPHIC =new RegExp("\\p{Extended_Pictographic}", "u");
const WORD_CHAR = new RegExp("[\\p{L}\\p{M}\\p{N}]", "u");
const LATIN = /[A-Za-z]/;

// "p a y", "W h a t s A p p", "U S D T", "p.a.y": 3+ single letters split by single spaces (or dots).
// Dots are skipped inside emails, hosts and paths ("a.b.c@x.com").
const SPACED = new RegExp(
  "(?<![\\p{L}\\p{N}@./_-])\\p{L}(?: \\p{L}){2,}(?![\\p{L}\\p{N}@/_-])" +
    "|(?<![\\p{L}\\p{N}@./_-])\\p{L}(?:\\.\\p{L}){2,}(?![\\p{L}\\p{N}@/_-]|\\.\\p{L})",
  "gu",
);

function isEmojiJoiner(cp: number): boolean {
  return cp === 0x200d || cp === 0xfe0f || cp === 0xfe0e;
}

export function cleanText(raw: string): CleanResult {
  // Pass 1: NFKC one code point at a time (keeps the index map exact), dropping invisible characters.
  const chars: string[] = [];
  const idx: number[] = [];
  let stripped = 0;
  let prevPictographic = false;
  for (let i = 0; i < raw.length; ) {
    const cp = raw.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    const next = i + ch.length;
    if (INVISIBLE.test(ch)) {
      // Emoji sequences use these legitimately; only count them elsewhere.
      const nextCp = next < raw.length ? raw.codePointAt(next)! : -1;
      const emoji = isEmojiJoiner(cp) && (prevPictographic || (cp === 0x200d && nextCp >= 0 && PICTOGRAPHIC.test(String.fromCodePoint(nextCp))));
      // Soft hyphens, LRM/RLM and U+034F show up in ordinary newsletters and RTL names: strip, don't count.
      if (!emoji && !BENIGN.has(cp)) stripped++;
      i = next;
      continue;
    }
    prevPictographic = PICTOGRAPHIC.test(ch);
    const out = cp === 0x2028 || cp === 0x2029 ? "\n" : ch.normalize("NFKC");
    for (let k = 0; k < out.length; k++) {
      chars.push(out[k]);
      idx.push(i);
    }
    i = next;
  }

  // Pass 2: look-alike letters, only inside a word that also has Latin letters (so real Russian or Greek text is left alone).
  let replaced = 0;
  for (let s = 0; s < chars.length; ) {
    if (!WORD_CHAR.test(chars[s])) {
      s++;
      continue;
    }
    let e = s;
    while (e < chars.length && WORD_CHAR.test(chars[e])) e++;
    let hasLatin = false;
    let hasLookalike = false;
    for (let k = s; k < e; k++) {
      if (LATIN.test(chars[k])) hasLatin = true;
      else if (CONFUSABLES.has(chars[k])) hasLookalike = true;
    }
    if (hasLatin && hasLookalike) {
      for (let k = s; k < e; k++) {
        const to = CONFUSABLES.get(chars[k]);
        if (to) {
          chars[k] = to;
          replaced++;
        }
      }
    }
    s = e;
  }

  // Pass 3: letter-spacing tricks.
  const joined = chars.join("");
  const text: string[] = [];
  const map: number[] = [];
  let at = 0;
  const keep = (from: number, to: number, collapse: boolean) => {
    for (let k = from; k < to; k++) {
      if (collapse && (joined[k] === " " || joined[k] === ".")) continue;
      text.push(joined[k]);
      map.push(idx[k]);
    }
  };
  for (const m of joined.matchAll(SPACED)) {
    const start = m.index ?? 0;
    keep(at, start, false);
    keep(start, start + m[0].length, true);
    at = start + m[0].length;
  }
  keep(at, joined.length, false);

  return { text: text.join(""), map, stripped, replaced };
}
