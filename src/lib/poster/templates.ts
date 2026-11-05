import type { BrandColors, FormatKey, PosterContent, PosterLayout, PosterStyle } from "../types";

export type TemplateCategory = "weekend" | "fresh" | "weekly" | "festival" | "daily" | "special" | "brand";

export const TEMPLATE_CATEGORIES: Array<{ id: TemplateCategory; label: string }> = [
  { id: "weekend", label: "Weekend" },
  { id: "fresh", label: "Fresh / Vegetables" },
  { id: "weekly", label: "Weekly" },
  { id: "festival", label: "Onam / Festival" },
  { id: "special", label: "Special offers" },
  { id: "daily", label: "Daily" },
  { id: "brand", label: "Brand colours" },
];

type TemplateContent = Pick<
  PosterContent,
  "kicker" | "headline" | "headline2" | "headlineMl" | "subheadline" | "badgeText" | "offerLabel" | "offerValue" | "heroEmoji" | "nameMode"
> &
  Partial<Pick<PosterContent, "footerNote" | "showDiscount" | "showMrp">>;

export interface PosterTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  /** Products from this category are added automatically when the poster is created. */
  autoCategory?: string;
  style: PosterStyle;
  content: TemplateContent;
  layout?: Partial<PosterLayout>;
  /** Default validity in days (1 = today only). */
  validDays: number;
  /** Uses the store brand colours instead of fixed colours. */
  brand?: boolean;
}

/** Every style field with a neutral value. Old posters are filled in with these. */
export const BASE_STYLE: PosterStyle = {
  bgTop: "#ffffff",
  bgBottom: "#f3f4f6",
  bgPattern: "none",
  headerBg: "#d71920",
  headerText: "#ffffff",
  headlineColor: "#ffffff",
  headerStyle: "banner",
  headline3d: false,
  headingItalic: false,
  decoration: "none",
  decorationColor: "#ffffff",
  panelBg: "#ffd400",
  panelText: "#111827",
  stripStyle: "pill",
  stripBg: "#ffffff",
  stripText: "#1f2937",
  cardStyle: "card",
  cardBg: "#ffffff",
  cardRadius: 24,
  cardShadow: true,
  nameColor: "#1f2937",
  namePosition: "below",
  mrpColor: "#6b7280",
  priceStyle: "pill",
  priceBg: "#d71920",
  priceText: "#ffffff",
  priceAccent: "#ffd400",
  badgeBg: "#ffd400",
  badgeText: "#b3121a",
  badgeShape: "burst",
  badgePosition: "right",
  footerStyle: "band",
  footerBg: "#111827",
  footerText: "#ffffff",
  footerAccent: "#ffd400",
  headingFont: "anton",
  priceFont: "anton",
  bodyFont: "poppins",
  mlFont: "baloo",
};

const s = (overrides: Partial<PosterStyle>): PosterStyle => ({ ...BASE_STYLE, ...overrides });

const c = (overrides: Partial<TemplateContent> & Pick<TemplateContent, "headline">): TemplateContent => ({
  kicker: "",
  headline2: "",
  headlineMl: "",
  subheadline: "",
  badgeText: "",
  offerLabel: "",
  offerValue: "",
  heroEmoji: "",
  nameMode: "both",
  ...overrides,
});

