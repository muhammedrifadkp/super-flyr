import type { BrandColors, FormatKey, PosterContent, PosterLayout, PosterStyle } from "../types";

export interface PosterTemplate {
  id: string;
  name: string;
  description: string;
  /** Products from this category are added automatically when the poster is created. */
  autoCategory?: string;
  style: PosterStyle;
  content: Pick<PosterContent, "headline" | "headlineMl" | "subheadline" | "badgeText">;
  /** Default validity in days (1 = today only). */
  validDays: number;
  /** Uses the store brand colours instead of fixed colours. */
  brand?: boolean;
}

const base: Omit<PosterStyle, "bgTop" | "bgBottom" | "headerBg" | "headerText" | "priceBg" | "badgeBg" | "badgeText"> = {
  headerStyle: "banner",
  decoration: "none",
  decorationColor: "#ffffff",
  cardBg: "#ffffff",
  cardRadius: 24,
  cardShadow: true,
  nameColor: "#1f2937",
  mrpColor: "#6b7280",
  priceText: "#ffffff",
  badgeShape: "burst",
  footerBg: "#111827",
  footerText: "#ffffff",
  headingFont: "anton",
  priceFont: "anton",
  bodyFont: "poppins",
  mlFont: "baloo",
};

export const TEMPLATES: PosterTemplate[] = [
  {
    id: "daily-deals",
    name: "Daily Deals",
    description: "Classic red & yellow supermarket look for today’s offers.",
    validDays: 1,
    style: {
      ...base,
      bgTop: "#fff6d6",
      bgBottom: "#ffe7a3",
      headerBg: "#d71920",
      headerText: "#ffffff",
      decoration: "rays",
      decorationColor: "#ffd23f",
      priceBg: "#d71920",
      badgeBg: "#ffd400",
      badgeText: "#b3121a",
      footerBg: "#d71920",
    },
    content: {
      headline: "TODAY'S OFFERS",
      headlineMl: "ഇന്നത്തെ ഓഫറുകൾ",
      subheadline: "Best prices in town",
      badgeText: "TODAY ONLY",
    },
  },
  {
    id: "fresh-vegetables",
    name: "Fresh Vegetables",
    description: "Green farm-fresh style. Adds your vegetables automatically.",
    autoCategory: "Vegetables",
    validDays: 1,
    style: {
      ...base,
      bgTop: "#ecf8e6",
      bgBottom: "#c9ebbd",
      headerBg: "#1b5e20",
      headerText: "#ffffff",
      decoration: "leaves",
      decorationColor: "#7cb342",
      priceBg: "#2e7d32",
      badgeBg: "#ffeb3b",
      badgeText: "#1b5e20",
      footerBg: "#1b5e20",
      mlFont: "anek",
    },
    content: {
      headline: "FRESH VEGETABLES",
      headlineMl: "പച്ചക്കറികൾ",
      subheadline: "Farm fresh, every morning",
      badgeText: "FARM FRESH",
    },
  },
  {
    id: "fruit-fiesta",
    name: "Fruit Fiesta",
    description: "Bright orange & pink for fruits. Adds your fruits automatically.",
    autoCategory: "Fruits",
    validDays: 3,
    style: {
      ...base,
      bgTop: "#fff1e0",
      bgBottom: "#ffd9e8",
      headerBg: "#ef6c00",
      headerText: "#ffffff",
      headerStyle: "ribbon",
      decoration: "dots",
      decorationColor: "#ff8fb1",
      priceBg: "#c2185b",
      badgeBg: "#ffffff",
      badgeText: "#c2185b",
      badgeShape: "circle",
      footerBg: "#c2185b",
      headingFont: "bebas",
      priceFont: "bebas",
    },
    content: {
      headline: "FRUIT FIESTA",
      headlineMl: "പഴങ്ങൾ",
      subheadline: "Sweet, juicy & fresh",
      badgeText: "SWEET DEALS",
    },
  },
  {
    id: "weekly-mega",
    name: "Weekly Mega Sale",
    description: "Bold navy & gold for week-long offers.",
    validDays: 7,
    style: {
      ...base,
      bgTop: "#0d1b3e",
      bgBottom: "#1d3a7a",
      headerBg: "#ffc107",
      headerText: "#0d1b3e",
      decoration: "confetti",
      decorationColor: "#ffc107",
      priceBg: "#e53935",
      badgeBg: "#ffc107",
      badgeText: "#0d1b3e",
      footerBg: "#ffc107",
      footerText: "#0d1b3e",
      headingFont: "oswald",
    },
    content: {
      headline: "WEEKLY MEGA SALE",
      headlineMl: "ആഴ്ചയിലെ മെഗാ ഓഫർ",
      subheadline: "Big savings all week",
      badgeText: "7 DAYS",
    },
  },
  {
    id: "festival",
    name: "Festival Special",
    description: "Kerala kasavu cream & gold for Onam, Vishu and festivals.",
    validDays: 5,
    style: {
      ...base,
      bgTop: "#fffaf0",
      bgBottom: "#f8ecc9",
      headerBg: "#7a1616",
      headerText: "#ffe8a3",
      headerStyle: "ribbon",
      decoration: "kasavu",
      decorationColor: "#c9a227",
      priceBg: "#14532d",
      badgeBg: "#c9a227",
      badgeText: "#ffffff",
      badgeShape: "tag",
      footerBg: "#7a1616",
      footerText: "#ffe8a3",
      cardRadius: 16,
      mlFont: "manjari",
    },
    content: {
      headline: "FESTIVAL OFFERS",
      headlineMl: "ഉത്സവ ഓഫറുകൾ",
      subheadline: "Celebrate with savings",
      badgeText: "SPECIAL",
    },
  },
  {
    id: "brand-classic",
    name: "Brand Classic",
    description: "Clean layout in your store’s own brand colours.",
    brand: true,
    validDays: 3,
    style: {
      ...base,
      bgTop: "#ffffff",
      bgBottom: "#f3f4f6",
      headerBg: "#d71920",
      headerText: "#ffffff",
      headerStyle: "plain",
      priceBg: "#d71920",
      badgeBg: "#ffcc00",
      badgeText: "#111827",
      cardShadow: false,
      headingFont: "poppins",
      priceFont: "poppins",
    },
    content: {
      headline: "SPECIAL OFFERS",
      headlineMl: "സ്പെഷ്യൽ ഓഫറുകൾ",
      subheadline: "",
      badgeText: "",
    },
  },
];

