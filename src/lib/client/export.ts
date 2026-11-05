"use client";

import type { FormatKey } from "../types";

export type ExportKind = "png" | "jpg" | "pdf" | "print" | "share";

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