export const TEMPLATES: PosterTemplate[] = [
  {
    id: "weekend-big-deals",
    name: "Weekend Big Deals",
    description: "Maroon & gold block header with an offer box, white cards and corner discount tabs.",
    category: "weekend",
    validDays: 2,
    style: s({
      bgTop: "#ffffff",
      bgBottom: "#fbf6f0",
      headerStyle: "split",
      headerBg: "#7a0c0c",
      headerText: "#ffffff",
      headlineColor: "#ffc928",
      panelBg: "#ffc928",
      panelText: "#7a0c0c",
      cardRadius: 4,
      nameColor: "#7a0c0c",
      priceBg: "#7a0c0c",
      priceText: "#ffffff",
      badgeShape: "corner",
      badgeBg: "#7a0c0c",
      badgeText: "#ffc928",
      footerStyle: "split",
      footerBg: "#7a0c0c",
      footerText: "#ffffff",
      footerAccent: "#ffc928",
      headingFont: "poppins",
      priceFont: "poppins",
    }),
    content: c({
      kicker: "Weekend",
      headline: "BIG DEALS",
      headline2: "GROCERY",
      subheadline: "GET SPECIAL DISCOUNT ➤",
      offerLabel: "GET UP TO",
      offerValue: "70%",
    }),
  },
  {
    id: "fresh-deals-grid",
    name: "Fresh Deals Grid",
    description: "Bright red board with a white header, serif title and a 4-column product grid.",
    category: "weekend",
    validDays: 2,
    layout: { columns: 4 },
    style: s({
      bgTop: "#e31e24",
      bgBottom: "#cf1219",
      bgPattern: "diagonal",
      headerStyle: "split",
      headerBg: "#ffffff",
      headerText: "#e31e24",
      headlineColor: "#1f7a3a",
      panelBg: "#e31e24",
      panelText: "#ffffff",
      cardRadius: 12,
      cardShadow: false,
      nameColor: "#1f7a3a",
      priceBg: "#e31e24",
      badgeShape: "dot",
      badgePosition: "left",
      badgeBg: "#ffd21f",
      badgeText: "#b3121a",
      footerStyle: "split",
      footerBg: "#ffd21f",
      footerText: "#1f2937",
      footerAccent: "#1f7a3a",
      headingFont: "bree",
      priceFont: "poppins",
    }),
    content: c({ kicker: "Weekend", headline: "Fresh", headline2: "Deals", headlineMl: "ഫ്രഷ് ഓഫറുകൾ" }),
  },
  {
    id: "wood-fresh-market",
    name: "Fresh Market (Wood)",
    description: "Light wood background, green half-circle header and round yellow price badges.",
    category: "fresh",
    validDays: 3,
    layout: { imageScale: 1.15 },
    style: s({
      bgTop: "#f1f3f1",
      bgBottom: "#dfe3df",
      bgPattern: "wood",
      headerStyle: "arc",
      headerBg: "#8cc63f",
      headerText: "#ffffff",
      headlineColor: "#fff35c",
      decoration: "leaves",
      decorationColor: "#5fa52d",
      panelBg: "#ffffff",
      panelText: "#3f7d1c",
      cardStyle: "free",
      nameColor: "#1f2937",
      priceStyle: "circle",
      priceBg: "#ffd400",
      priceText: "#c8102e",
      priceAccent: "#c8102e",
      mrpColor: "#3b3b3b",
      footerBg: "#5a8f29",
      headingFont: "lilita",
      priceFont: "lilita",
    }),
    content: c({ headline: "FRESH", headline2: "Deals", headlineMl: "ഫ്രഷ് ഓഫറുകൾ", showDiscount: false }),
  },
  {
    id: "green-fresh-deals",
    name: "Green Fresh Deals",
    description: "Big 3D title in a green circle, curved green header and round price badges.",
    category: "fresh",
    autoCategory: "Vegetables",
    validDays: 2,
    layout: { imageScale: 1.15 },
    style: s({
      bgTop: "#ffffff",
      bgBottom: "#eef4ee",
      headerStyle: "blob",
      headerBg: "#3c9a3c",
      headerText: "#ffffff",
      headlineColor: "#f5e400",
      headline3d: true,
      panelBg: "#c8102e",
      panelText: "#ffffff",
      stripStyle: "bar",
      stripBg: "#ffe14d",
      stripText: "#1f2937",
      cardStyle: "free",
      priceStyle: "circle",
      priceBg: "#1f7a2e",
      priceText: "#ffffff",
      priceAccent: "#f5e400",
      mrpColor: "#e7f5c8",
      footerStyle: "split",
      footerBg: "#2e6e2a",
      footerText: "#ffffff",
      footerAccent: "#f5e400",
      headingFont: "luckiest",
      priceFont: "lilita",
    }),
    content: c({ headline: "FRESH", headline2: "DEALS", headlineMl: "പച്ചക്കറി ഓഫറുകൾ", subheadline: "MAIN BRANCH", showDiscount: false }),
  },
  {
    id: "leafy-fresh-deal",
    name: "Leafy Fresh Deal",
    description: "Sunny leaf background, script title and red price boxes with yellow name bars.",
    category: "fresh",
    validDays: 3,
    style: s({
      bgTop: "#e3f4c7",
      bgBottom: "#a9d77f",
      bgPattern: "bokeh",
      headerStyle: "script",
      headerBg: "#ffffff",
      headerText: "#2f7d32",
      headlineColor: "#e8661a",
      decoration: "leaves",
      decorationColor: "#5fae3c",
      panelBg: "#ffffff",
      panelText: "#2f7d32",
      stripStyle: "bar",
      stripBg: "#c8102e",
      stripText: "#ffffff",
      cardStyle: "panel",
      cardBg: "#ffffff",
      cardRadius: 6,
      priceStyle: "bar",
      priceBg: "#d71920",
      priceText: "#ffffff",
      priceAccent: "#f2c40f",
      nameColor: "#1f2937",
      footerStyle: "split",
      footerBg: "#ffffff",
      footerText: "#1f2937",
      footerAccent: "#2f7d32",
      headingFont: "lobster",
      priceFont: "anton",
    }),
    content: c({ headline: "fresh", headline2: "deal", headlineMl: "ഫ്രഷ് ഡീൽ", subheadline: "FRESH PROMOTION", showDiscount: false }),
  },
  {
    id: "paper-fresh-deals",
    name: "Fresh Deals (Paper)",
    description: "Cream paper texture, bubbly green title, big products with large prices.",
    category: "fresh",
    autoCategory: "Fruits",
    validDays: 3,
    layout: { columns: 2, rows: 2, imageScale: 1.1 },
    style: s({
      bgTop: "#f7f1e3",
      bgBottom: "#efe6d2",
      bgPattern: "paper",
      headerStyle: "stack",
      headerBg: "#f7f1e3",
      headerText: "#1f6f2b",
      headlineColor: "#9ad84f",
      headline3d: true,
      decoration: "sparkles",
      decorationColor: "#5fae3c",
      panelBg: "#1f6f2b",
      panelText: "#ffffff",
      stripStyle: "bar",
      stripBg: "#1f6f2b",
      stripText: "#ffffff",
      cardStyle: "divider",
      nameColor: "#2b2b2b",
      priceStyle: "big",
      priceBg: "#1f6f2b",
      mrpColor: "#4b4b4b",
      footerBg: "#e7e7e7",
      footerText: "#1f6f2b",
      headingFont: "luckiest",
      priceFont: "lilita",
    }),
    content: c({ headline: "Fresh", headline2: "DEALS", headlineMl: "ഫ്രഷ് ഓഫറുകൾ", subheadline: "SUNDAY | MONDAY | TUESDAY", heroEmoji: "🍑" }),
  },
  {
    id: "fresh-market-days",
    name: "Fresh Market Days",
    description: "Deep green board, huge condensed title, shopping-cart picture and yellow price tags.",
    category: "weekly",
    validDays: 3,
    style: s({
      bgTop: "#11823d",
      bgBottom: "#0b6a31",
      headerStyle: "stack",
      headerBg: "#11823d",
      headerText: "#ffffff",
      headlineColor: "#ffd21f",
      panelBg: "#ffd21f",
      panelText: "#0b3d1f",
      stripStyle: "bar",
      stripBg: "#0b6a31",
      stripText: "#ffd21f",
      cardStyle: "divider",
      nameColor: "#ffffff",
      mrpColor: "#cfe9d8",
      priceStyle: "tag",
      priceBg: "#ffd21f",
      priceText: "#0b3d1f",
      footerStyle: "split",
      footerBg: "#eef0f2",
      footerText: "#11823d",
      footerAccent: "#11823d",
      headingFont: "anton",
      priceFont: "anton",
    }),
    content: c({
      headline: "FRESH MARKET",
      headline2: "DAYS",
      headlineMl: "ഫ്രഷ് മാർക്കറ്റ് ദിനങ്ങൾ",
      subheadline: "YOUR FAVOURITE WEEKDAY OFFERS!",
      heroEmoji: "🛒",
    }),
  },
  {
    id: "weekend-fresh-sale",
    name: "Weekend Fresh Sale",
    description: "Teal board, yellow title circle, Malayalam names on white cards and red price tags.",
    category: "weekend",
    autoCategory: "Vegetables",
    validDays: 2,
    layout: { columns: 4 },
    style: s({
      bgTop: "#25a5a0",
      bgBottom: "#0f6f6c",
      headerStyle: "circle",
      headerBg: "#ffffff",
      headerText: "#1f2937",
      headlineColor: "#111111",
      headingItalic: true,
      panelBg: "#ffe600",
      panelText: "#111111",
      stripStyle: "bar",
      stripBg: "#111111",
      stripText: "#ffffff",
      cardRadius: 22,
      cardShadow: false,
      namePosition: "above",
      nameColor: "#111111",
      priceStyle: "slant",
      priceBg: "#c8102e",
      priceText: "#ffffff",
      footerStyle: "strip",
      footerBg: "#ffffff",
      footerText: "#111111",
      footerAccent: "#ffe600",
      headingFont: "barlow",
      priceFont: "barlow",
    }),
    content: c({
      kicker: "WEEKEND",
      headline: "FRESH",
      headline2: "SALE",
      subheadline: "*ഈ ഓഫർ സ്റ്റോക്ക് തീരുന്നത് വരെ മാത്രം",
      heroEmoji: "🧺",
      nameMode: "ml",
      footerNote: "ഈ ഓഫർ ഷോപ്പിൽ നിന്ന് നേരിട്ടുള്ള പർച്ചേസുകൾക്ക് മാത്രം",
      showDiscount: false,
    }),
  },
  {
    id: "onam-chantha",
    name: "Onam Chantha",
    description: "Marigold flowers, Malayalam title circle and red price flags on a golden board.",
    category: "festival",
    validDays: 1,
    style: s({
      bgTop: "#ffd84a",
      bgBottom: "#ff8c00",
      headerStyle: "circle",
      headerBg: "#00000000",
      headerText: "#5a1408",
      headlineColor: "#b3121a",
      decoration: "flowers",
      decorationColor: "#ff6f00",
      panelBg: "#ffffff",
      panelText: "#b3121a",
      stripStyle: "bar",
      stripBg: "#8b1a1a",
      stripText: "#ffffff",
      cardRadius: 6,
      cardShadow: true,
      nameColor: "#1f2937",
      priceStyle: "flag",
      priceBg: "#c8102e",
      priceText: "#ffffff",
      footerBg: "#8b2a1a",
      footerText: "#ffffff",
      headingFont: "poppins",
      priceFont: "poppins",
      mlFont: "baloo",
    }),
    content: c({
      headline: "",
      headlineMl: "ഓണച്ചന്ത",
      subheadline: "FAMILY SHOP",
      heroEmoji: "🌼",
      nameMode: "en",
      footerNote: "എല്ലാവിധ ഓണം ഉൽപ്പന്നങ്ങളും ലഭ്യമാണ്",
      showDiscount: false,
    }),
  },
  {
    id: "special-offers",
    name: "Special Offers",
    description: "Green swoosh, big 3D yellow title, red star discounts and red price tags.",
    category: "special",
    validDays: 7,
    style: s({
      bgTop: "#ffffff",
      bgBottom: "#ffffff",
      headerStyle: "stack",
      headerBg: "#ffffff",
      headerText: "#d4141b",
      headlineColor: "#ffd21f",
      headline3d: true,
      decoration: "swoosh",
      decorationColor: "#3aa53a",
      panelBg: "#d4141b",
      panelText: "#ffffff",
      stripStyle: "pill",
      stripBg: "#fff4d6",
      stripText: "#7a0c0c",
      cardStyle: "divider",
      nameColor: "#111827",
      mrpColor: "#6b7280",
      priceStyle: "tag",
      priceBg: "#e31e24",
      priceText: "#ffffff",
      badgeShape: "burst",
      badgePosition: "left",
      badgeBg: "#e31e24",
      badgeText: "#ffffff",
      footerStyle: "banner",
      footerBg: "#e31e24",
      footerText: "#ffffff",
      headingFont: "luckiest",
      priceFont: "anton",
    }),
    content: c({ headline: "SPECIAL", headline2: "OFFERS", headlineMl: "സ്പെഷ്യൽ ഓഫറുകൾ", heroEmoji: "🧺" }),
  },
  {
    id: "daily-deals",
    name: "Daily Deals",
    description: "Classic red & yellow supermarket look with sun rays for today’s offers.",
    category: "daily",
    validDays: 1,
    style: s({
      bgTop: "#fff6d6",
      bgBottom: "#ffe7a3",
      headerBg: "#d71920",
      headerText: "#ffffff",
      headlineColor: "#ffffff",
      decoration: "rays",
      decorationColor: "#ffd23f",
      priceBg: "#d71920",
      badgeBg: "#ffd400",
      badgeText: "#b3121a",
      footerBg: "#d71920",
    }),
    content: c({ headline: "TODAY'S OFFERS", headlineMl: "ഇന്നത്തെ ഓഫറുകൾ", subheadline: "Best prices in town", badgeText: "TODAY ONLY" }),
  },
  {
    id: "festival",
    name: "Kasavu Festival",
    description: "Kerala kasavu cream & gold with a maroon ribbon for Onam, Vishu and festivals.",
    category: "festival",
    validDays: 5,
    style: s({
      bgTop: "#fffaf0",
      bgBottom: "#f8ecc9",
      headerBg: "#7a1616",
      headerText: "#ffe8a3",
      headlineColor: "#ffe8a3",
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
    }),
    content: c({ headline: "FESTIVAL OFFERS", headlineMl: "ഉത്സവ ഓഫറുകൾ", subheadline: "Celebrate with savings", badgeText: "SPECIAL" }),
  },
  {
    id: "brand-classic",
    name: "Brand Classic",
    description: "Clean layout in your store’s own brand colours.",
    category: "brand",
    brand: true,
    validDays: 3,
    style: s({
      bgTop: "#ffffff",
      bgBottom: "#f3f4f6",
      headerStyle: "plain",
      headerBg: "#d71920",
      headlineColor: "#d71920",
      priceBg: "#d71920",
      badgeBg: "#ffcc00",
      badgeText: "#111827",
      cardShadow: false,
      headingFont: "poppins",
      priceFont: "poppins",
    }),
    content: c({ headline: "SPECIAL OFFERS", headlineMl: "സ്പെഷ്യൽ ഓഫറുകൾ" }),
  },
];