export function getTemplate(id: string): PosterTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").slice(0, 6);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Relative luminance (0 – 1). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white, whichever reads better on the given background. */
export function readableOn(bg: string, dark = "#111827", light = "#ffffff"): string {
  return luminance(bg) > 0.45 ? dark : light;
}

export function mix(a: string, b: string, amount: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const out = ca.map((v, i) => Math.round(v + (cb[i] - v) * amount));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Re-colours a style with the store brand colours. */
export function applyBrandColors(style: PosterStyle, colors: BrandColors): PosterStyle {
  const { primary, secondary, accent } = colors;
  return {
    ...style,
    bgTop: mix(secondary, "#ffffff", 0.35),
    bgBottom: secondary,
    headerBg: primary,
    headerText: readableOn(primary),
    decorationColor: accent,
    priceBg: primary,
    priceText: readableOn(primary),
    badgeBg: accent,
    badgeText: readableOn(accent, mix(primary, "#000000", 0.35)),
    footerBg: primary,
    footerText: readableOn(primary),
  };
}

export const FORMATS: Record<FormatKey, { label: string; hint: string; width: number; height: number; maxPerPage: number }> = {
  portrait: { label: "Portrait", hint: "Instagram / Facebook post", width: 1080, height: 1350, maxPerPage: 12 },
  square: { label: "Square", hint: "WhatsApp / Instagram", width: 1080, height: 1080, maxPerPage: 9 },
  story: { label: "Story", hint: "WhatsApp status / Reels", width: 1080, height: 1920, maxPerPage: 15 },
  a4: { label: "A4 print", hint: "Shop notice board", width: 1240, height: 1754, maxPerPage: 16 },
  landscape: { label: "TV screen", hint: "Shop display 16:9", width: 1920, height: 1080, maxPerPage: 10 },
};

export function defaultLayout(format: FormatKey = "portrait"): PosterLayout {
  return { format, columns: 0, rows: 0, gap: 22, imageScale: 1 };
}

export function defaultContent(template: PosterTemplate, today: string, validTo: string): PosterContent {
  return {
    ...template.content,
    footerNote: "Offer valid while stocks last. Prices inclusive of taxes.",
    validFrom: today,
    validTo,
    showMrp: true,
    showDiscount: true,
    showLogo: true,
    showContact: true,
    showValidity: true,
  };
}
