// Prepare a screenshot in the browser: type/size check, scale, cut into strips, JPEG compress. Never stored.
import { findSeam, fitPayload, planTiles, rowVariance } from "./tiles";

const OK_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 20 * 1024 * 1024;

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode"));
      img.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

type PreparedStrips = { ok: true; images: string[] } | { ok: false; code: "BAD_INPUT" | "TOO_LARGE" | "TOO_TALL" };

/** Tall-screenshot path: scale to the planned width, cut at quiet seams, encode each strip as JPEG. Short images give 1 strip. */
export async function prepareStrips(file: File): Promise<PreparedStrips> {
  if (!OK_TYPES.includes(file.type)) return { ok: false, code: "BAD_INPUT" };
  if (file.size > MAX_BYTES) return { ok: false, code: "TOO_LARGE" };
  try {
    const img = await decode(file);
    try {
      if (!img.width || !img.height) return { ok: false, code: "TOO_LARGE" };
      const plan = planTiles(img.width, img.height);
      if (plan.tooTall) return { ok: false, code: "TOO_TALL" };
      const w = Math.max(1, Math.round(img.width * plan.scale));
      const h = Math.max(1, Math.round(img.height * plan.scale));
      const full = document.createElement("canvas");
      full.width = w;
      full.height = h;
      const fctx = full.getContext("2d", { willReadFrequently: true });
      if (!fctx) return { ok: false, code: "TOO_LARGE" };
      fctx.fillStyle = "#ffffff";
      fctx.fillRect(0, 0, w, h);
      fctx.drawImage(img.source, 0, 0, w, h);

      // Cut rows: strip i covers [starts[i], ends[i]); neighbours overlap around a quiet seam.
      const starts = plan.tiles.map((t) => t.y);
      const ends = plan.tiles.map((t) => Math.min(h, t.y + t.h));
      if (plan.tiles.length > 1) {
        const rv = rowVariance(fctx.getImageData(0, 0, w, h).data, w, h);
        for (let i = 1; i < plan.tiles.length; i++) {
          const ov = Math.max(0, ends[i - 1] - starts[i]);
          const seam = findSeam(rv, starts[i] + Math.round(ov / 2));
          const half = Math.round(ov / 2);
          starts[i] = Math.max(0, seam - half);
          ends[i - 1] = Math.min(h, seam + half);
        }
      }

      const canvases = starts.map((y, i) => {
        const sh = Math.max(1, ends[i] - y);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = sh;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, sh);
        ctx.drawImage(full, 0, y, w, sh, 0, 0, w, sh);
        return c;
      });
      const cache = new Map<string, string>();
      const encode = (i: number, q: number) => {
        const key = `${i}:${q}`;
        let url = cache.get(key);
        if (url === undefined) {
          url = canvases[i].toDataURL("image/jpeg", q);
          cache.set(key, url);
        }
        return url;
      };
      const qualities = fitPayload(canvases.length, (i, q) => encode(i, q).length);
      if (!qualities) return { ok: false, code: "TOO_LARGE" };
      const images = qualities.map((q, i) => encode(i, q));
      if (images.some((u) => !u.startsWith("data:image/jpeg"))) return { ok: false, code: "TOO_LARGE" };
      return { ok: true, images };
    } finally {
      img.close();
    }
  } catch {
    return { ok: false, code: "TOO_LARGE" };
  }
}