export function getTemplate(id: string): PosterTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

// ---------- colour helpers ----------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").slice(0, 6);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function isTransparent(hex: string): boolean {
  const h = hex.replace("#", "");
  return h.length === 8 && parseInt(h.slice(6, 8), 16) < 16;
}

/** Relative luminance (0 – 1). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
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

/** Re-colours a style with the store brand colours, keeping its shapes and fonts. */
export function applyBrandColors(style: PosterStyle, colors: BrandColors): PosterStyle {
  const { primary, secondary, accent } = colors;
  const onPrimary = readableOn(primary);
  return {
    ...style,
    bgTop: mix(secondary, "#ffffff", 0.35),
    bgBottom: secondary,
    headerBg: primary,
    headerText: onPrimary,
    headlineColor: style.headerStyle === "plain" ? primary : accent,
    decorationColor: accent,
    panelBg: accent,
    panelText: readableOn(accent, mix(primary, "#000000", 0.35)),
    stripBg: style.stripStyle === "bar" ? primary : "#ffffff",
    stripText: style.stripStyle === "bar" ? onPrimary : mix(primary, "#000000", 0.3),
    priceBg: primary,
    priceText: onPrimary,
    priceAccent: accent,
    badgeBg: accent,
    badgeText: readableOn(accent, mix(primary, "#000000", 0.35)),
    footerBg: primary,
    footerText: onPrimary,
    footerAccent: accent,
  };
}

