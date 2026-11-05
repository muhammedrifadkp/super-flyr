import { formatValidity } from "../format";
import type { FooterStyle, HeaderStyle, Poster, PosterContent, PosterLayout, Store } from "../types";
import { FORMATS } from "./templates";

export function contactText(store: Pick<Store, "phone" | "whatsapp" | "address">): string {
  return [store.phone && `Ph: ${store.phone}`, store.whatsapp && `WhatsApp: ${store.whatsapp}`, store.address]
    .filter(Boolean)
    .join("   •   ");
}

/** Header layouts that draw the date (and sub-headline) inside the header instead of a strip below it. */
export const DATE_IN_HEADER: ReadonlySet<HeaderStyle> = new Set<HeaderStyle>(["split", "arc", "blob", "circle", "script"]);

/** Geometry for a poster as drawn, including how many pages its items need. */
export function posterGeometry(
  poster: Pick<Poster, "layout" | "content" | "style">,
  store: Store,
  itemCount: number,
): PosterGeometry {
  const { content, style } = poster;
  const validityText = formatValidity(content.validFrom, content.validTo);
  const hasFooter = Boolean((content.showContact && contactText(store)) || content.footerNote || content.showQr);
  return computeGeometry(poster.layout, content, itemCount, {
    validityText,
    hasFooter,
    headerStyle: style.headerStyle,
    footerStyle: style.footerStyle,
  });
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PosterGeometry {
  width: number;
  height: number;
  /** Design unit: 1 on a 1080 px short side. */
  u: number;
  pad: number;
  header: Box;
  strip: Box | null;
  grid: Box;
  footer: Box | null;
  columns: number;
  rows: number;
  gap: number;
  perPage: number;
  pages: number;
  heroFirst: boolean;
}

const HEADER_RATIO = { square: 0.215, portrait: 0.195, story: 0.16, a4: 0.175, landscape: 0.205 } as const;
const MAX_HEADER_RATIO = { square: 0.275, portrait: 0.265, story: 0.215, a4: 0.24, landscape: 0.245 } as const;

/** Some header designs need more room than a plain banner. */
const HEADER_SCALE: Record<HeaderStyle, number> = {
  banner: 1,
  ribbon: 1,
  plain: 0.92,
  split: 1.18,
  arc: 1.25,
  blob: 1.32,
  circle: 1.22,
  stack: 1.28,
  script: 1.12,
};

const FOOTER_HEIGHT: Record<FooterStyle, number> = { band: 114, split: 122, strip: 126, banner: 118 };

/** Picks rows × columns that give the best-proportioned cards for the number of products and poster aspect ratio. */
function autoGrid(count: number, area: Box, gap: number, maxPerPage: number, fixedCols: number, fixedRows: number) {
  const n = Math.max(1, Math.min(count, maxPerPage));
  if (fixedCols > 0 && fixedRows > 0) return { columns: fixedCols, rows: fixedRows };
  if (fixedCols > 0) return { columns: fixedCols, rows: Math.max(1, Math.ceil(n / fixedCols)) };
  if (fixedRows > 0) return { columns: Math.max(1, Math.ceil(n / fixedRows)), rows: fixedRows };

  const isWideBoard = area.w > area.h * 1.25;
  const isTallBoard = area.h > area.w * 1.35;
  const idealAspect = isWideBoard ? 1.04 : isTallBoard ? 0.82 : 0.88;
  const minCols = n >= 4 ? 2 : 1;
  const maxCols = isWideBoard ? 6 : isTallBoard ? 4 : 5;

  let best = { columns: minCols, rows: Math.ceil(n / minCols), score: -Infinity };
  for (let columns = minCols; columns <= maxCols; columns++) {
    const rows = Math.ceil(n / columns);
    const cellW = (area.w - gap * (columns - 1)) / columns;
    const cellH = (area.h - gap * (rows - 1)) / rows;
    if (cellW <= 0 || cellH <= 0) continue;
    const aspect = cellW / cellH;
    // Penalize cards that are too flat or too narrow so resizing across Portrait/Square/Story/A4/TV stays balanced
    const aspectDrift = Math.abs(Math.log(aspect / idealAspect));
    const aspectFactor = Math.max(0.45, 1 - aspectDrift * 0.34);
    const size = Math.min(cellW, cellH / 1.08);
    const empty = columns * rows - n;
    const score = size * aspectFactor - empty * size * 0.045;
    if (score > best.score) best = { columns, rows, score };
  }
  return { columns: best.columns, rows: best.rows };
}

export function computeGeometry(
  layout: PosterLayout,
  content: PosterContent,
  itemCount: number,
  options: { validityText: string; hasFooter: boolean; headerStyle: HeaderStyle; footerStyle: FooterStyle },
): PosterGeometry {
  const format = FORMATS[layout.format];
  const { width, height } = format;
  const u = Math.min(width, height) / 1080;
  const pad = (layout.format === "landscape" ? 36 : 40) * u;
  const rawHeaderH = height * HEADER_RATIO[layout.format] * HEADER_SCALE[options.headerStyle];
  const cappedHeaderH = Math.min(rawHeaderH, height * MAX_HEADER_RATIO[layout.format]);
  const headerH = cappedHeaderH * (layout.headerSize || 1);
  const header: Box = { x: 0, y: 0, w: width, h: headerH };

  let cursor = headerH + 18 * u;
  const stripText = DATE_IN_HEADER.has(options.headerStyle)
    ? [content.deliveryBadge?.trim() ?? ""].filter(Boolean)
    : [content.subheadline, content.showValidity ? options.validityText : "", content.deliveryBadge?.trim() ?? ""].filter(Boolean);
  const strip: Box | null = stripText.length ? { x: pad, y: cursor, w: width - pad * 2, h: 58 * u } : null;
  if (strip) cursor += strip.h + 18 * u;

  const footerH = options.hasFooter ? (FOOTER_HEIGHT[options.footerStyle] + (layout.format === "story" ? 30 : 0)) * u : 0;
  const footer: Box | null = options.hasFooter ? { x: 0, y: height - footerH, w: width, h: footerH } : null;

  const gridBottom = height - footerH - (footer ? 22 * u : pad);
  const grid: Box = { x: pad, y: cursor, w: width - pad * 2, h: Math.max(100 * u, gridBottom - cursor) };
  const gap = layout.gap * u;

  const slotCount = layout.heroFirst && itemCount >= 2 ? itemCount + 1 : itemCount;
  const { columns, rows } = autoGrid(slotCount, grid, gap, format.maxPerPage, layout.columns, layout.rows);
  const heroFirst = Boolean(layout.heroFirst && columns >= 2 && itemCount >= 2);
  const rawPerPage = columns * rows;
  const perPage = heroFirst ? Math.max(1, rawPerPage - 1) : rawPerPage;
  const pages = Math.max(1, Math.ceil(itemCount / perPage));

  return { width, height, u, pad, header, strip, grid, footer, columns, rows, gap, perPage, pages, heroFirst };
}

/** Card boxes for one page. A part-filled last row is centred. */
export function cellsFor(geo: PosterGeometry, count: number, page = 0): Box[] {
  const { grid, columns, rows, gap } = geo;
  const hero = geo.heroFirst && page === 0 && columns >= 2 && count >= 1;
  const totalSlots = hero ? count + 1 : count;
  const cellW = (grid.w - gap * (columns - 1)) / columns;
  const cellH = (grid.h - gap * (rows - 1)) / rows;
  const usedRows = Math.max(1, Math.ceil(totalSlots / columns));
  // When a page has fewer rows than the grid, keep cards their normal size and centre vertically.
  const offsetY = ((rows - usedRows) * (cellH + gap)) / 2;
  const cells: Box[] = [];
  for (let i = 0; i < count; i++) {
    if (hero && i === 0) {
      const inRowSlots = usedRows === 1 ? totalSlots : columns;
      const offsetX = ((columns - inRowSlots) * (cellW + gap)) / 2;
      cells.push({
        x: grid.x + offsetX,
        y: grid.y + offsetY,
        w: cellW * 2 + gap,
        h: cellH,
      });
      continue;
    }
    const slot = hero ? i + 1 : i;
    const row = Math.floor(slot / columns);
    const col = slot % columns;
    const inRow = row === usedRows - 1 ? totalSlots - row * columns : columns;
    const offsetX = ((columns - inRow) * (cellW + gap)) / 2;
    cells.push({
      x: grid.x + offsetX + col * (cellW + gap),
      y: grid.y + offsetY + row * (cellH + gap),
      w: cellW,
      h: cellH,
    });
  }
  return cells;
}

export function pageItems<T>(items: T[], geo: PosterGeometry, page: number): T[] {
  const start = page * geo.perPage;
  return items.slice(start, start + geo.perPage);
}

/** Small deterministic random generator so decorations never jump between renders. */
export function seededRandom(seedText: string) {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (Math.imul(31, seed) + seedText.charCodeAt(i)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
