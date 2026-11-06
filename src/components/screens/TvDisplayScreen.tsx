"use client";

import { ChevronLeft, ChevronRight, Maximize2, Pause, Play, Tv } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePosters, useProducts, useStore } from "@/lib/client/api";
import { discountPercent, formatPrice, formatValidity, isExpired, resolveItems } from "@/lib/format";
import { encodeQrMatrix } from "@/lib/poster/qr";
import { readableOn } from "@/lib/poster/templates";
import type { Poster, Product, Store } from "@/lib/types";
import { FittedPoster } from "../poster/PosterPreview";

export function TvDisplayScreen({
  fallbackStore,
  fallbackPosters,
  fallbackProducts,
}: {
  fallbackStore?: Store;
  fallbackPosters?: Poster[];
  fallbackProducts?: Product[];
}) {
  const { data: store } = useStore({ fallbackData: fallbackStore, refreshInterval: 20_000 });
  const { data: posters } = usePosters({ fallbackData: fallbackPosters, refreshInterval: 15_000 });
  const { data: products } = useProducts({ fallbackData: fallbackProducts, refreshInterval: 15_000 });

  const [mode, setMode] = useState<"board" | "poster">("board");
  const [playing, setPlaying] = useState(true);
  const [slideIdx, setSlideIdx] = useState(0);
  const [maxHeight, setMaxHeight] = useState(820);
  const [origin, setOrigin] = useState("https://offers.store");

  useEffect(() => {
    setOrigin(window.location.origin);
    const onResize = () => setMaxHeight(Math.max(400, window.innerHeight - 96));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const slides = useMemo(() => {
    if (!posters || !products) return [];
    let active = posters.filter((p) => p.published && !isExpired(p.content.validTo));
    // Fallback to any non-expired poster with items so demos work immediately even before publishing
    if (active.length === 0) active = posters.filter((p) => !isExpired(p.content.validTo));

    const list: Array<{ poster: Poster; items: ReturnType<typeof resolveItems>; page: number; totalPages: number }> = [];
    for (const poster of active) {
      const resolved = resolveItems(poster.items, products);
      if (resolved.length === 0) continue;
      const chunkSize = 8;
      const totalPages = Math.max(1, Math.ceil(resolved.length / chunkSize));
      for (let page = 0; page < totalPages; page++) {
        list.push({
          poster,
          items: mode === "board" ? resolved.slice(page * chunkSize, (page + 1) * chunkSize) : resolved,
          page,
          totalPages,
        });
      }
    }
    return list;
  }, [posters, products, mode]);

  const currentIdx = slides.length ? slideIdx % slides.length : 0;

  useEffect(() => {
    if (!playing || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideIdx((i) => (i + 1) % slides.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [playing, slides.length]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      void document.exitFullscreen().catch(() => undefined);
    }
  }

  if (!store || !posters || !products) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-950 text-white">
        <p className="animate-pulse text-lg font-semibold">Loading Smart TV Display…</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-white">
        <Tv className="size-14 text-emerald-400" />
        <h1 className="text-2xl font-bold">{store.name} – Smart TV Display</h1>
        <p className="max-w-md text-sm text-slate-300">
          Create a poster with products in the Dashboard to start the live in-store TV slideshow.
        </p>
        <Link href="/dashboard/posters/new" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">
          Create a Poster
        </Link>
      </div>
    );
  }

  const current = slides[currentIdx];
  const { poster, items } = current;
  const primary = poster.style.headerBg && !poster.style.headerBg.endsWith("00") ? poster.style.headerBg : store.colors.primary;
  const accent = poster.style.badgeBg || store.colors.accent;
  const validity = formatValidity(poster.content.validFrom, poster.content.validTo);
  const qrUrl = `${origin}/o/${poster.slug}`;
  const qrMatrix = encodeQrMatrix(qrUrl);

  const tvPoster: Poster = {
    ...poster,
    layout: { ...poster.layout, format: "landscape", columns: 0, rows: 0 },
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-950 text-white select-none">
      {mode === "poster" ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <FittedPoster
            poster={tvPoster}
            store={store}
            items={items}
            page={current.page}
            maxHeight={maxHeight}
            className="w-full max-w-[1600px]"
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* TV Header Banner */}
          <header
            className="flex shrink-0 items-center justify-between gap-6 px-8 py-5 shadow-lg"
            style={{ background: primary, color: readableOn(primary) }}
          >
            <div className="flex items-center gap-4">
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logoUrl} alt="" className="size-16 rounded-2xl bg-white object-contain p-1.5 shadow" />
              ) : null}
              <div>
                <p className="text-sm font-bold uppercase tracking-wider opacity-85">{store.name}</p>
                <h1 className="text-3xl font-black uppercase tracking-tight lg:text-4xl">
                  {poster.content.headline} {poster.content.headline2}
                </h1>
                {poster.content.headlineMl ? (
                  <p lang="ml" className="font-ml text-xl font-bold opacity-95">
                    {poster.content.headlineMl}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="hidden text-right md:block">
                {validity ? (
                  <span
                    className="inline-block rounded-full px-4 py-1.5 text-sm font-black uppercase shadow"
                    style={{ background: accent, color: readableOn(accent) }}
                  >
                    {validity}
                  </span>
                ) : null}
                {store.phone || store.whatsapp ? (
                  <p className="mt-1.5 text-sm font-bold opacity-90">
                    Order on WhatsApp: {store.whatsapp || store.phone}
                  </p>
                ) : null}
              </div>

              {/* Scannable QR Box */}
              <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 text-slate-900 shadow-xl">
                <svg viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`} className="size-16 shrink-0" shapeRendering="crispEdges">
                  {qrMatrix.map((row, r) =>
                    row.map((cell, c) => (cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0f172a" /> : null)),
                  )}
                </svg>
                <div className="pr-1 text-left">
                  <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">Scan to Order</p>
                  <p className="text-xs font-bold leading-tight text-slate-800">on WhatsApp</p>
                  <p lang="ml" className="font-ml text-[11px] font-bold text-slate-600">
                    ഓർഡർ ചെയ്യാം
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* TV Product Grid */}
          <main className="grid min-h-0 flex-1 grid-cols-2 gap-4 p-6 sm:grid-cols-4">
            {items.map((item) => {
              const discount = discountPercent(item.normalPrice, item.offerPrice);
              const save = Math.max(0, Math.round(item.normalPrice - item.offerPrice));
              const badge = item.tag?.trim()
                ? item.tag.trim()
                : save >= 25
                  ? `SAVE ₹${save}`
                  : discount > 0
                    ? `${discount}% OFF`
                    : "";
              return (
                <div
                  key={item.id}
                  className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-4 text-slate-950 shadow-xl"
                >
                  {badge ? (
                    <span
                      className="absolute right-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-black uppercase shadow-md"
                      style={{ background: accent, color: readableOn(accent) }}
                    >
                      {badge}
                    </span>
                  ) : null}
                  <div className="flex min-h-0 flex-1 items-center justify-center p-2">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-5xl font-black text-slate-200">{item.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <p className="truncate text-base font-extrabold text-slate-900">{item.name}</p>
                    {item.nameMl ? (
                      <p lang="ml" className="font-ml truncate text-sm font-bold text-slate-600">
                        {item.nameMl}
                      </p>
                    ) : null}
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                      {discount > 0 ? (
                        <span className="text-xs font-bold text-slate-400 line-through tabular">
                          MRP {formatPrice(item.normalPrice)}
                        </span>
                      ) : <span />}
                      <span
                        className="rounded-xl px-3 py-1 text-xl font-black tabular shadow-sm"
                        style={{ background: poster.style.priceBg || primary, color: readableOn(poster.style.priceBg || primary) }}
                      >
                        {formatPrice(item.offerPrice)}
                        {item.unit ? <span className="ml-0.5 text-xs font-semibold opacity-90">/{item.unit}</span> : null}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </main>
        </div>
      )}

      {/* Subtle TV Controls Footer Bar */}
      <footer className="flex h-12 shrink-0 items-center justify-between border-t border-white/10 bg-slate-900/90 px-6 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="size-2 animate-ping rounded-full bg-emerald-400" /> LIVE TV DISPLAY
          </span>
          <span>•</span>
          <span>
            Slide {currentIdx + 1} of {slides.length} ({poster.title})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === "board" ? "poster" : "board")}
            className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-white hover:bg-white/20"
          >
            View: {mode === "board" ? "TV Grid + QR" : "16:9 Poster"}
          </button>
          <button
            type="button"
            onClick={() => setSlideIdx((i) => (i - 1 + slides.length) % slides.length)}
            aria-label="Previous slide"
            className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => setSlideIdx((i) => (i + 1) % slides.length)}
            aria-label="Next slide"
            className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500"
          >
            <Maximize2 className="size-3.5" /> Fullscreen
          </button>
        </div>
      </footer>
    </div>
  );
}