// ---------- formats & defaults ----------

export const FORMATS: Record<FormatKey, { label: string; hint: string; width: number; height: number; maxPerPage: number }> = {
  portrait: { label: "Portrait", hint: "Instagram / Facebook post", width: 1080, height: 1350, maxPerPage: 12 },
  square: { label: "Square", hint: "WhatsApp / Instagram", width: 1080, height: 1080, maxPerPage: 9 },
  story: { label: "Story", hint: "WhatsApp status / Reels", width: 1080, height: 1920, maxPerPage: 15 },
  a4: { label: "A4 print", hint: "Shop notice board", width: 1240, height: 1754, maxPerPage: 16 },
  landscape: { label: "TV screen", hint: "Shop display 16:9", width: 1920, height: 1080, maxPerPage: 10 },
};

export const BASE_LAYOUT: PosterLayout = { format: "portrait", columns: 0, rows: 0, gap: 22, imageScale: 1, headerSize: 1 };

export function defaultLayout(format: FormatKey = "portrait", template?: PosterTemplate): PosterLayout {
  return { ...BASE_LAYOUT, ...template?.layout, format };
}

export const BASE_CONTENT: PosterContent = {
  kicker: "",
  headline: "SPECIAL OFFERS",
  headline2: "",
  headlineMl: "",
  subheadline: "",
  badgeText: "",
  offerLabel: "",
  offerValue: "",
  heroImageUrl: "",
  heroEmoji: "",
  nameMode: "both",
  footerNote: "Offer valid while stocks last. Prices inclusive of taxes.",
  validFrom: "",
  validTo: "",
  showMrp: true,
  showDiscount: true,
  showLogo: true,
  showContact: true,
  showValidity: true,
  showHero: true,
};

