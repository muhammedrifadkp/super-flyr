// Shared domain types used by the API, the dashboard and the poster renderer.

export type FontKey =
  | "anton"
  | "bebas"
  | "oswald"
  | "poppins"
  | "montserrat"
  | "baloo"
  | "anek"
  | "notoMl"
  | "manjari";

export type FormatKey = "square" | "portrait" | "story" | "a4" | "landscape";

export type HeaderStyle = "banner" | "ribbon" | "plain";
export type Decoration = "none" | "rays" | "leaves" | "dots" | "confetti" | "kasavu";
export type BadgeShape = "burst" | "circle" | "tag";

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Store {
  id: string;
  name: string;
  tagline: string;
  logoUrl: string;
  phone: string;
  whatsapp: string;
  address: string;
  mapUrl: string;
  colors: BrandColors;
  updatedAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  nameMl: string;
  category: string;
  unit: string;
  imageUrl: string;
  normalPrice: number;
  offerPrice: number;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Pick<
  Product,
  "name" | "nameMl" | "category" | "unit" | "imageUrl" | "normalPrice" | "offerPrice"
>;

/** A product placed on a poster. Any field set here overrides the product library value. */
export interface PosterItem {
  id: string;
  productId: string;
  name?: string;
  nameMl?: string;
  unit?: string;
  normalPrice?: number;
  offerPrice?: number;
}

export interface PosterStyle {
  bgTop: string;
  bgBottom: string;
  headerBg: string;
  headerText: string;
  headerStyle: HeaderStyle;
  decoration: Decoration;
  decorationColor: string;
  cardBg: string;
  cardRadius: number;
  cardShadow: boolean;
  nameColor: string;
  mrpColor: string;
  priceBg: string;
  priceText: string;
  badgeBg: string;
  badgeText: string;
  badgeShape: BadgeShape;
  footerBg: string;
  footerText: string;
  headingFont: FontKey;
  priceFont: FontKey;
  bodyFont: FontKey;
  mlFont: FontKey;
}

export interface PosterLayout {
  format: FormatKey;
  /** 0 = automatic */
  columns: number;
  /** 0 = automatic */
  rows: number;
  gap: number;
  /** 0.6 – 1.4, scales the product image inside its card */
  imageScale: number;
}

export interface PosterContent {
  headline: string;
  headlineMl: string;
  subheadline: string;
  badgeText: string;
  footerNote: string;
  /** YYYY-MM-DD or "" */
  validFrom: string;
  /** YYYY-MM-DD or "" */
  validTo: string;
  showMrp: boolean;
  showDiscount: boolean;
  showLogo: boolean;
  showContact: boolean;
  showValidity: boolean;
}

export interface Poster {
  id: string;
  storeId: string;
  title: string;
  templateId: string;
  slug: string;
  published: boolean;
  layout: PosterLayout;
  style: PosterStyle;
  content: PosterContent;
  items: PosterItem[];
  createdAt: string;
  updatedAt: string;
}

export type PosterPatch = Partial<
  Pick<Poster, "title" | "templateId" | "published" | "layout" | "style" | "content" | "items">
>;

/** A poster item merged with its library product, ready to draw. */
export interface ResolvedItem {
  id: string;
  productId: string;
  name: string;
  nameMl: string;
  unit: string;
  category: string;
  imageUrl: string;
  normalPrice: number;
  offerPrice: number;
}
