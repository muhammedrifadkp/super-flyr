// Pre-loaded Kerala Supermarket Master Catalogue & English/Manglish-to-Malayalam Grocery Dictionary.

export interface MasterCatalogueItem {
  id: string;
  emoji: string;
  name: string;
  nameMl: string;
  manglish: string[];
  category: string;
  unit: string;
  normalPrice: number;
  offerPrice: number;
  /** High-resolution studio product cutout URL. */
  imageUrl?: string;
  /** Optional pack style colour when generating studio product graphics. */
  accent?: string;
}

export const KERALA_MASTER_CATALOGUE: MasterCatalogueItem[] = [
  // Vegetables (പച്ചക്കറികൾ)
  { id: "veg-tomato", emoji: "🍅", name: "Tomato", nameMl: "തക്കാളി", manglish: ["thakkali", "takkali"], category: "Vegetables", unit: "kg", normalPrice: 40, offerPrice: 28, imageUrl: "/poster-assets/products/tomato.png", accent: "#ef4444" },
  { id: "veg-onion", emoji: "🧅", name: "Big Onion", nameMl: "സവാള", manglish: ["savala", "sawala", "ulli"], category: "Vegetables", unit: "kg", normalPrice: 52, offerPrice: 39, imageUrl: "/poster-assets/products/onion.png", accent: "#a855f7" },
  { id: "veg-shallot", emoji: "🧅", name: "Small Onion (Shallots)", nameMl: "ചെറിയ ഉള്ളി", manglish: ["cheriya ulli", "kunjulli", "ulli"], category: "Vegetables", unit: "kg", normalPrice: 80, offerPrice: 64, imageUrl: "/poster-assets/products/shallots.png", accent: "#9333ea" },
  { id: "veg-potato", emoji: "🥔", name: "Potato", nameMl: "ഉരുളക്കിഴങ്ങ്", manglish: ["urulakizhangu", "urula"], category: "Vegetables", unit: "kg", normalPrice: 46, offerPrice: 35, imageUrl: "/poster-assets/products/potato.png", accent: "#d97706" },
  { id: "veg-carrot", emoji: "🥕", name: "Ooty Carrot", nameMl: "കാരറ്റ്", manglish: ["karat", "carrot"], category: "Vegetables", unit: "kg", normalPrice: 65, offerPrice: 48, imageUrl: "/poster-assets/products/carrot.png", accent: "#f97316" },
  { id: "veg-chilli", emoji: "🌶️", name: "Bell Pepper / Capsicum", nameMl: "കാപ്സിക്കം", manglish: ["capsicum", "pachamulaku", "mulaku"], category: "Vegetables", unit: "kg", normalPrice: 68, offerPrice: 49, imageUrl: "/poster-assets/products/capsicum.png", accent: "#16a34a" },
  { id: "veg-cucumber", emoji: "🥒", name: "Cucumber", nameMl: "വെള്ളരിക്ക", manglish: ["vellarikka", "vellari"], category: "Vegetables", unit: "kg", normalPrice: 38, offerPrice: 26, imageUrl: "/poster-assets/products/cucumber.png", accent: "#22c55e" },
  { id: "veg-brinjal", emoji: "🍆", name: "Brinjal", nameMl: "വഴുതനങ്ങ", manglish: ["vazhuthananga", "brinjal"], category: "Vegetables", unit: "kg", normalPrice: 48, offerPrice: 35, imageUrl: "/poster-assets/products/eggplant.png", accent: "#7e22ce" },
  { id: "veg-cabbage", emoji: "🥬", name: "Cabbage", nameMl: "കാബേജ്", manglish: ["cabbage", "muttakose"], category: "Vegetables", unit: "kg", normalPrice: 42, offerPrice: 29, imageUrl: "/poster-assets/products/cabbage.png", accent: "#15803d" },
  { id: "veg-garlic", emoji: "🧄", name: "Ash Gourd (Kumbalanga)", nameMl: "കുമ്പളങ്ങ", manglish: ["kumbalanga", "ash gourd"], category: "Vegetables", unit: "kg", normalPrice: 36, offerPrice: 25, imageUrl: "/poster-assets/products/ash-gourd.png", accent: "#ca8a04" },
  { id: "veg-ginger", emoji: "🫚", name: "Bottle Gourd (Churakka)", nameMl: "ചുരയ്ക്ക", manglish: ["churakka", "bottle gourd"], category: "Vegetables", unit: "kg", normalPrice: 38, offerPrice: 27, imageUrl: "/poster-assets/products/bottle-gourd.png", accent: "#b45309" },
  { id: "veg-tapioca", emoji: "🍠", name: "Fresh Beetroot", nameMl: "ബീറ്റ്റൂട്ട്", manglish: ["beetroot"], category: "Vegetables", unit: "kg", normalPrice: 45, offerPrice: 32, imageUrl: "/poster-assets/products/beetroot.png", accent: "#92400e" },

  // Fruits (പഴങ്ങൾ)
  { id: "fr-nendran", emoji: "🍌", name: "Nendran Banana", nameMl: "നേന്ത്രപ്പഴം", manglish: ["nendrapazham", "ethapazham", "pazham"], category: "Fruits", unit: "kg", normalPrice: 72, offerPrice: 56, imageUrl: "/poster-assets/products/banana.png", accent: "#eab308" },
  { id: "fr-apple", emoji: "🍎", name: "Kashmir Apple", nameMl: "ആപ്പിൾ", manglish: ["apple"], category: "Fruits", unit: "kg", normalPrice: 220, offerPrice: 175, imageUrl: "/poster-assets/products/apple.png", accent: "#dc2626" },
  { id: "fr-mango", emoji: "🥭", name: "Ripe Papaya", nameMl: "പപ്പായ", manglish: ["papaya", "kappalanga"], category: "Fruits", unit: "kg", normalPrice: 48, offerPrice: 35, imageUrl: "/poster-assets/products/papaya.png", accent: "#f59e0b" },
  { id: "fr-grapes", emoji: "🍇", name: "Seedless Grapes", nameMl: "മുന്തിരി", manglish: ["munthiri", "grapes"], category: "Fruits", unit: "kg", normalPrice: 140, offerPrice: 99, imageUrl: "/poster-assets/products/grapes.png", accent: "#7c3aed" },
  { id: "fr-watermelon", emoji: "🍉", name: "Ruby Pomegranate", nameMl: "മാതളനാരങ്ങ", manglish: ["mathalanaranga", "pomegranate", "anar"], category: "Fruits", unit: "kg", normalPrice: 190, offerPrice: 149, imageUrl: "/poster-assets/products/pomegranate.png", accent: "#16a34a" },
  { id: "fr-pineapple", emoji: "🍍", name: "Vazhakulam Pineapple", nameMl: "കൈതച്ചക്ക", manglish: ["kaithachakka", "annachi"], category: "Fruits", unit: "kg", normalPrice: 65, offerPrice: 48, imageUrl: "/poster-assets/products/pineapple.png", accent: "#ca8a04" },
  { id: "fr-orange", emoji: "🍊", name: "Sweet Orange", nameMl: "ഓറഞ്ച്", manglish: ["orange", "mathura naranga"], category: "Fruits", unit: "kg", normalPrice: 110, offerPrice: 85, imageUrl: "/poster-assets/products/orange.png", accent: "#ea580c" },
  { id: "fr-dates", emoji: "🍋", name: "Sweet Lime (Musambi)", nameMl: "മുസമ്പി", manglish: ["musambi", "sweet lime"], category: "Fruits", unit: "kg", normalPrice: 95, offerPrice: 74, imageUrl: "/poster-assets/products/musambi.png", accent: "#78350f" },

  // Grocery & Staples (പലചരക്ക്)
  { id: "gr-matta", emoji: "🍚", name: "Palakkadan Matta Rice", nameMl: "പാലക്കാടൻ മട്ട അരി", manglish: ["matta ari", "choru ari", "rice"], category: "Grocery", unit: "5 kg", normalPrice: 325, offerPrice: 279, imageUrl: "/poster-assets/products/rice-bag.png", accent: "#b91c1c" },
  { id: "gr-biriyani", emoji: "🍚", name: "Kaima Biriyani Rice", nameMl: "കൈമ ബിരിയാണി അരി", manglish: ["kaima", "jeerakasala", "biriyani ari"], category: "Grocery", unit: "5 kg", normalPrice: 650, offerPrice: 549, imageUrl: "/poster-assets/products/rice-bag.png", accent: "#15803d" },
  { id: "gr-coco-oil", emoji: "🥥", name: "Pure Coconut Oil", nameMl: "ശുദ്ധമായ വെളിച്ചെണ്ണ", manglish: ["velichenna", "coconut oil", "enna"], category: "Grocery", unit: "ltr", normalPrice: 215, offerPrice: 185, imageUrl: "/poster-assets/products/cooking-oil.png", accent: "#0284c7" },
  { id: "gr-sun-oil", emoji: "🌻", name: "Sunflower Oil", nameMl: "സൺഫ്ലവർ ഓയിൽ", manglish: ["sunflower oil", "oil"], category: "Grocery", unit: "ltr", normalPrice: 155, offerPrice: 129, imageUrl: "/poster-assets/products/cooking-oil.png", accent: "#eab308" },
  { id: "gr-sugar", emoji: "🍬", name: "White Sugar", nameMl: "പഞ്ചസാര", manglish: ["panchasara", "sugar"], category: "Grocery", unit: "kg", normalPrice: 48, offerPrice: 42, imageUrl: "/poster-assets/products/sugar.png", accent: "#2563eb" },
  { id: "gr-coconut", emoji: "🍯", name: "Marayoor Jaggery", nameMl: "മറയൂർ ശർക്കര", manglish: ["sharkara", "jaggery"], category: "Grocery", unit: "kg", normalPrice: 82, offerPrice: 65, imageUrl: "/poster-assets/products/jaggery.png", accent: "#854d0e" },
  { id: "gr-puttu", emoji: "🌾", name: "Roasted Puttu Podi", nameMl: "വറുത്ത പുട്ടുപൊടി", manglish: ["puttupodi", "puttu podi"], category: "Grocery", unit: "kg", normalPrice: 78, offerPrice: 62, imageUrl: "/poster-assets/products/rice-bag.png", accent: "#dc2626" },
  { id: "gr-atta", emoji: "🌾", name: "Chakki Fresh Atta", nameMl: "ഗോതമ്പ് പൊടി (ആട്ട)", manglish: ["gothambu podi", "atta"], category: "Grocery", unit: "5 kg", normalPrice: 295, offerPrice: 245, imageUrl: "/poster-assets/products/rice-bag.png", accent: "#d97706" },
  { id: "gr-uzhunnu", emoji: "🫘", name: "Urad Dal (Uzhunnu)", nameMl: "ഉഴുന്ന് പരിപ്പ്", manglish: ["uzhunnu", "urad dal"], category: "Grocery", unit: "kg", normalPrice: 160, offerPrice: 135, imageUrl: "/poster-assets/products/sugar.png", accent: "#4f46e5" },
  { id: "gr-kadala", emoji: "🫘", name: "Black Chickpeas (Kadala)", nameMl: "കടല", manglish: ["kadala", "chana"], category: "Grocery", unit: "kg", normalPrice: 115, offerPrice: 94, imageUrl: "/poster-assets/products/jaggery.png", accent: "#92400e" },
  { id: "gr-cherupayar", emoji: "🫛", name: "Brahmins Sambar Powder", nameMl: "സാമ്പാർ പൊടി", manglish: ["sambar podi", "masala"], category: "Grocery", unit: "250 g", normalPrice: 95, offerPrice: 76, imageUrl: "/poster-assets/products/sambar-powder.png", accent: "#16a34a" },
  { id: "gr-chilli-powder", emoji: "🌶️", name: "Kashmiri Chilli Powder", nameMl: "കാശ്മീരി മുളകുപൊടി", manglish: ["mulakupodi", "chilli powder"], category: "Grocery", unit: "500 g", normalPrice: 210, offerPrice: 165, imageUrl: "/poster-assets/products/sambar-powder.png", accent: "#b91c1c" },

  // Dairy & Eggs (പാലുൽപ്പന്നങ്ങൾ)
  { id: "da-milk", emoji: "🥛", name: "Nestle Milkmaid", nameMl: "മിൽക്ക്മെയ്ഡ്", manglish: ["milkmaid", "paal", "milk"], category: "Dairy", unit: "400 g", normalPrice: 152, offerPrice: 135, imageUrl: "/poster-assets/products/milkmaid.png", accent: "#0284c7" },
  { id: "da-ghee", emoji: "🍯", name: "Milma Pure Cow Ghee", nameMl: "മിൽമ നെയ്യ്", manglish: ["neyyu", "ghee", "milma ghee"], category: "Dairy", unit: "500 ml", normalPrice: 380, offerPrice: 335, imageUrl: "/poster-assets/products/ghee.png", accent: "#d97706" },
  { id: "da-curd", emoji: "🥣", name: "Thick Curd (Thairu)", nameMl: "കട്ടി തൈര്", manglish: ["thairu", "curd", "moru"], category: "Dairy", unit: "500 g", normalPrice: 45, offerPrice: 38, imageUrl: "/poster-assets/products/milkmaid.png", accent: "#0ea5e9" },
  { id: "da-eggs", emoji: "🥚", name: "Farm Fresh Eggs", nameMl: "കോഴിമുട്ട", manglish: ["mutta", "kozhi mutta", "egg"], category: "Dairy", unit: "12 pcs", normalPrice: 84, offerPrice: 69, imageUrl: "/poster-assets/products/ghee.png", accent: "#f59e0b" },

  // Meat & Fish (മത്സ്യം & മാംസം)
  { id: "mf-sardine", emoji: "🐟", name: "Fresh Sardine (Mathi)", nameMl: "നാടൻ മത്തി / ചാള", manglish: ["mathi", "chala", "sardine"], category: "Meat & Fish", unit: "kg", normalPrice: 180, offerPrice: 139, imageUrl: "/poster-assets/products/chicken.png", accent: "#0369a1" },
  { id: "mf-mackerel", emoji: "🐟", name: "Fresh Mackerel (Ayala)", nameMl: "അയല", manglish: ["ayala", "mackerel"], category: "Meat & Fish", unit: "kg", normalPrice: 240, offerPrice: 189, imageUrl: "/poster-assets/products/chicken.png", accent: "#0284c7" },
  { id: "mf-prawns", emoji: "🦐", name: "Cleaned Prawns", nameMl: "ചെമ്മീൻ / കൊഞ്ച്", manglish: ["chemmeen", "konju", "prawns"], category: "Meat & Fish", unit: "500 g", normalPrice: 260, offerPrice: 210, imageUrl: "/poster-assets/products/chicken.png", accent: "#e11d48" },
  { id: "mf-seer", emoji: "🐟", name: "King Fish (Neymeen)", nameMl: "നെയ്മീൻ / അയക്കൂറ", manglish: ["neymeen", "ayakura", "king fish"], category: "Meat & Fish", unit: "kg", normalPrice: 780, offerPrice: 649, imageUrl: "/poster-assets/products/chicken.png", accent: "#1d4ed8" },
  { id: "mf-chicken", emoji: "🍗", name: "Broiler Chicken (Fresh)", nameMl: "ചിക്കൻ (ഫ്രഷ്)", manglish: ["chicken", "kozhi irachi"], category: "Meat & Fish", unit: "kg", normalPrice: 220, offerPrice: 179, imageUrl: "/poster-assets/products/chicken.png", accent: "#dc2626" },
  { id: "mf-beef", emoji: "🥩", name: "Fresh Tender Meat", nameMl: "ഫ്രഷ് മാംസം", manglish: ["beef", "pothirachi", "irachi"], category: "Meat & Fish", unit: "kg", normalPrice: 420, offerPrice: 379, imageUrl: "/poster-assets/products/chicken.png", accent: "#991b1b" },

  // Bakery, Beverages & Snacks
  { id: "bk-bread", emoji: "🍞", name: "Milk Bread", nameMl: "മിൽക്ക് ബ്രെഡ്", manglish: ["bread", "റൊട്ടി"], category: "Bakery", unit: "pack", normalPrice: 48, offerPrice: 38, imageUrl: "/poster-assets/products/milkmaid.png", accent: "#d97706" },
  { id: "bv-tea", emoji: "☕", name: "Wayanad Assam Tea Dust", nameMl: "ചായപ്പൊടി", manglish: ["chayapodi", "tea", "kattan"], category: "Beverages", unit: "500 g", normalPrice: 175, offerPrice: 139, imageUrl: "/poster-assets/products/tea.png", accent: "#78350f" },
  { id: "bv-coffee", emoji: "☕", name: "Filter Coffee Powder", nameMl: "കാപ്പിപ്പൊടി", manglish: ["kappipodi", "coffee"], category: "Beverages", unit: "250 g", normalPrice: 145, offerPrice: 118, imageUrl: "/poster-assets/products/tea.png", accent: "#451a03" },
  { id: "sn-chips", emoji: "🍌", name: "Nadan Banana Chips", nameMl: "നാടൻ കായ വറുത്തത്", manglish: ["kaya varuthathu", "banana chips", "upperi"], category: "Snacks", unit: "250 g", normalPrice: 120, offerPrice: 95, imageUrl: "/poster-assets/products/banana.png", accent: "#eab308" },

  // Household & Personal Care
  { id: "hh-detergent", emoji: "🫧", name: "Matic Detergent Powder", nameMl: "വാഷിംഗ് പൗഡർ", manglish: ["washing powder", "soap podi", "surf"], category: "Household", unit: "2 kg", normalPrice: 290, offerPrice: 229, imageUrl: "/poster-assets/products/detergent.png", accent: "#2563eb" },
  { id: "hh-dishwash", emoji: "🍋", name: "Lemon Dishwash Liquid", nameMl: "ഡിഷ്‌വാഷ് ലിക്വിഡ്", manglish: ["vim", "dishwash"], category: "Household", unit: "750 ml", normalPrice: 165, offerPrice: 129, imageUrl: "/poster-assets/products/dishwash.png", accent: "#16a34a" },
];

