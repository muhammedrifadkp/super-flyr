import {
  Anek_Malayalam,
  Anton,
  Baloo_Chettan_2,
  Barlow_Condensed,
  Bebas_Neue,
  Bree_Serif,
  Inter,
  Lilita_One,
  Lobster,
  Luckiest_Guy,
  Manjari,
  Montserrat,
  Noto_Sans_Malayalam,
  Oswald,
  Poppins,
} from "next/font/google";

// UI font
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Poster fonts. Exposed as CSS variables so the canvas renderer can read the real family names.
const anton = Anton({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--pf-anton", display: "swap", preload: false });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--pf-bebas", display: "swap", preload: false });
const oswald = Oswald({ subsets: ["latin", "latin-ext"], variable: "--pf-oswald", display: "swap", preload: false });
const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "latin-ext", "devanagari"],
  variable: "--pf-poppins",
  display: "swap",
  preload: false,
});
const montserrat = Montserrat({ subsets: ["latin", "latin-ext"], variable: "--pf-montserrat", display: "swap", preload: false });
const luckiest = Luckiest_Guy({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--pf-luckiest", display: "swap", preload: false });
const lilita = Lilita_One({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--pf-lilita", display: "swap", preload: false });
const lobster = Lobster({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--pf-lobster", display: "swap", preload: false });
const bree = Bree_Serif({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--pf-bree", display: "swap", preload: false });
const barlow = Barlow_Condensed({
  weight: ["500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  variable: "--pf-barlow",
  display: "swap",
  preload: false,
});
const baloo = Baloo_Chettan_2({ subsets: ["latin", "malayalam"], variable: "--pf-baloo", display: "swap", preload: false });
const anek = Anek_Malayalam({ subsets: ["latin", "malayalam"], variable: "--pf-anek", display: "swap", preload: false });
export const notoMl = Noto_Sans_Malayalam({
  subsets: ["latin", "malayalam"],
  variable: "--pf-notoMl",
  display: "swap",
  preload: false,
});
const manjari = Manjari({ weight: ["400", "700"], subsets: ["latin", "malayalam"], variable: "--pf-manjari", display: "swap", preload: false });

export const fontVariables = [
  inter.variable,
  anton.variable,
  bebas.variable,
  oswald.variable,
  poppins.variable,
  montserrat.variable,
  luckiest.variable,
  lilita.variable,
  lobster.variable,
  bree.variable,
  barlow.variable,
  baloo.variable,
  anek.variable,
  notoMl.variable,
  manjari.variable,
].join(" ");
