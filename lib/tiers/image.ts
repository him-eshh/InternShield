// Prepare a screenshot in the browser: type/size check, downscale, JPEG compress. Never stored.
import { IMAGE_MAX_SIDE, MAX_IMAGE_DATA_URL } from "./types";

const OK_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 20 * 1024 * 1024;
const QUALITIES = [0.8, 0.65, 0.5];

export type PreparedImage = { ok: true; dataUrl: string } | { ok: false; message: string };

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

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!OK_TYPES.includes(file.type)) return { ok: false, message: "Please choose a PNG, JPEG or WebP image." };
  if (file.size > MAX_BYTES) return { ok: false, message: "That image is too large. Try one under 20 MB." };
  try {
    const img = await decode(file);
    try {
      if (!img.width || !img.height) throw new Error("empty");
      const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.fillStyle = "#ffffff"; // JPEG has no alpha
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img.source, 0, 0, w, h);
      for (const q of QUALITIES) {
        const dataUrl = canvas.toDataURL("image/jpeg", q);
        if (dataUrl.startsWith("data:image/jpeg") && dataUrl.length <= MAX_IMAGE_DATA_URL) return { ok: true, dataUrl };
      }
      return { ok: false, message: "That image is too detailed to send. Try a smaller crop of the message." };
    } finally {
      img.close();
    }
  } catch {
    return { ok: false, message: "We couldn't open that image. Try a different one." };
  }
}