/** Extra English/Manglish -> Malayalam dictionary for instant typing suggestions. */
const EXTRA_DICTIONARY: Record<string, string> = {
  rice: "അരി",
  "matta rice": "മട്ട അരി",
  "raw rice": "പച്ചരി",
  pachari: "പച്ചരി",
  wheat: "ഗോതമ്പ്",
  rava: "റവ",
  semolina: "റവ",
  maida: "മൈദ",
  ragi: "റാഗി / മുത്താറി",
  oats: "ഓട്സ്",
  vermicelli: "സേമിയ",
  semiya: "സേമിയ",
  salt: "ഉപ്പ്",
  uppu: "ഉപ്പ്",
  jaggery: "ശർക്കര",
  sharkara: "ശർക്കര",
  turmeric: "മഞ്ഞൾപ്പൊടി",
  "turmeric powder": "മഞ്ഞൾപ്പൊടി",
  manjalpodi: "മഞ്ഞൾപ്പൊടി",
  coriander: "മല്ലിയില",
  "coriander powder": "മല്ലിപ്പൊടി",
  mallipodi: "മല്ലിപ്പൊടി",
  "black pepper": "കുരുമുളക്",
  kurumulaku: "കുരുമുളക്",
  cardamom: "ഏലയ്ക്ക",
  elakka: "ഏലയ്ക്ക",
  cumin: "ജീരകം",
  jeerakam: "ജീരകം",
  mustard: "കടുക്",
  kaduku: "കടുക്",
  fenugreek: "ഉലുവ",
  uluva: "ഉലുവ",
  tamarind: "വാളൻപുളി",
  puli: "പുളി",
  "curry leaves": "കറിവേപ്പില",
  kariveppila: "കറിവേപ്പില",
  beetroot: "ബീറ്റ്റൂട്ട്",
  beans: "ബീൻസ്",
  "ladies finger": "വെണ്ടയ്ക്ക",
  vendakka: "വെണ്ടയ്ക്ക",
  okra: "വെണ്ടയ്ക്ക",
  bittergourd: "പാവയ്ക്ക",
  "bitter gourd": "പാവയ്ക്ക",
  pavakka: "പാവയ്ക്ക",
  snakegourd: "പടവലങ്ങ",
  padavalanga: "പടവലങ്ങ",
  ashgourd: "കുമ്പളങ്ങ",
  kumbalanga: "കുമ്പളങ്ങ",
  pumpkin: "മത്തങ്ങ",
  mathanga: "മത്തങ്ങ",
  drumstick: "മുരിങ്ങയ്ക്ക",
  muringakka: "മുരിങ്ങയ്ക്ക",
  cauliflower: "കോളിഫ്ലവർ",
  lemon: "ചെറുനാരങ്ങ",
  naranga: "ചെറുനാരങ്ങ",
  papaya: "പപ്പായ",
  pomegranate: "മാതളനാരങ്ങ",
  anar: "മാതളനാരങ്ങ",
  guava: "പേരയ്ക്ക",
  perakka: "പേരയ്ക്ക",
  butter: "വെണ്ണ",
  paneer: "പനീർ",
  cheese: "ചീസ്",
  icecream: "ഐസ്ക്രീം",
  "ice cream": "ഐസ്ക്രീം",
  biscuit: "ബിസ്കറ്റ്",
  soap: "സോപ്പ്",
  shampoo: "ഷാംപൂ",
  toothpaste: "ടൂത്ത് പേസ്റ്റ്",
  honey: "തേൻ",
  cashew: "കശുവണ്ടി",
  badam: "ബദാം",
  almond: "ബദാം",
  mutton: "മട്ടൻ / ആട്ടിറച്ചി",
  duck: "താറാവ്",
  tuna: "ചൂര",
  choora: "ചൂര",
  pomfret: "ആവോലി",
  avoli: "ആവോലി",
  karimeen: "കരിമീൻ",
  "pearl spot": "കരിമീൻ",
};

