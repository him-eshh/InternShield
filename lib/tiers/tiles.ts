// Pure logic for cutting tall screenshots into strips and merging the per-strip transcripts. No DOM, no network.
import { MAX_IMAGE_DATA_URL } from "./types";

export type Tile = { y: number; h: number };
export type TilePlan = { scale: number; tiles: Tile[]; tooTall: boolean };
export type PlanOptions = {
  maxWidth?: number;
  pixelBudget?: number;
  overlap?: number;
  minOverlapPx?: number;
  maxTiles?: number;
  typicalTextPx?: number;
  minTextPx?: number;
};

/** Plan strips in the coordinate space of the scaled image (scale applies to the original). */
export function planTiles(width: number, height: number, opts: PlanOptions = {}): TilePlan {
  const {
    maxWidth = 1080,
    pixelBudget = 2_000_000,
    overlap = 0.08,
    minOverlapPx = 150,
    maxTiles = 2,
    // Phone screenshots (720-1290 wide) have body text near width/24 (16 px at 390, ~30 at 780).
    // ponytail: wider images are assumed desktop (16 px per 1440 px); a real text-height probe if this misjudges.
    typicalTextPx = width <= 1290 ? width / 24 : width / 90,
    minTextPx = 16,
  } = opts;
  if (!(width > 0) || !(height > 0)) return { scale: 1, tiles: [], tooTall: true };
  const base = Math.min(1, maxWidth / width);
  const W = Math.max(1, Math.round(width * base));
  const H = Math.max(1, Math.round(height * base));
  const tileH = Math.max(800, Math.floor(pixelBudget / W));
  // Groq downsizes a little itself, so tolerate up to 1.3x the budget before splitting.
  if (H * W <= pixelBudget * 1.3) return { scale: base, tiles: [{ y: 0, h: H }], tooTall: false };

  const ov = Math.max(minOverlapPx, Math.round(tileH * overlap));
  let n = Math.ceil((H - ov) / (tileH - ov));
  let shrink = 1;
  if (n > maxTiles) {
    n = maxTiles;
    shrink = (n * (tileH - ov) + ov) / H;
  }
  const scale = base * shrink;
  if (scale * typicalTextPx < minTextPx) return { scale, tiles: [], tooTall: true };

  const HH = Math.round(H * shrink);
  const step = Math.ceil((HH - ov) / n);
  const tiles: Tile[] = [];
  for (let i = 0; i < n; i++) {
    const y = i * step;
    tiles.push({ y, h: Math.min(HH - y, step + ov) });
  }
  return { scale, tiles, tooTall: false };
}

/** Per-row luminance variance, sampling every `step`th pixel of RGBA data. */
export function rowVariance(data: Uint8ClampedArray, width: number, height: number, step = 4): number[] {
  const out: number[] = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    let n = 0;
    let sum = 0;
    let sumSq = 0;
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += l;
      sumSq += l * l;
      n++;
    }
    if (n > 0) {
      const mean = sum / n;
      out[y] = Math.max(0, sumSq / n - mean * mean);
    }
  }
  return out;
}

/** Move a cut to the middle of the longest quiet run within +-window rows; keep target if no real gap. */
export function findSeam(rowVar: number[], target: number, window = 120, quiet = 4, minRun = 6): number {
  const lo = Math.max(0, target - window);
  const hi = Math.min(rowVar.length, target + window);
  let best = target;
  let bestRun = 0;
  let y = lo;
  while (y < hi) {
    if (rowVar[y] < quiet) {
      let run = 0;
      while (y + run < rowVar.length && rowVar[y + run] < quiet) run++;
      if (run > bestRun) {
        bestRun = run;
        best = y + Math.floor(run / 2);
      }
      y += run;
    } else {
      y++;
    }
  }
  return bestRun >= minRun ? best : target;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const k = s.slice(i, i + 2);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const [k, v] of A) inter += Math.min(v, B.get(k) ?? 0);
  return (2 * inter) / (a.length - 1 + b.length - 1);
}

/** Merge per-strip transcripts by suffix/prefix overlap only. Never dedupes globally. */
export function mergeTiles(texts: string[], maxOverlapLines = 8, threshold = 0.85): string {
  const split = (t: string) =>
    t
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  const parts = texts.map(split);
  if (parts.length === 0) return "";
  const out = [...parts[0]];
  for (const next of parts.slice(1)) {
    let k = 0;
    for (let cand = Math.min(maxOverlapLines, out.length, next.length); cand > 0; cand--) {
      const tail = out.slice(out.length - cand);
      let chars = 0;
      const ok = tail.every((line, i) => {
        const a = norm(line);
        const b = norm(next[i]);
        chars += Math.max(a.length, b.length);
        if (dice(a, b) >= threshold) return true;
        const edge = i === 0 || i === cand - 1;
        return edge && Math.min(a.length, b.length) >= 12 && (a.includes(b) || b.includes(a));
      });
      if (ok && chars >= 8) {
        k = cand;
        break;
      }
    }
    for (let i = 0; i < k; i++) {
      const idx = out.length - k + i;
      if (norm(next[i]).length > norm(out[idx]).length) out[idx] = next[i];
    }
    out.push(...next.slice(k));
  }
  return out.join("\n");
}

export const JPEG_QUALITIES = [0.85, 0.7, 0.55];
// Findings A2: 3.5 MB of strips (under Vercel's 4.5 MB); guard.ts caps a transcribe body at 3.6 MiB.
export const MAX_PAYLOAD_BASE64 = MAX_IMAGE_DATA_URL;

/**
 * Choose a JPEG quality per strip so the total encoded size fits. Lowers the largest strip first,
 * never touches resolution. `sizeAt(i, quality)` returns the encoded size of strip i. Null = cannot fit.
 */
export function fitPayload(
  count: number,
  sizeAt: (index: number, quality: number) => number,
  maxTotal = MAX_PAYLOAD_BASE64,
  qualities: number[] = JPEG_QUALITIES,
): number[] | null {
  const level = new Array<number>(count).fill(0);
  const sizes = Array.from({ length: count }, (_, i) => sizeAt(i, qualities[0]));
  for (;;) {
    const total = sizes.reduce((a, b) => a + b, 0);
    if (total <= maxTotal) return level.map((l) => qualities[l]);
    let pick = -1;
    for (let i = 0; i < count; i++) {
      if (level[i] < qualities.length - 1 && (pick < 0 || sizes[i] > sizes[pick])) pick = i;
    }
    if (pick < 0) return null;
    level[pick]++;
    sizes[pick] = sizeAt(pick, qualities[level[pick]]);
  }
}
