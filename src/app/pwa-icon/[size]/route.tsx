import { ImageResponse } from "next/og";
import { getRepo } from "@/lib/db";
import { readableOn } from "@/lib/poster/templates";

const SIZES = new Set([180, 192, 512]);

/** App icon in the store's brand colour: store initial + a small "%" offer tag. */
export async function GET(request: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size: raw } = await ctx.params;
  const size = Number(raw);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  const maskable = new URL(request.url).searchParams.has("maskable");

  const store = await getRepo().getStore();
  const bg = store.colors.primary;
  const fg = readableOn(bg);
  const initial = /^[A-Za-z0-9]/.test(store.name) ? store.name[0].toUpperCase() : "%";
  const inset = maskable ? size * 0.12 : 0;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: maskable ? bg : "transparent" }}>
        <div
          style={{
            margin: inset,
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: bg,
            borderRadius: maskable ? 0 : size * 0.22,
            color: fg,
            fontSize: size * (maskable ? 0.42 : 0.56),
            fontWeight: 900,
            position: "relative",
          }}
        >
          {initial}
          <div
            style={{
              position: "absolute",
              right: size * 0.1,
              bottom: size * 0.1,
              width: size * 0.26,
              height: size * 0.26,
              borderRadius: size,
              background: store.colors.accent,
              color: readableOn(store.colors.accent),
              fontSize: size * 0.15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            %
          </div>
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
