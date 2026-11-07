import { KERALA_MASTER_CATALOGUE } from "./keralaCatalogue";
import type { Store } from "./types";

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
