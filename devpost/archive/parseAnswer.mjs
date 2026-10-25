// Reference sketch for Bug C (not wired into the app). Returns every numeric candidate with its OWN unit.
const SCALE = { k: 1e3, thousand: 1e3, m: 1e6, mm: 1e6, mn: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9, t: 1e12, trillion: 1e12 };
const WORDS = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, fifteen:15, twenty:20, thirty:30, forty:40, fifty:50, hundred:100 };
const FRAC = { '½':0.5, '¼':0.25, '¾':0.75, 'and a half':0.5, 'and a quarter':0.25 };
export function normalize(s) {
  return s.replace(/(\d)\s*([½¼¾])/g, (m, d, f) => String(Number(d) + FRAC[f]))  // before NFKC (NFKC turns ½ into 1⁄2)
    .normalize('NFKC').replace(/(\d)\s*1\u20442\b/g, (m, d) => String(Number(d) + 0.5)).replace(/[\u2212\u2013\u2014]/g, '-')            // minus, en/em dash -> '-'
    .replace(/\b(seven|six|five|four|three|two|one|eight|nine|ten|twelve|fifteen|twenty|thirty|forty|fifty)\b( and a (half|quarter))?/gi,
      (m, w, f) => String(WORDS[w.toLowerCase()] + (f ? FRAC[f.trim().toLowerCase()] : 0)))
    .replace(/(\d)\s*([½¼¾])/g, (m, d, f) => String(Number(d) + FRAC[f]))
    .replace(/(\d)\s*1\/2\b/g, (m, d) => String(Number(d) + 0.5));
}
const RE = /(?<neg>\(|-)?\s*(?<cur>[$€£])?\s*(?<num>\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?)(?:\s*(?<to>-|to)\s*(?<num2>\d+(?:[.,]\d+)?))?\s*(?<scale>k|mm|mn|m|bn|b|t|thousand|million|billion|trillion)?\b\s*(?<unit>%|percent|pct|per cent|bps|basis points|x|dollars|usd)?(?<close>\))?/gi;
function toNum(raw) {
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) return Number(raw.replace(/,/g, ''));
  if (/^\d+,\d{1,2}$/.test(raw)) return Number(raw.replace(',', '.'));                     // European decimal "7,5"
  return Number(raw);
}
export function parseAnswer(input) {
  const s = normalize(input); const out = [];
  for (const m of s.matchAll(RE)) {
    const g = m.groups; if (!g.num) continue;
    let unit = '';
    if (g.cur || /dollars|usd/i.test(g.unit || '')) unit = '$';
    else if (/%|percent|pct|per cent/i.test(g.unit || '')) unit = '%';
    else if (/bps|basis points/i.test(g.unit || '')) unit = 'bps';
    else if (/^x$/i.test(g.unit || '')) unit = 'x';
    const scale = g.scale ? SCALE[g.scale.toLowerCase()] : 1;
    const sign = (g.neg === '-' || (g.neg === '(' && g.close)) ? -1 : 1;
    let value = sign * toNum(g.num) * scale;
    const value2 = g.num2 ? sign * toNum(g.num2) * scale : undefined;
    const approx = /(≈|~|approx|about|around|roughly)\s*$/i.test(s.slice(Math.max(0, m.index - 10), m.index));
    out.push({ text: m[0].trim(), value, ...(value2 !== undefined && { range: [value, value2] }), unit, scale, approx, index: m.index });
  }
  return out;
}
// Unit check: expected is the question's unit. Never format with a unit the user didn't give.
export function checkUnit(c, expected) {
  if (!c) return { ok: false, msg: 'We couldn\u2019t find a number in your answer.' };
  if (expected === '%' && c.unit === '' && Math.abs(c.value) < 1) return { ok: true, value: c.value * 100, note: `Read ${c.value} as ${+(c.value*100).toFixed(4)}%` };
  if (expected === '%' && c.unit === 'bps') return { ok: true, value: c.value / 100, note: `Read ${c.value} bps as ${c.value/100}%` };
  if (c.unit && expected && c.unit !== expected) return { ok: false, msg: `This question expects a ${expected === '%' ? 'percent' : expected === '$' ? 'dollar amount' : expected}, but your answer looks like a ${c.unit === '$' ? 'dollar amount' : c.unit === '%' ? 'percent' : c.unit}.` };
  return { ok: true, value: c.value };
}
