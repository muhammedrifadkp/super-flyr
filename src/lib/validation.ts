import { z } from "zod";

const color = z.string().regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Use a hex colour like #d71920");
const text = (max: number) => z.string().trim().max(max);
const imageUrl = z
  .string()
  .trim()
  .max(600)
  .refine((v) => v === "" || v.startsWith("/api/files/") || /^https:\/\//.test(v), "Invalid image URL");
const price = z.coerce.number().min(0, "Price can’t be negative").max(10_000_000);
const day = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use YYYY-MM-DD");

const fontKey = z.enum(["anton", "bebas", "oswald", "poppins", "montserrat", "baloo", "anek", "notoMl", "manjari"]);

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
});

export const posterLayoutSchema = z.object({
  format: z.enum(["square", "portrait", "story", "a4", "landscape"]),
  columns: z.number().int().min(0).max(8),
  rows: z.number().int().min(0).max(10),
  gap: z.number().min(0).max(80),
  imageScale: z.number().min(0.5).max(1.5),
});

export const posterStyleSchema = z.object({
  bgTop: color,
  bgBottom: color,
  headerBg: color,
  headerText: color,
  headerStyle: z.enum(["banner", "ribbon", "plain"]),
  decoration: z.enum(["none", "rays", "leaves", "dots", "confetti", "kasavu"]),
  decorationColor: color,
  cardBg: color,
  cardRadius: z.number().min(0).max(60),
  cardShadow: z.boolean(),
  nameColor: color,
  mrpColor: color,
  priceBg: color,
  priceText: color,
  badgeBg: color,
  badgeText: color,
  badgeShape: z.enum(["burst", "circle", "tag"]),
  footerBg: color,
  footerText: color,
  headingFont: fontKey,
  priceFont: fontKey,
  bodyFont: fontKey,
  mlFont: fontKey,
});

export const posterContentSchema = z.object({
  headline: text(60),
  headlineMl: text(60),
  subheadline: text(100),
  badgeText: text(24),
  footerNote: text(140),
  validFrom: day,
  validTo: day,
  showMrp: z.boolean(),
  showDiscount: z.boolean(),
  showLogo: z.boolean(),
  showContact: z.boolean(),
  showValidity: z.boolean(),
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
