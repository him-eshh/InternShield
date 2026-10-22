// Reference sketch for Bug A (not wired into the app).
// 1) planTiles: cut a tall screenshot into strips that keep native width (<= maxW) and stay under a pixel budget.
//    PIXEL_BUDGET ~ 2048 image tokens x 32x32 px per token (Qwen3-VL convention) = ~2.1 MP. UNVERIFIED for Groq's qwen3.8: confirm via usage.prompt_tokens.
export function planTiles(w, h, { maxW = 1080, pixelBudget = 2_000_000, overlap = 0.08, maxTiles = 3 } = {}) {
  const scale = Math.min(1, maxW / w);
  const W = Math.round(w * scale), H = Math.round(h * scale);
  const tileH = Math.max(800, Math.floor(pixelBudget / W));      // 780 wide -> ~2564 px tall per strip
  if (H <= tileH) return { scale, tiles: [{ y: 0, h: H }], textScale: scale };
  const ov = Math.round(tileH * overlap);
  let n = Math.ceil((H - ov) / (tileH - ov));
  let s2 = 1;
  if (n > maxTiles) {                                              // too tall: shrink just enough to fit maxTiles strips
    s2 = (maxTiles * (tileH - ov) + ov) / H; n = maxTiles;
  }
  const HH = Math.round(H * s2), step = Math.ceil((HH - ov) / n) ;
  const tiles = [];
  for (let i = 0; i < n; i++) { const y = Math.max(0, i * step); tiles.push({ y, h: Math.min(HH - y, step + ov) }); }
  return { scale: scale * s2, tiles, textScale: scale * s2 };
}
// 2) findSeam: move a cut line to the nearest "quiet" row (uniform background between chat bubbles), so no bubble is split.
//    rows = per-row luminance variance computed from canvas getImageData (cheap: sample every 4th px).
export function findSeam(rowVariance, target, window = 120, quiet = 4) {
  let best = target, bestRun = 0;
  for (let y = Math.max(0, target - window); y < Math.min(rowVariance.length, target + window); y++) {
    let run = 0; while (y + run < rowVariance.length && rowVariance[y + run] < quiet) run++;
    if (run > bestRun) { bestRun = run; best = y + Math.floor(run / 2); }
    y += run;
  }
  return bestRun >= 6 ? best : target;                              // fall back to overlap if no gap found
}
// 3) mergeTiles: drop the longest suffix(prev) == prefix(next) overlap, comparing normalized lines with a fuzzy ratio.
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
function sim(a, b) {                                               // Dice coefficient on bigrams, 0..1
  a = norm(a); b = norm(b); if (a === b) return 1; if (a.length < 2 || b.length < 2) return 0;
  const bg = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const A = bg(a), B = bg(b); let inter = 0; for (const [k, v] of A) inter += Math.min(v, B.get(k) || 0);
  return (2 * inter) / (a.length - 1 + b.length - 1);
}
export function mergeTiles(tileLines, { maxOverlapLines = 8, threshold = 0.85 } = {}) {
  const out = [...tileLines[0]];
  for (const next of tileLines.slice(1)) {
    let k = 0;
    for (let cand = Math.min(maxOverlapLines, out.length, next.length); cand > 0; cand--) {
      const tail = out.slice(out.length - cand);
      // allow first/last line of the overlap to be a partial (cut) line
      const ok = tail.every((l, i) => sim(l, next[i]) >= threshold || ((i === 0 || i === cand - 1) && Math.min(norm(l).length, norm(next[i]).length) >= 12 && (norm(next[i]).includes(norm(l)) || norm(l).includes(norm(next[i])))));
      if (ok) { k = cand; break; }
    }
    if (k > 0) { for (let i = 0; i < k; i++) if (norm(next[i]).length > norm(out[out.length - k + i]).length) out[out.length - k + i] = next[i]; }
    out.push(...next.slice(k));
  }
  return out;
}
