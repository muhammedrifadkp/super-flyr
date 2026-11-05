import type { FontKey } from "../types";

export interface PosterFont {
  label: string;
  cssVar: string;
  /** Weights the font really has. Single-weight display fonts must not be faux-bolded. */
  weights: number[];
  malayalam: boolean;
  /** Fallback family when the CSS variable is not available. */
  family: string;
}

export const POSTER_FONTS: Record<FontKey, PosterFont> = {
  anton: { label: "Anton (bold display)", cssVar: "--pf-anton", weights: [400], malayalam: false, family: "Anton" },
  bebas: { label: "Bebas Neue (tall display)", cssVar: "--pf-bebas", weights: [400], malayalam: false, family: "Bebas Neue" },
  oswald: { label: "Oswald (condensed)", cssVar: "--pf-oswald", weights: [400, 500, 600, 700], malayalam: false, family: "Oswald" },
  poppins: { label: "Poppins (rounded)", cssVar: "--pf-poppins", weights: [400, 500, 600, 700, 800], malayalam: false, family: "Poppins" },
  montserrat: { label: "Montserrat (modern)", cssVar: "--pf-montserrat", weights: [400, 500, 600, 700, 800], malayalam: false, family: "Montserrat" },
  baloo: { label: "Baloo Chettan 2 (മലയാളം bold)", cssVar: "--pf-baloo", weights: [400, 500, 600, 700, 800], malayalam: true, family: "Baloo Chettan 2" },
  anek: { label: "Anek Malayalam (മലയാളം modern)", cssVar: "--pf-anek", weights: [400, 500, 600, 700, 800], malayalam: true, family: "Anek Malayalam" },
  notoMl: { label: "Noto Sans Malayalam (മലയാളം clean)", cssVar: "--pf-notoMl", weights: [400, 500, 600, 700, 800], malayalam: true, family: "Noto Sans Malayalam" },
  manjari: { label: "Manjari (മലയാളം soft)", cssVar: "--pf-manjari", weights: [400, 700], malayalam: true, family: "Manjari" },
};

export const LATIN_FONT_KEYS = (Object.keys(POSTER_FONTS) as FontKey[]).filter((k) => !POSTER_FONTS[k].malayalam);
export const MALAYALAM_FONT_KEYS = (Object.keys(POSTER_FONTS) as FontKey[]).filter((k) => POSTER_FONTS[k].malayalam);

const familyCache = new Map<FontKey, string>();

/** The real (hashed) family name next/font generated, e.g. "'Anton', 'Anton Fallback'". */
export function fontFamily(key: FontKey): string {
  const cached = familyCache.get(key);
  if (cached) return cached;
  const font = POSTER_FONTS[key];
  let family = `"${font.family}"`;
  if (typeof document !== "undefined") {
    const value = getComputedStyle(document.documentElement).getPropertyValue(font.cssVar).trim();
    if (value) family = value;
    familyCache.set(key, family);
  }
  return family;
}

/** Konva fontStyle string for the nearest weight the font has. */
export function fontWeight(key: FontKey, desired: number): string {
  const weights = POSTER_FONTS[key].weights;
  const best = weights.reduce((a, b) => (Math.abs(b - desired) < Math.abs(a - desired) ? b : a), weights[0]);
  return best === 400 ? "normal" : String(best);
}

/** Family stack: chosen font first, Malayalam font for മലയാളം glyphs, then system fallback (for ₹). */
export function stack(primary: FontKey, ml: FontKey): string {
  return `${fontFamily(primary)}, ${fontFamily(ml)}, ${fontFamily("poppins")}, sans-serif`;
}

const SAMPLE = "Aa₹0 അആ";

/** Downloads the font files a poster needs. Canvas text needs them loaded before drawing. */
export async function loadPosterFonts(keys: FontKey[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const unique = Array.from(new Set<FontKey>([...keys, "poppins"]));
  const loads: Promise<unknown>[] = [];
  for (const key of unique) {
    const family = fontFamily(key);
    for (const weight of POSTER_FONTS[key].weights) {
      loads.push(document.fonts.load(`${weight} 40px ${family}`, SAMPLE).catch(() => undefined));
    }
  }
  await Promise.all(loads);
}