export function defaultContent(template: PosterTemplate, today: string, validTo: string): PosterContent {
  return { ...BASE_CONTENT, ...template.content, validFrom: today, validTo };
}

/**
 * Fills in fields added after a poster was saved, so older posters keep working
 * and look exactly as before.
 */
export function normalizeStyle(style: Partial<PosterStyle>): PosterStyle {
  const legacyHeadline = style.headerStyle === "plain" ? style.headerBg : style.headerText;
  return {
    ...BASE_STYLE,
    headlineColor: legacyHeadline ?? BASE_STYLE.headlineColor,
    panelBg: style.badgeBg ?? BASE_STYLE.panelBg,
    panelText: style.badgeText ?? BASE_STYLE.panelText,
    priceAccent: style.badgeBg ?? BASE_STYLE.priceAccent,
    footerAccent: style.badgeBg ?? BASE_STYLE.footerAccent,
    ...style,
  };
}

export function normalizeContent(content: Partial<PosterContent>): PosterContent {
  return { ...BASE_CONTENT, ...content };
}

export function normalizeLayout(layout: Partial<PosterLayout>): PosterLayout {
  return { ...BASE_LAYOUT, ...layout };
}

export function normalizePoster<T extends { style: PosterStyle; content: PosterContent; layout: PosterLayout }>(poster: T): T {
  return { ...poster, style: normalizeStyle(poster.style), content: normalizeContent(poster.content), layout: normalizeLayout(poster.layout) };
}

/** A strong colour from the poster for web pages (header can be white or see-through). */
export function pageColor(style: Pick<PosterStyle, "headerBg" | "priceBg" | "footerBg" | "panelBg">): string {
  const candidates = [style.headerBg, style.priceBg, style.footerBg, style.panelBg];
  return candidates.find((c) => !isTransparent(c) && luminance(c) < 0.55) ?? "#111827";
}
