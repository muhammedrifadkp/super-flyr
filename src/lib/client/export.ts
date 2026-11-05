"use client";

import { discountPercent, formatPrice } from "../format";
import { readableOn } from "../poster/templates";
import type { FormatKey, ResolvedItem, Store } from "../types";

export type ExportKind = "png" | "jpg" | "pdf" | "print" | "share" | "tags";

/** Largest safe canvas area (iOS Safari limit is ~16.7 MP). */
const MAX_PIXELS = 16_000_000;

export function maxPixelRatio(width: number, height: number): number {
  return Math.max(1, Math.floor(Math.sqrt(MAX_PIXELS / (width * height)) * 10) / 10);
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function downloadImages(pages: string[], baseName: string, ext: "png" | "jpg") {
  for (const [index, dataUrl] of pages.entries()) {
    const suffix = pages.length > 1 ? `-${index + 1}` : "";
    downloadBlob(await dataUrlToBlob(dataUrl), `${baseName}${suffix}.${ext}`);
    // Small pause so browsers accept several downloads in a row.
    if (pages.length > 1) await new Promise((r) => setTimeout(r, 350));
  }
}

export async function buildPdf(pages: string[], format: FormatKey, width: number, height: number): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const a4 = format === "a4";
  const orientation = width > height ? "landscape" : "portrait";
  const doc = a4
    ? new jsPDF({ unit: "mm", format: "a4", orientation, compress: true })
    : new jsPDF({ unit: "px", format: [width, height], orientation, hotfixes: ["px_scaling"], compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  pages.forEach((dataUrl, index) => {
    if (index > 0) doc.addPage(a4 ? "a4" : [width, height], orientation);
    doc.addImage(dataUrl, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
  });
  return doc.output("blob");
}

/** Prints the pages through a hidden iframe (no pop-up needed). */
export function printPages(pages: string[], format: FormatKey) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  const pageSize = format === "a4" ? "A4" : "auto";
  doc.open();
  doc.write(`<!doctype html><html><head><title>Print poster</title><style>
    @page { size: ${pageSize}; margin: 0; }
    html, body { margin: 0; padding: 0; }
    img { display: block; width: 100%; height: auto; page-break-after: always; break-after: page; }
    img:last-child { page-break-after: auto; break-after: auto; }
  </style></head><body>${pages.map((src) => `<img src="${src}" alt="">`).join("")}</body></html>`);
  doc.close();
  const images = Array.from(doc.images);
  Promise.all(images.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => (img.onload = r))))).then(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 60_000);
  });
}

/** Native share sheet with the poster image (WhatsApp, Instagram…). Returns false if unsupported. */
export async function sharePages(pages: string[], baseName: string, title: string, url?: string): Promise<boolean> {
  if (!navigator.share) return false;
  const files = await Promise.all(
    pages.map(async (dataUrl, i) => new File([await dataUrlToBlob(dataUrl)], `${baseName}${pages.length > 1 ? `-${i + 1}` : ""}.jpg`, { type: "image/jpeg" })),
  );
  const data: ShareData = { files, title, text: url ? `${title}\n${url}` : title };
  if (navigator.canShare && !navigator.canShare(data)) return false;
  try {
    await navigator.share(data);
  } catch (error) {
    if ((error as DOMException).name !== "AbortError") throw error;
  }
  return true;
}

