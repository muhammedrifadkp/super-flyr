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

export const DEFAULT_UNITS = ["kg", "500 g", "250 g", "pcs", "ltr", "500 ml", "pack", "dozen", "bundle"];

export function defaultStore(id: string): Store {
  return {
    id,
    name: "My Supermarket",
    tagline: "Fresh • Quality • Savings",
    logoUrl: "",
    phone: "",
    whatsapp: "",
    address: "",
    mapUrl: "",
    colors: { primary: "#d71920", secondary: "#fff4d6", accent: "#ffcc00" },
    updatedAt: new Date(0).toISOString(),
  };
}

/** Demo catalogue used by "Load demo products". Emoji are drawn into images in the browser. */
export const DEMO_PRODUCTS: Array<{
  emoji: string;
  name: string;
  nameMl: string;
  category: string;
  unit: string;
  normalPrice: number;
  offerPrice: number;
}> = [
  { emoji: "🍅", name: "Tomato", nameMl: "തക്കാളി", category: "Vegetables", unit: "kg", normalPrice: 40, offerPrice: 29 },
  { emoji: "🥕", name: "Carrot", nameMl: "കാരറ്റ്", category: "Vegetables", unit: "kg", normalPrice: 60, offerPrice: 45 },
  { emoji: "🧅", name: "Onion", nameMl: "സവാള", category: "Vegetables", unit: "kg", normalPrice: 50, offerPrice: 38 },
  { emoji: "🥔", name: "Potato", nameMl: "ഉരുളക്കിഴങ്ങ്", category: "Vegetables", unit: "kg", normalPrice: 45, offerPrice: 34 },
  { emoji: "🍆", name: "Brinjal", nameMl: "വഴുതനങ്ങ", category: "Vegetables", unit: "kg", normalPrice: 48, offerPrice: 35 },
  { emoji: "🌶️", name: "Green Chilli", nameMl: "പച്ചമുളക്", category: "Vegetables", unit: "250 g", normalPrice: 25, offerPrice: 18 },
  { emoji: "🥒", name: "Cucumber", nameMl: "വെള്ളരിക്ക", category: "Vegetables", unit: "kg", normalPrice: 40, offerPrice: 28 },
  { emoji: "🍌", name: "Nendran Banana", nameMl: "നേന്ത്രപ്പഴം", category: "Fruits", unit: "kg", normalPrice: 70, offerPrice: 55 },
  { emoji: "🍎", name: "Apple", nameMl: "ആപ്പിൾ", category: "Fruits", unit: "kg", normalPrice: 220, offerPrice: 179 },
  { emoji: "🥭", name: "Mango", nameMl: "മാമ്പഴം", category: "Fruits", unit: "kg", normalPrice: 120, offerPrice: 89 },
  { emoji: "🍇", name: "Grapes", nameMl: "മുന്തിരി", category: "Fruits", unit: "kg", normalPrice: 140, offerPrice: 99 },
  { emoji: "🍉", name: "Watermelon", nameMl: "തണ്ണിമത്തൻ", category: "Fruits", unit: "kg", normalPrice: 30, offerPrice: 22 },
  { emoji: "🍍", name: "Pineapple", nameMl: "കൈതച്ചക്ക", category: "Fruits", unit: "pcs", normalPrice: 60, offerPrice: 45 },
  { emoji: "🥥", name: "Coconut", nameMl: "തേങ്ങ", category: "Grocery", unit: "pcs", normalPrice: 40, offerPrice: 32 },
  { emoji: "🍚", name: "Matta Rice", nameMl: "മട്ട അരി", category: "Grocery", unit: "5 kg", normalPrice: 320, offerPrice: 285 },
  { emoji: "🥛", name: "Milk", nameMl: "പാൽ", category: "Dairy", unit: "ltr", normalPrice: 56, offerPrice: 52 },
  { emoji: "🥚", name: "Eggs", nameMl: "മുട്ട", category: "Dairy", unit: "12 pcs", normalPrice: 84, offerPrice: 72 },
  { emoji: "🍞", name: "Bread", nameMl: "ബ്രെഡ്", category: "Bakery", unit: "pack", normalPrice: 45, offerPrice: 38 },
  { emoji: "🍗", name: "Chicken", nameMl: "ചിക്കൻ", category: "Meat & Fish", unit: "kg", normalPrice: 220, offerPrice: 189 },
  { emoji: "🐟", name: "Sardine", nameMl: "മത്തി", category: "Meat & Fish", unit: "kg", normalPrice: 180, offerPrice: 140 },
];
