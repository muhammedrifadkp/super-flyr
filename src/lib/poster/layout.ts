import { formatValidity } from "../format";
import type { Poster, PosterContent, PosterLayout, Store } from "../types";
import { FORMATS } from "./templates";

export function contactText(store: Pick<Store, "phone" | "whatsapp" | "address">): string {
  return [store.phone && `Ph: ${store.phone}`, store.whatsapp && `WhatsApp: ${store.whatsapp}`, store.address]
    .filter(Boolean)
    .join("   •   ");
}

/** Geometry for a poster as drawn, including how many pages its items need. */
export function posterGeometry(poster: Pick<Poster, "layout" | "content">, store: Store, itemCount: number): PosterGeometry {
  const { content } = poster;
  const validityText = formatValidity(content.validFrom, content.validTo);
  const hasFooter = Boolean((content.showContact && contactText(store)) || content.footerNote);
  return computeGeometry(poster.layout, content, itemCount, { validityText, hasFooter });
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
}

const HEADER_RATIO = { square: 0.235, portrait: 0.205, story: 0.17, a4: 0.175, landscape: 0.235 } as const;

/** Picks rows × columns that give the biggest cards for the number of products. */
function autoGrid(count: number, area: Box, gap: number, maxPerPage: number, fixedCols: number, fixedRows: number) {
  const n = Math.max(1, Math.min(count, maxPerPage));
  if (fixedCols > 0 && fixedRows > 0) return { columns: fixedCols, rows: fixedRows };
  if (fixedCols > 0) return { columns: fixedCols, rows: Math.max(1, Math.ceil(n / fixedCols)) };
  if (fixedRows > 0) return { columns: Math.max(1, Math.ceil(n / fixedRows)), rows: fixedRows };

  let best = { columns: 1, rows: n, score: -Infinity };
  for (let columns = 1; columns <= 6; columns++) {
    const rows = Math.ceil(n / columns);
    const cellW = (area.w - gap * (columns - 1)) / columns;
    const cellH = (area.h - gap * (rows - 1)) / rows;
    if (cellW <= 0 || cellH <= 0) continue;
    // Cards look best slightly taller than wide. Penalise empty slots a little.
    const size = Math.min(cellW, cellH / 1.12);
    const empty = columns * rows - n;
    const score = size - empty * size * 0.04;
    if (score > best.score) best = { columns, rows, score };
  }
  return { columns: best.columns, rows: best.rows };
}

export function computeGeometry(
  layout: PosterLayout,
  content: PosterContent,
  itemCount: number,
  options: { validityText: string; hasFooter: boolean },
): PosterGeometry {
  const format = FORMATS[layout.format];
  const { width, height } = format;
  const u = Math.min(width, height) / 1080;
  const pad = 40 * u;
  const headerH = height * HEADER_RATIO[layout.format];
  const header: Box = { x: 0, y: 0, w: width, h: headerH };

  let cursor = headerH + 18 * u;
  const stripText = [content.subheadline, content.showValidity ? options.validityText : ""].filter(Boolean);
  const strip: Box | null = stripText.length ? { x: pad, y: cursor, w: width - pad * 2, h: 58 * u } : null;
  if (strip) cursor += strip.h + 18 * u;

  const footerH = options.hasFooter ? (layout.format === "story" ? 150 : 118) * u : 0;
  const footer: Box | null = options.hasFooter ? { x: 0, y: height - footerH, w: width, h: footerH } : null;

  const gridBottom = height - footerH - (footer ? 22 * u : pad);
  const grid: Box = { x: pad, y: cursor, w: width - pad * 2, h: Math.max(100 * u, gridBottom - cursor) };
  const gap = layout.gap * u;

  const { columns, rows } = autoGrid(itemCount, grid, gap, format.maxPerPage, layout.columns, layout.rows);
  const perPage = columns * rows;
  const pages = Math.max(1, Math.ceil(itemCount / perPage));

  return { width, height, u, pad, header, strip, grid, footer, columns, rows, gap, perPage, pages };
}

/** Card boxes for one page. A part-filled last row is centred. */
export function cellsFor(geo: PosterGeometry, count: number): Box[] {
  const { grid, columns, rows, gap } = geo;
  const cellW = (grid.w - gap * (columns - 1)) / columns;
  const cellH = (grid.h - gap * (rows - 1)) / rows;
  const usedRows = Math.max(1, Math.ceil(count / columns));
  // When a page has fewer rows than the grid, keep cards their normal size and centre vertically.
  const offsetY = ((rows - usedRows) * (cellH + gap)) / 2;
  const cells: Box[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    const inRow = row === usedRows - 1 ? count - row * columns : columns;
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