/** Looks up the Malayalam name for an English or Manglish product name from our offline dictionary. */
export function lookupMalayalamName(input: string): string | null {
  const q = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return null;

  // 1. Exact match in EXTRA_DICTIONARY
  if (EXTRA_DICTIONARY[q]) return EXTRA_DICTIONARY[q];

  // 2. Exact match in KERALA_MASTER_CATALOGUE
  for (const item of KERALA_MASTER_CATALOGUE) {
    if (item.name.toLowerCase() === q || item.manglish.includes(q)) {
      return item.nameMl;
    }
  }

  // 3. Partial / token match
  for (const item of KERALA_MASTER_CATALOGUE) {
    const itemLower = item.name.toLowerCase();
    if (itemLower.includes(q) || q.includes(itemLower) || item.manglish.some((m) => q.includes(m))) {
      return item.nameMl;
    }
  }

  for (const [key, ml] of Object.entries(EXTRA_DICTIONARY)) {
    if (q.includes(key)) return ml;
  }

  return null;
}

const LEGACY_STUDIO_MAP: Array<[string[], string]> = [
  [["tomato", "thakkali", "തക്കാളി"], "/poster-assets/products/tomato.png"],
  [["small onion", "shallot", "cheriya ulli", "kunjulli", "ചെറിയ ഉള്ളി", "garlic", "വെളുത്തുള്ളി"], "/poster-assets/products/shallots.png"],
  [["big onion", "onion", "savala", "സവാള"], "/poster-assets/products/onion.png"],
  [["potato", "urulakizhangu", "ഉരുളക്കിഴങ്ങ്", "ginger", "ഇഞ്ചി"], "/poster-assets/products/potato.png"],
  [["carrot", "ooty carrot", "കാരറ്റ്"], "/poster-assets/products/carrot.png"],
  [["capsicum", "bell pepper", "chilli", "green chilli", "കാപ്സിക്കം", "പച്ചമുളക്"], "/poster-assets/products/capsicum.png"],
  [["cucumber", "vellarikka", "വെള്ളരിക്ക"], "/poster-assets/products/cucumber.png"],
  [["brinjal", "eggplant", "vazhuthananga", "വഴുതനങ്ങ"], "/poster-assets/products/eggplant.png"],
  [["cabbage", "muttakose", "കാബേജ്"], "/poster-assets/products/cabbage.png"],
  [["ash gourd", "kumbalanga", "കുമ്പളങ്ങ", "coconut", "തേങ്ങ"], "/poster-assets/products/ash-gourd.png"],
  [["bottle gourd", "churakka", "ചുരയ്ക്ക"], "/poster-assets/products/bottle-gourd.png"],
  [["beetroot", "ബീറ്റ്റൂട്ട്", "tapioca", "kappa", "കപ്പ"], "/poster-assets/products/beetroot.png"],
  [["banana", "nendran", "നേന്ത്രപ്പഴം", "kaya varuthathu", "chips"], "/poster-assets/products/banana.png"],
  [["apple", "ആപ്പിൾ"], "/poster-assets/products/apple.png"],
  [["papaya", "പപ്പായ", "mango", "മാമ്പഴം"], "/poster-assets/products/papaya.png"],
  [["grape", "munthiri", "മുന്തിരി"], "/poster-assets/products/grapes.png"],
  [["pomegranate", "anar", "മാതളനാരങ്ങ", "watermelon", "തണ്ണിമത്തൻ"], "/poster-assets/products/pomegranate.png"],
  [["pineapple", "kaithachakka", "കൈതച്ചക്ക"], "/poster-assets/products/pineapple.png"],
  [["orange", "ഓറഞ്ച്"], "/poster-assets/products/orange.png"],
  [["musambi", "sweet lime", "മുസമ്പി", "lemon", "നാരങ്ങ"], "/poster-assets/products/musambi.png"],
  [["matta", "biriyani", "rice", "puttu", "atta", "അരി", "പുട്ടുപൊടി", "ആട്ട"], "/poster-assets/products/rice-bag.png"],
  [["coconut oil", "sunflower oil", "cooking oil", "velichenna", "വെളിച്ചെണ്ണ", "ഓയിൽ"], "/poster-assets/products/cooking-oil.png"],
  [["sugar", "panchasara", "പഞ്ചസാര", "uzhunnu", "urad dal", "ഉഴുന്ന്"], "/poster-assets/products/sugar.png"],
  [["jaggery", "sharkara", "ശർക്കര", "kadala", "കടല", "dates", "ഈത്തപ്പഴം"], "/poster-assets/products/jaggery.png"],
  [["sambar", "chilli powder", "masala", "സാമ്പാർ", "മുളകുപൊടി", "cherupayar", "ചെറുപയർ"], "/poster-assets/products/sambar-powder.png"],
  [["milkmaid", "milk", "curd", "thairu", "bread", "മിൽക്ക്", "പാൽ", "തൈര്", "ബ്രെഡ്"], "/poster-assets/products/milkmaid.png"],
  [["ghee", "neyyu", "നെയ്യ്", "egg", "കോഴിമുട്ട"], "/poster-assets/products/ghee.png"],
  [["chicken", "sardine", "mathi", "mackerel", "ayala", "prawn", "chemmeen", "seer", "neymeen", "beef", "meat", "ചിക്കൻ", "മത്തി", "അയല", "ചെമ്മീൻ", "നെയ്മീൻ", "പോത്തിറച്ചി", "മാംസം"], "/poster-assets/products/chicken.png"],
  [["tea", "coffee", "chayapodi", "ചായപ്പൊടി", "കാപ്പിപ്പൊടി"], "/poster-assets/products/tea.png"],
  [["detergent", "washing powder", "surf", "വാഷിംഗ് പൗഡർ"], "/poster-assets/products/detergent.png"],
  [["dishwash", "vim", "ഡിഷ്‌വാഷ്"], "/poster-assets/products/dishwash.png"],
];

