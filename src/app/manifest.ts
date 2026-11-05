import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getRepo } from "@/lib/db";

/** Per-deployment app name and colours come from the store branding. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  await connection();
  const store = await getRepo().getStore();
  return {
    name: `${store.name} – Offer Posters`,
    short_name: store.name.length > 14 ? "Offer Posters" : store.name,
    description: "Create and share supermarket offer posters.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f7f9",
    theme_color: store.colors.primary,
    categories: ["business", "productivity"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New poster", url: "/dashboard/posters/new" },
      { name: "Products", url: "/dashboard/products" },
    ],
  };
}
