import type { PosterItem, Product, ResolvedItem } from "./types";

const priceFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(value: number): string {
  return `₹${priceFormatter.format(value)}`;
}

/** Whole-number discount percentage, or 0 when there is no real discount. */
export function discountPercent(normalPrice: number, offerPrice: number): number {
  if (!(normalPrice > 0) || !(offerPrice >= 0) || offerPrice >= normalPrice) return 0;
  return Math.round((1 - offerPrice / normalPrice) * 100);
}

const dayFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "4 Nov 2026", "4 – 6 Nov 2026" or "" when no valid dates are set. */
export function formatValidity(validFrom: string, validTo: string): string {
  const from = parseDay(validFrom);
  const to = parseDay(validTo);
  if (from && to) {
    if (to.getTime() < from.getTime()) return dayFormatter.format(from);
    return dayFormatter.formatRange(from, to);
  }
  if (from) return `From ${dayFormatter.format(from)}`;
  if (to) return `Till ${dayFormatter.format(to)}`;
  return "";
}

/** Today's date in India as YYYY-MM-DD. */
export function todayIst(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(day: string, days: number): string {
  const date = parseDay(day) ?? new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isExpired(validTo: string, now = new Date()): boolean {
  if (!parseDay(validTo)) return false;
  return validTo < todayIst(now);
}

export function resolveItems(items: PosterItem[], products: Product[]): ResolvedItem[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: ResolvedItem[] = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) continue;
    out.push({
      id: item.id,
      productId: product.id,
      name: item.name?.trim() || product.name,
      nameMl: item.nameMl?.trim() ?? product.nameMl,
      unit: item.unit?.trim() ?? product.unit,
      category: product.category,
      imageUrl: product.imageUrl,
      normalPrice: item.normalPrice ?? product.normalPrice,
      offerPrice: item.offerPrice ?? product.offerPrice,
    });
  }
  return out;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "poster"
  );
}

const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** Short URL-safe random id (no ambiguous characters). */
export function randomId(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ID_ALPHABET[b % ID_ALPHABET.length];
  return out;
}
