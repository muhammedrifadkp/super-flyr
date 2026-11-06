import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { getRepo } from "@/lib/db";
import { discountPercent, formatValidity, isExpired, resolveItems } from "@/lib/format";
import { readableOn } from "@/lib/poster/templates";

export const alt = "Store offers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link preview for WhatsApp / Facebook. Latin text only (the OG renderer has no Malayalam font). */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const repo = getRepo();
  const poster = await repo.getPosterBySlug(slug);
  const store = await repo.getStore();
  const ended = poster ? isExpired(poster.content.validTo) : false;
  const products = poster?.published && !ended ? await repo.listProducts() : [];
  const items = poster && !ended ? resolveItems(poster.items, products) : [];
  const best = Math.max(0, ...items.map((i) => discountPercent(i.normalPrice, i.offerPrice)));
  const bg = poster?.style.headerBg ?? store.colors.primary;
  const fg = readableOn(bg);
  const accent = poster?.style.badgeBg ?? store.colors.accent;
  const validity = poster ? formatValidity(poster.content.validFrom, poster.content.validTo) : "";
  const latin = (text: string) => text.replace(/[^\u0000-ɏ₹•–\s]/g, "").trim();

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: bg, color: fg, padding: 64 }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, opacity: 0.9 }}>{latin(store.name) || "Our store"}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 900, lineHeight: 1.05, textTransform: "uppercase" }}>
            {ended ? "OFFER EXPIRED" : latin(poster?.content.headline || poster?.title || "Today's offers") || "Today's offers"}
          </div>
          {validity ? <div style={{ display: "flex", fontSize: 36, marginTop: 16, opacity: 0.9 }}>{validity}</div> : null}
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {ended ? (
            <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>This promotion has ended</div>
          ) : (
            <>
              {best > 0 ? (
                <div style={{ display: "flex", background: accent, color: readableOn(accent), borderRadius: 999, padding: "14px 32px", fontSize: 44, fontWeight: 900 }}>
                  UP TO {best}% OFF
                </div>
              ) : null}
              <div style={{ display: "flex", fontSize: 36, fontWeight: 600 }}>{items.length} products on offer</div>
            </>
          )}
        </div>
      </div>
    ),
    size,
  );
}
