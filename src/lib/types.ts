// Shared domain types used by the API, the dashboard and the poster renderer.

export type FontKey =
  | "anton"
  | "bebas"
  | "oswald"
  | "poppins"
  | "montserrat"
  | "luckiest"
  | "lilita"
  | "lobster"
  | "bree"
  | "barlow"
  | "baloo"
  | "anek"
  | "notoMl"
  | "manjari";

export type FormatKey = "square" | "portrait" | "story" | "a4" | "landscape";

/** How the top of the poster is laid out. */
export type HeaderStyle =
  | "banner" // full-width colour block with curved bottom, centred title
  | "ribbon" // centred title on a ribbon
  | "plain" // centred title on the background
  | "split" // colour block, title left, offer box + date + logo right
  | "arc" // big half-circle at the top centre
  | "blob" // large curved shape top-right, 3D title in a circle on the left
  | "circle" // title inside a big circle on the left, store info and hero image right
  | "stack" // huge stacked title, hero image on the left
  | "script"; // logo in a circle left, two-colour title right
export type Decoration = "none" | "rays" | "leaves" | "dots" | "confetti" | "kasavu" | "flowers" | "sparkles" | "swoosh";
export type BgPattern = "none" | "wood" | "paper" | "diagonal" | "bokeh";
export type CardStyle = "card" | "free" | "panel" | "divider";
export type PriceStyle = "pill" | "circle" | "slant" | "flag" | "bar" | "big" | "tag";
export type BadgeShape = "burst" | "circle" | "tag" | "corner" | "dot";
export type FooterStyle = "band" | "split" | "strip" | "banner";
export type StripStyle = "pill" | "bar";
export type NameMode = "both" | "en" | "ml";
export type BadgeMode = "percent" | "save" | "smart" | "bogo";
export type BrandAlign = "auto" | "left" | "center" | "right";

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
  /** Default product image scale multiplier (0.4 – 2.2, default 1) so cutouts of different sizes look uniform. */
  imageScale?: number;
  normalPrice: number;
  offerPrice: number;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Pick<
  Product,
  "name" | "nameMl" | "category" | "unit" | "imageUrl" | "normalPrice" | "offerPrice"
> & {
  imageScale?: number;
};

/** A product placed on a poster. Any field set here overrides the product library value. */
export interface PosterItem {
  id: string;
  productId: string;
  name?: string;
  nameMl?: string;
  unit?: string;
  imageUrl?: string;
  normalPrice?: number;
  offerPrice?: number;
  /** Optional custom badge label for this item, e.g. "BUY 1 GET 1" or "COMBO". */
  tag?: string;
  /** Individual card width multiplier (0.4 – 2.0, default 1). */
  widthScale?: number;
  /** Individual card height multiplier (0.4 – 2.0, default 1). */
  heightScale?: number;
  /** Individual product image scale multiplier (0.4 – 2.0, default 1). */
  imageScale?: number;
  /** Individual card horizontal offset in design units. */
  offsetX?: number;
  /** Individual card vertical offset in design units. */
  offsetY?: number;
}

export interface PosterStyle {
  // Background
  bgTop: string;
  bgBottom: string;
  bgPattern: BgPattern;
  // Header
  headerBg: string;
  headerText: string;
  /** Colour of the main headline word(s). */
  headlineColor: string;
  headerStyle: HeaderStyle;
  /** 3D drop shadow behind the headline. */
  headline3d: boolean;
  headingItalic: boolean;
  decoration: Decoration;
  decorationColor: string;
  /** Logo box, offer box, title circle and ribbons. */
  panelBg: string;
  panelText: string;
  // Date / sub-headline strip
  stripStyle: StripStyle;
  stripBg: string;
  stripText: string;
  // Product cards
  cardStyle: CardStyle;
  cardBg: string;
  cardRadius: number;
  cardShadow: boolean;
  nameColor: string;
  namePosition: "below" | "above";
  mrpColor: string;
  // Price
  priceStyle: PriceStyle;
  priceBg: string;
  priceText: string;
  /** Ring / second colour of the price badge. */
  priceAccent: string;
  // Discount badge and offer box
  badgeBg: string;
  badgeText: string;
  badgeShape: BadgeShape;
  badgePosition: "left" | "right";
  // Footer
  footerStyle: FooterStyle;
  footerBg: string;
  footerText: string;
  footerAccent: string;
  // Fonts
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
  /** 0.7 – 1.5, scales the header height */
  headerSize: number;
  /** Highlights the 1st product on page 1 across 2 columns as a Mega Deal. */
  heroFirst?: boolean;
  /** 0.5 – 1.4, scales the width of all product cards inside their grid slots. */
  cardWidthScale?: number;
  /** 0.5 – 1.4, scales the height of all product cards inside their grid slots. */
  cardHeightScale?: number;
}

export interface PosterContent {
  /** Small line above the headline, e.g. "Weekend". */
  kicker: string;
  headline: string;
  /** Second headline line / word, e.g. "DEALS". */
  headline2: string;
  headlineMl: string;
  subheadline: string;
  /** Small tilted sticker, e.g. "TODAY ONLY". */
  badgeText: string;
  /** Offer box, e.g. "GET UP TO" + "70%". Empty value hides it. */
  offerLabel: string;
  offerValue: string;
  /** Picture in the header (basket, cart, store photo). Empty = use heroEmoji. */
  heroImageUrl: string;
  heroEmoji: string;
  /** Which product names to print. */
  nameMode: NameMode;
  /** How product discount badges are displayed (% OFF, SAVE ₹, Smart, BOGO). */
  badgeMode?: BadgeMode;
  /** Optional delivery / highlight stamp text, e.g. "FREE HOME DELIVERY". */
  deliveryBadge?: string;
  footerNote: string;
  /** YYYY-MM-DD or "" */
  validFrom: string;
  /** YYYY-MM-DD or "" */
  validTo: string;
  showMrp: boolean;
  showDiscount: boolean;
  showLogo: boolean;
  /** Whether to display the store name text in the header. */
  showStoreName?: boolean;
  /** 0.4 – 2.4, scales the store logo in the header. */
  logoScale?: number;
  /** 0.4 – 2.4, scales the store name text in the header. */
  storeNameScale?: number;
  /** Quick horizontal alignment for store logo & name in the header. */
  brandAlign?: BrandAlign;
  /** Horizontal offset for store logo & name in design units. */
  brandOffsetX?: number;
  /** Vertical offset for store logo & name in design units. */
  brandOffsetY?: number;
  /** Extra horizontal offset for store name relative to logo. */
  storeNameOffsetX?: number;
  /** Extra vertical offset for store name relative to logo. */
  storeNameOffsetY?: number;
  showContact: boolean;
  showValidity: boolean;
  showHero: boolean;
  /** Shows a scannable QR code on the poster footer linking to the online offer page / WhatsApp. */
  showQr?: boolean;
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
  tag?: string;
  widthScale?: number;
  heightScale?: number;
  imageScale?: number;
  offsetX?: number;
  offsetY?: number;
}