/** Matches a product name or Malayalam name to its studio cutout asset in /poster-assets/products/. */
export function matchStudioProductUrl(name: string, nameMl?: string): string | null {
  const q = `${name ?? ""} ${nameMl ?? ""}`.trim().toLowerCase();
  if (!q) return null;

  for (const item of KERALA_MASTER_CATALOGUE) {
    if (!item.imageUrl) continue;
    if (
      item.name.toLowerCase() === name.trim().toLowerCase() ||
      (nameMl && item.nameMl === nameMl.trim())
    ) {
      return item.imageUrl;
    }
  }

  for (const [keywords, url] of LEGACY_STUDIO_MAP) {
    if (keywords.some((kw) => q.includes(kw))) {
      return url;
    }
  }

  return null;
}

/**
 * Resolves the best product image URL, upgrading legacy generated emoji blobs to real studio cutouts
 * while preserving user-uploaded custom product photos.
 */
export function resolveProductImageUrl(product: { name: string; nameMl?: string; imageUrl?: string }): string {
  const raw = product.imageUrl?.trim() ?? "";
  if (raw.startsWith("/poster-assets/") || raw.includes("custom-")) {
    return raw;
  }
  return matchStudioProductUrl(product.name, product.nameMl) ?? raw;
}


/**
 * Translates or transliterates an English/Manglish string into Malayalam.
 * First checks our instant offline Kerala grocery dictionary, then falls back to Google Input Tools (transliteration)
 * so any custom brand or word converts smoothly.
 */
export async function translateToMalayalam(input: string): Promise<string | null> {
  const local = lookupMalayalamName(input);
  if (local) return local;

  const text = input.trim();
  if (!text) return null;
  try {
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=ml-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as [string, Array<[string, string[]]>];
    if (data[0] === "SUCCESS" && data[1]?.[0]?.[1]?.[0]) {
      return data[1][0][1][0];
    }
  } catch {
    // Offline or blocked; return null gracefully
  }
  return null;
}


