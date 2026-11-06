import { z } from "zod";

const color = z.string().regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Use a hex colour like #d71920");
const text = (max: number) => z.string().trim().max(max);
const imageUrl = z
  .string()
  .trim()
  .max(600)
  .refine(
    (v) => v === "" || v.startsWith("/api/files/") || v.startsWith("/poster-assets/") || /^https:\/\//.test(v),
    "Invalid image URL",
  );
const price = z.coerce.number().min(0, "Price can’t be negative").max(10_000_000);
const day = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use YYYY-MM-DD");

const fontKey = z.enum([
  "anton",
  "bebas",
  "oswald",
  "poppins",
  "montserrat",
  "luckiest",
  "lilita",
  "lobster",
  "bree",
  "barlow",
  "baloo",
  "anek",
  "notoMl",
  "manjari",
]);

export const storePatchSchema = z
  .object({
    name: text(80).min(1, "Store name is required"),
    tagline: text(120),
    logoUrl: imageUrl,
    phone: text(30),
    whatsapp: text(30),
    address: text(240),
    mapUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || /^https:\/\//.test(v), "Map link must start with https://"),
    colors: z.object({ primary: color, secondary: color, accent: color }),
  })
  .partial();

export const productInputSchema = z.object({
  name: text(80).min(1, "Product name is required"),
  nameMl: text(80).default(""),
  category: text(40).min(1, "Category is required"),
  unit: text(20).default(""),
  imageUrl: imageUrl.default(""),
  normalPrice: price,
  offerPrice: price,
});

export const productPatchSchema = productInputSchema.partial();

export const productBulkSchema = z.object({
  products: z.array(productInputSchema).min(1).max(200),
});

export const posterItemSchema = z.object({
  id: z.string().min(1).max(40),
  productId: z.string().min(1).max(40),
  name: text(80).optional(),
  nameMl: text(80).optional(),
  unit: text(20).optional(),
  normalPrice: price.optional(),
  offerPrice: price.optional(),
  tag: text(24).optional(),
  widthScale: z.number().min(0.4).max(2.2).optional(),
  heightScale: z.number().min(0.4).max(2.2).optional(),
  imageScale: z.number().min(0.4).max(2.2).optional(),
  offsetX: z.number().min(-800).max(800).optional(),
  offsetY: z.number().min(-800).max(800).optional(),
});

export const posterLayoutSchema = z.object({
  format: z.enum(["square", "portrait", "story", "a4", "landscape"]),
  columns: z.number().int().min(0).max(8),
  rows: z.number().int().min(0).max(10),
  gap: z.number().min(0).max(80),
  imageScale: z.number().min(0.5).max(1.6),
  headerSize: z.number().min(0.6).max(1.6).default(1),
  heroFirst: z.boolean().default(false),
  cardWidthScale: z.number().min(0.4).max(1.6).default(1),
  cardHeightScale: z.number().min(0.4).max(1.6).default(1),
});

export const posterStyleSchema = z.object({
  bgTop: color,
  bgBottom: color,
  bgPattern: z.enum(["none", "wood", "paper", "diagonal", "bokeh"]).default("none"),
  headerBg: color,
  headerText: color,
  headlineColor: color.default("#ffffff"),
  headerStyle: z.enum(["banner", "ribbon", "plain", "split", "arc", "blob", "circle", "stack", "script"]),
  headline3d: z.boolean().default(false),
  headingItalic: z.boolean().default(false),
  decoration: z.enum(["none", "rays", "leaves", "dots", "confetti", "kasavu", "flowers", "sparkles", "swoosh"]),
  decorationColor: color,
  panelBg: color.default("#ffd400"),
  panelText: color.default("#111827"),
  stripStyle: z.enum(["pill", "bar"]).default("pill"),
  stripBg: color.default("#ffffff"),
  stripText: color.default("#1f2937"),
  cardStyle: z.enum(["card", "free", "panel", "divider"]).default("card"),
  cardBg: color,
  cardRadius: z.number().min(0).max(60),
  cardShadow: z.boolean(),
  nameColor: color,
  namePosition: z.enum(["below", "above"]).default("below"),
  mrpColor: color,
  priceStyle: z.enum(["pill", "circle", "slant", "flag", "bar", "big", "tag"]).default("pill"),
  priceBg: color,
  priceText: color,
  priceAccent: color.default("#ffd400"),
  badgeBg: color,
  badgeText: color,
  badgeShape: z.enum(["burst", "circle", "tag", "corner", "dot"]),
  badgePosition: z.enum(["left", "right"]).default("right"),
  footerStyle: z.enum(["band", "split", "strip", "banner"]).default("band"),
  footerBg: color,
  footerText: color,
  footerAccent: color.default("#ffd400"),
  headingFont: fontKey,
  priceFont: fontKey,
  bodyFont: fontKey,
  mlFont: fontKey,
});

export const posterContentSchema = z.object({
  kicker: text(40).default(""),
  headline: text(60),
  headline2: text(60).default(""),
  headlineMl: text(60),
  subheadline: text(100),
  badgeText: text(24),
  offerLabel: text(24).default(""),
  offerValue: text(12).default(""),
  heroImageUrl: imageUrl.default(""),
  heroEmoji: text(16).default(""),
  nameMode: z.enum(["both", "en", "ml"]).default("both"),
  badgeMode: z.enum(["percent", "save", "smart", "bogo"]).default("percent"),
  deliveryBadge: text(40).default(""),
  footerNote: text(160),
  validFrom: day,
  validTo: day,
  showMrp: z.boolean(),
  showDiscount: z.boolean(),
  showLogo: z.boolean(),
  showStoreName: z.boolean().default(true),
  logoScale: z.number().min(0.3).max(3).default(1),
  storeNameScale: z.number().min(0.3).max(3).default(1),
  brandAlign: z.enum(["auto", "left", "center", "right"]).default("auto"),
  brandOffsetX: z.number().min(-1000).max(1000).default(0),
  brandOffsetY: z.number().min(-1000).max(1000).default(0),
  storeNameOffsetX: z.number().min(-1000).max(1000).default(0),
  storeNameOffsetY: z.number().min(-1000).max(1000).default(0),
  showContact: z.boolean(),
  showValidity: z.boolean(),
  showHero: z.boolean().default(true),
  showQr: z.boolean().default(false),
});

export const posterPatchSchema = z
  .object({
    title: text(80).min(1, "Title is required"),
    templateId: z.string().max(40),
    published: z.boolean(),
    layout: posterLayoutSchema,
    style: posterStyleSchema,
    content: posterContentSchema,
    items: z.array(posterItemSchema).max(120),
  })
  .partial();

export const posterCreateSchema = z.object({
  templateId: z.string().min(1).max(40),
  format: posterLayoutSchema.shape.format.optional(),
  title: text(80).optional(),
});
