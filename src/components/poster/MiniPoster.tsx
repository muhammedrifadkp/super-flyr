import { FORMATS, isTransparent, normalizeStyle, pageColor } from "@/lib/poster/templates";
import type { Poster } from "@/lib/types";

/** Lightweight CSS thumbnail for lists (no canvas). */
export function MiniPoster({ poster }: { poster: Pick<Poster, "style" | "content" | "layout" | "items"> }) {
  const { content, layout } = poster;
  const style = normalizeStyle(poster.style);
  const format = FORMATS[layout.format];
  const banner = style.headerStyle !== "plain" && !isTransparent(style.headerBg) && style.headerBg.toLowerCase() !== style.bgTop.toLowerCase();
  const cards = Math.min(6, Math.max(3, poster.items.length));
  return (
    <div
      className="relative mx-auto flex h-full flex-col overflow-hidden"
      style={{ aspectRatio: `${format.width} / ${format.height}`, background: `linear-gradient(${style.bgTop}, ${style.bgBottom})` }}
      aria-hidden="true"
    >
      <div className="px-2 pb-2 pt-2 text-center" style={{ background: banner ? style.headerBg : "transparent" }}>
        <p className="truncate text-[11px] font-black uppercase leading-tight" style={{ color: banner ? style.headlineColor : pageColor(style) }}>
          {content.headline || content.headlineMl || "Offers"}
        </p>
        {content.headlineMl ? (
          <p className="truncate font-ml text-[9px] font-bold leading-tight" style={{ color: banner ? style.headerText : pageColor(style) }}>
            {content.headlineMl}
          </p>
        ) : null}
      </div>
      <div className="grid flex-1 grid-cols-3 content-center gap-1 p-1.5">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="flex aspect-[4/5] flex-col justify-end rounded-[3px] p-0.5" style={{ background: style.cardBg }}>
            <div className="h-1.5 rounded-[2px]" style={{ background: style.priceBg }} />
          </div>
        ))}
      </div>
      <div className="h-2" style={{ background: style.footerBg }} />
    </div>
  );
}