function loadImg(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Renders A4 sheets of supermarket shelf price tags (8 rack labels per A4 sheet, 2x4 grid)
 * with dashed scissor cut lines, Malayalam + English product names, MRP, Offer price and SAVE badge.
 */
export async function renderShelfTagPages(items: ResolvedItem[], store: Store, validityText: string): Promise<string[]> {
  const W = 1654; // A4 @ 200 DPI
  const H = 2339;
  const cols = 2;
  const rows = 4;
  const perPage = cols * rows;
  const margin = 56;
  const gap = 28;
  const cardW = (W - margin * 2 - gap * (cols - 1)) / cols;
  const cardH = (H - margin * 2 - gap * (rows - 1)) / rows;

  const primary = store.colors.primary || "#d71920";
  const accent = store.colors.accent || "#ffcc00";
  const onPrimary = readableOn(primary);
  const onAccent = readableOn(accent);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const urls: string[] = [];

  for (let p = 0; p < totalPages; p++) {
    const slice = items.slice(p * perPage, (p + 1) * perPage);
    const loaded = await Promise.all(slice.map((item) => loadImg(item.imageUrl)));

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Sheet header guide
    ctx.fillStyle = "#6b7280";
    ctx.font = "600 20px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`✂️ Cut along dashed lines — ${store.name} Shelf Price Tags (Page ${p + 1}/${totalPages})`, margin, 36);

    for (let i = 0; i < slice.length; i++) {
      const item = slice[i];
      const img = loaded[i];
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = margin + c * (cardW + gap);
      const y = margin + r * (cardH + gap);

      const discount = discountPercent(item.normalPrice, item.offerPrice);
      const save = Math.max(0, Math.round(item.normalPrice - item.offerPrice));

      // Card background & dashed cut border
      ctx.save();
      roundRect(ctx, x, y, cardW, cardH, 20);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.clip();

      // Top store banner
      const bannerH = 92;
      ctx.fillStyle = primary;
      ctx.fillRect(x, y, cardW, bannerH);

      ctx.fillStyle = onPrimary;
      ctx.font = "800 28px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(store.name.toUpperCase().slice(0, 26), x + 24, y + bannerH / 2);

      // Save badge on top right of banner
      const badgeLabel = item.tag?.trim()
        ? item.tag.trim().toUpperCase()
        : save >= 10
          ? `SAVE ₹${save}`
          : discount > 0
            ? `${discount}% OFF`
            : "SPECIAL";
      ctx.font = "900 26px sans-serif";
      const bw = Math.max(150, ctx.measureText(badgeLabel).width + 36);
      roundRect(ctx, x + cardW - bw - 18, y + 16, bw, bannerH - 32, 12);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.fillStyle = onAccent;
      ctx.textAlign = "center";
      ctx.fillText(badgeLabel, x + cardW - bw / 2 - 18, y + bannerH / 2 + 1);

      // Product Image on left
      const bodyY = y + bannerH + 16;
      const bodyH = cardH - bannerH - 32;
      const imgSize = Math.min(210, bodyH - 20);
      if (img) {
        const s = Math.min(imgSize / img.naturalWidth, imgSize / img.naturalHeight);
        const iw = img.naturalWidth * s;
        const ih = img.naturalHeight * s;
        ctx.drawImage(img, x + 22 + (imgSize - iw) / 2, bodyY + (bodyH - ih) / 2, iw, ih);
      } else {
        roundRect(ctx, x + 22, bodyY + (bodyH - imgSize) / 2, imgSize, imgSize, 16);
        ctx.fillStyle = "#f3f4f6";
        ctx.fill();
        ctx.fillStyle = "#9ca3af";
        ctx.font = "800 72px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(item.name.slice(0, 1).toUpperCase(), x + 22 + imgSize / 2, bodyY + bodyH / 2);
      }

      // Product Names & Price on right
      const textX = x + 22 + imgSize + 24;
      const textW = cardW - (textX - x) - 24;

      ctx.fillStyle = "#111827";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = "800 36px sans-serif";
      ctx.fillText(item.name.slice(0, 22), textX, bodyY + 6, textW);

      if (item.nameMl) {
        ctx.fillStyle = "#374151";
        ctx.font = "700 32px sans-serif";
        ctx.fillText(item.nameMl, textX, bodyY + 52, textW);
      }

      // MRP & Offer Price Box at bottom-right
      const priceBoxH = 128;
      const priceBoxY = y + cardH - priceBoxH - 20;

      if (discount > 0) {
        ctx.fillStyle = "#6b7280";
        ctx.font = "700 26px sans-serif";
        const mrpText = `MRP ${formatPrice(item.normalPrice)}`;
        ctx.fillText(mrpText, textX, priceBoxY - 34);
        const mw = ctx.measureText(mrpText).width;
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(textX, priceBoxY - 20);
        ctx.lineTo(textX + mw, priceBoxY - 20);
        ctx.stroke();
      }

      roundRect(ctx, textX, priceBoxY, textW, priceBoxH, 18);
      ctx.fillStyle = "#fef08a";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = primary;
      ctx.stroke();

      const priceStr = formatPrice(item.offerPrice);
      const unitStr = item.unit ? `/${item.unit}` : "";
      ctx.fillStyle = "#b91c1c";
      ctx.font = "900 76px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${priceStr}${unitStr}`, textX + textW / 2, priceBoxY + priceBoxH / 2 + 4, textW - 24);

      if (validityText) {
        ctx.fillStyle = "#6b7280";
        ctx.font = "600 18px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(validityText, x + 24, y + cardH - 22);
      }

      ctx.restore();

      // Dashed cut border around the card
      ctx.save();
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#9ca3af";
      roundRect(ctx, x, y, cardW, cardH, 20);
      ctx.stroke();
      ctx.restore();
    }

    urls.push(canvas.toDataURL("image/jpeg", 0.92));
  }

  return urls;
}
