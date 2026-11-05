import { KERALA_MASTER_CATALOGUE } from "./keralaCatalogue";
import type { BrandColors, Store } from "./types";

/** Each deployment serves one store. STORE_ID keeps every record ready for multi-store later. */
export function currentStoreId(): string {
  return process.env.STORE_ID?.trim() || "default";
}

export const DEFAULT_CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Grocery",
  "Dairy",
  "Meat & Fish",
  "Bakery",
  "Beverages",
  "Snacks",
  "Household",
  "Personal Care",
] as const;

export const DEFAULT_UNITS = ["kg", "500 g", "250 g", "100 g", "5 kg", "10 kg", "pcs", "ltr", "500 ml", "pack", "dozen", "bundle", "combo"];

export function defaultStore(id: string): Store {
  return {
    id,
    name: "Malabar Fresh Hypermarket",
    tagline: "വിലക്കുറവിന്റെ വിശ്വസ്ത കേന്ദ്രം • Fresh • Quality • Savings",
    logoUrl: "",
    phone: "0495 272 4455",
    whatsapp: "919847012345",
    address: "Mavoor Road, Calicut, Kerala",
    mapUrl: "https://maps.google.com",
    colors: { primary: "#d71920", secondary: "#fff4d6", accent: "#ffcc00" },
    updatedAt: new Date(0).toISOString(),
  };
}

/** Ready-to-use Kerala supermarket profiles for 1-click live client demos. */
export const STORE_DEMO_PRESETS: Array<{
  id: string;
  label: string;
  name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  address: string;
  mapUrl: string;
  colors: BrandColors;
}> = [
  {
    id: "malabar-hyper",
    label: "Malabar Hypermarket (Calicut)",
    name: "Malabar Fresh Hypermarket",
    tagline: "വിലക്കുറവിന്റെ വിശ്വസ്ത കേന്ദ്രം • Free Home Delivery",
    phone: "0495 272 4455",
    whatsapp: "919847012345",
    address: "Mavoor Road, Kozhikode, Kerala",
    mapUrl: "https://maps.google.com",
    colors: { primary: "#d71920", secondary: "#fff4d6", accent: "#ffcc00" },
  },
  {
    id: "kochi-greens",
    label: "Grand Fresh Mart (Kochi)",
    name: "Grand Fresh Supermarket",
    tagline: "Everyday Fresh Deals • മായമില്ലാത്ത നാടൻ ഉൽപ്പന്നങ്ങൾ",
    phone: "0484 234 8899",
    whatsapp: "919447012345",
    address: "Edappally Bypass, Kochi, Ernakulam",
    mapUrl: "https://maps.google.com",
    colors: { primary: "#15803d", secondary: "#ecfdf5", accent: "#facc15" },
  },
  {
    id: "royal-mart",
    label: "Royal Family Mart (Thrissur)",
    name: "Royal Family Supermarket",
    tagline: "കുടുംബ ബജറ്റിന് ഏറ്റവും മികച്ച ചോയ്സ് • Wholesale & Retail",
    phone: "0487 242 5566",
    whatsapp: "919745012345",
    address: "Swaraj Round, Thrissur, Kerala",
    mapUrl: "https://maps.google.com",
    colors: { primary: "#7a1616", secondary: "#fbf3df", accent: "#c9a227" },
  },
];

/** Demo catalogue used by "Load demo products". */
export const DEMO_PRODUCTS = KERALA_MASTER_CATALOGUE.slice(0, 24).map((item) => ({
  emoji: item.emoji,
  name: item.name,
  nameMl: item.nameMl,
  category: item.category,
  unit: item.unit,
  normalPrice: item.normalPrice,
  offerPrice: item.offerPrice,
  imageUrl: item.imageUrl,
  accent: item.accent,
}));
