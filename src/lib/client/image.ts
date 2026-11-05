"use client";

// Browser-only image helpers: resize, free white/solid background removal, trimming and encoding.
// Everything runs on the device; no paid API is involved.

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  return ctx;
}

/** Decodes an image file (respecting phone camera rotation) and scales it to fit maxSize. */
export async function fileToCanvas(file: Blob, maxSize = 1000): Promise<HTMLCanvasElement> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("This file is not a readable image."));
      img.src = URL.createObjectURL(file);
    });
  }
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const canvas = makeCanvas(source.width * scale, source.height * scale);
  const ctx = context(canvas);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  return canvas;
}

function median(values: number[]): number {
  if (!values.length) return 255;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Removes a plain (usually white) background by flood-filling from the image edges.
 * Only pixels connected to the border are removed, so white parts inside the product stay.
 * @param tolerance 0 (strict) – 100 (aggressive)
 */
export function removeBackground(source: HTMLCanvasElement, tolerance = 35): HTMLCanvasElement {
  const { width: w, height: h } = source;
  const out = makeCanvas(w, h);
  const ctx = context(out);
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;

  // Background colour = median colour of the border.
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const step = Math.max(1, Math.floor((w + h) / 400));
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 10) return;
    rs.push(d[i]);
    gs.push(d[i + 1]);
    bs.push(d[i + 2]);
  };
  for (let x = 0; x < w; x += step) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 0; y < h; y += step) {
    sample(0, y);
    sample(w - 1, y);
  }
  const br = median(rs);
  const bgc = median(gs);
  const bb = median(bs);

  const threshold = 8 + tolerance * 1.1;
  const soft = Math.max(10, threshold * 0.7);
  const dist = (p: number) => {
    const i = p * 4;
    if (d[i + 3] < 10) return 0;
    return Math.max(Math.abs(d[i] - br), Math.abs(d[i + 1] - bgc), Math.abs(d[i + 2] - bb));
  };

  const total = w * h;
  const removed = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const push = (p: number) => {
    if (removed[p] || dist(p) >= threshold) return;
    removed[p] = 1;
    queue[tail++] = p;
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < total - w) push(p + w);
  }

  for (let p = 0; p < total; p++) {
    if (removed[p]) {
      d[p * 4 + 3] = 0;
      continue;
    }
    // Soften the edge next to removed pixels and strip the background colour from it (no white halo).
    const x = p % w;
    const touches =
      (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) || (p >= w && removed[p - w]) || (p < total - w && removed[p + w]);
    if (!touches) continue;
    const distance = dist(p);
    if (distance >= threshold + soft) continue;
    const alpha = Math.min(1, Math.max(0, (distance - threshold * 0.5) / (soft + threshold * 0.5)));
    const i = p * 4;
    if (alpha <= 0.02) {
      d[i + 3] = 0;
      continue;
    }
    d[i] = Math.min(255, Math.max(0, (d[i] - br * (1 - alpha)) / alpha));
    d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - bgc * (1 - alpha)) / alpha));
    d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - bb * (1 - alpha)) / alpha));
    d[i + 3] = Math.round(d[i + 3] * alpha);
  }

  ctx.putImageData(image, 0, 0);
  return out;
}

/** Crops away transparent margins so the product fills its card. */
export function trimTransparent(source: HTMLCanvasElement, paddingRatio = 0.03): HTMLCanvasElement {
  const { width: w, height: h } = source;
  const data = context(source).getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return source;
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * paddingRatio);
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(w, maxX + pad + 1) - sx;
  const sh = Math.min(h, maxY + pad + 1) - sy;
  if (sw === w && sh === h) return source;
  const out = makeCanvas(sw, sh);
  context(out).drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  return out;
}

/** True when any pixel is transparent (decides PNG/WebP vs JPEG). */
export function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const data = context(canvas).getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4 * 7) if (data[i] < 250) return true;
  return false;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** WebP keeps transparency at a small size; browsers that cannot encode WebP fall back to PNG. */
export async function encodeImage(canvas: HTMLCanvasElement): Promise<Blob> {
  const transparent = hasTransparency(canvas);
  const webp = await toBlob(canvas, "image/webp", 0.9);
  if (webp && webp.type === "image/webp") return webp;
  const fallback = await toBlob(canvas, transparent ? "image/png" : "image/jpeg", 0.9);
  if (!fallback) throw new Error("Could not encode the image.");
  return fallback;
}

/** Draws an emoji into a transparent image. Used for the demo catalogue. */
export async function emojiToBlob(emoji: string, size = 480): Promise<Blob> {
  const canvas = makeCanvas(size, size);
  const ctx = context(canvas);
  ctx.font = `${Math.round(size * 0.8)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size * 0.54);
  return encodeImage(trimTransparent(canvas));
}
