"use client";

import { Check, ChevronLeft, ChevronRight, ListChecks, Maximize2, Minimize2, Pause, Play, Tv, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, usePosters, useProducts, useStore } from "@/lib/client/api";
import { isExpired, resolveItems } from "@/lib/format";
import { posterGeometry } from "@/lib/poster/layout";
import type { Poster, Product, Store } from "@/lib/types";
import { FittedPoster } from "../poster/PosterPreview";
import { PosterThumb } from "../poster/PosterThumb";
import { cx } from "../ui";

const SPEEDS = [
  { seconds: 5, label: "5s" },
  { seconds: 8, label: "8s" },
  { seconds: 12, label: "12s" },
] as const;

export function TvDisplayScreen({
  fallbackStore,
  fallbackPosters,
  fallbackProducts,
}: {
  fallbackStore?: Store;
  fallbackPosters?: Poster[];
  fallbackProducts?: Product[];
}) {
  const searchParams = useSearchParams();
  const singlePosterParam = searchParams.get("poster")?.trim() || null;

  const { data: store } = useStore({ fallbackData: fallbackStore, refreshInterval: 20_000 });
  const { data: posters, mutate: mutatePosters } = usePosters({ fallbackData: fallbackPosters, refreshInterval: 10_000 });
  const { data: products } = useProducts({ fallbackData: fallbackProducts, refreshInterval: 15_000 });

  const [playing, setPlaying] = useState(true);
  const [speedSec, setSpeedSec] = useState<number>(6);
  const [slideIdx, setSlideIdx] = useState(0);
  const [maxHeight, setMaxHeight] = useState(900);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const hideTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onResize = () => setMaxHeight(Math.max(320, window.innerHeight - 16));
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    onResize();
    window.addEventListener("resize", onResize);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(hideTimerRef.current);
    if (playing && !selectorOpen) {
      hideTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    }
  }, [playing, selectorOpen]);

  useEffect(() => {
    revealControls();
    return () => window.clearTimeout(hideTimerRef.current);
  }, [revealControls]);

  // All valid (non-expired) posters available for admin selection
  const availablePosters = useMemo(() => {
    if (!posters) return [];
    return posters.filter((p) => !isExpired(p.content.validTo));
  }, [posters]);

  // Active posters to display on TV
  const activePosters = useMemo(() => {
    if (!posters) return [];
    if (singlePosterParam) {
      const target = posters.find((p) => p.id === singlePosterParam || p.slug === singlePosterParam);
      return target ? [target] : [];
    }
    const adminSelected = availablePosters.filter((p) => p.content.showOnTv);
    if (adminSelected.length > 0) return adminSelected;
    const publishedActive = availablePosters.filter((p) => p.published && p.items.length > 0);
    if (publishedActive.length > 0) return publishedActive;
    return availablePosters.filter((p) => p.items.length > 0);
  }, [posters, singlePosterParam, availablePosters]);

  // Build slides using each poster's exact multi-page geometry (Page 1..N)
  const slides = useMemo(() => {
    if (!store || !products) return [];
    const list: Array<{
      poster: Poster;
      items: ReturnType<typeof resolveItems>;
      page: number;
      totalPages: number;
    }> = [];

    for (const poster of activePosters) {
      const resolved = resolveItems(poster.items, products);
      if (resolved.length === 0 && !singlePosterParam) continue;
      const geo = posterGeometry(poster, store, resolved.length);
      const totalPages = Math.max(1, geo.pages);
      for (let page = 0; page < totalPages; page++) {
        list.push({
          poster,
          items: resolved,
          page,
          totalPages,
        });
      }
    }
    return list;
  }, [activePosters, store, products, singlePosterParam]);

  const currentIdx = slides.length ? slideIdx % slides.length : 0;

  useEffect(() => {
    if (!playing || slides.length <= 1 || selectorOpen) return;
    const id = window.setInterval(() => {
      setSlideIdx((i) => (i + 1) % slides.length);
    }, speedSec * 1000);
    return () => window.clearInterval(id);
  }, [playing, slides.length, speedSec, selectorOpen]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectorOpen) {
        if (e.key === "Escape") setSelectorOpen(false);
        return;
      }
      revealControls();
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (slides.length > 0) setSlideIdx((i) => (i + 1) % slides.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (slides.length > 0) setSlideIdx((i) => (i - 1 + slides.length) % slides.length);
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealControls, selectorOpen, slides.length, toggleFullscreen]);

  async function togglePosterOnTv(poster: Poster) {
    if (!posters) return;
    const nextVal = !poster.content.showOnTv;
    setUpdatingId(poster.id);
    const nextContent = { ...poster.content, showOnTv: nextVal };
    const optimistic = posters.map((p) => (p.id === poster.id ? { ...p, content: nextContent } : p));
    try {
      await mutatePosters(
        async () => {
          await api.patch(`/api/posters/${poster.id}`, { content: nextContent });
          return optimistic;
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false },
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (!store || !posters || !products) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black text-white">
        <p className="animate-pulse text-base font-semibold text-white/80">Loading TV Display…</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-black p-6 text-center text-white">
        <Tv className="size-12 text-emerald-400" />
        <h1 className="text-xl font-bold">{store.name} – TV Display</h1>
        <p className="max-w-md text-sm text-white/70">
          {singlePosterParam
            ? "This offer poster was not found or has ended."
            : "Select or create an active offer poster to start the TV slideshow."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {!singlePosterParam && availablePosters.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectorOpen(true)}
              className="rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/25"
            >
              Select Posters
            </button>
          ) : null}
          <Link href="/dashboard/posters" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">
            Go to Posters
          </Link>
        </div>
      </div>
    );
  }

  const current = slides[currentIdx];
  const adminSelectedCount = availablePosters.filter((p) => p.content.showOnTv).length;

  return (
    <div
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      onClick={revealControls}
      className="relative flex h-dvh w-screen flex-col items-center justify-center overflow-hidden bg-black text-white select-none"
    >
      {/* Full-Screen Poster Stage */}
      <div className="flex size-full items-center justify-center p-2">
        <FittedPoster
          key={`${current.poster.id}-${current.page}`}
          poster={current.poster}
          store={store}
          items={current.items}
          page={current.page}
          maxHeight={maxHeight}
          className="w-full max-w-[1720px]"
        />
      </div>

      {/* Minimal Floating Control Pill (Auto-hides when playing) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cx(
          "fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-neutral-900/90 px-3 py-1.5 shadow-2xl ring-1 ring-white/15 backdrop-blur-md transition-opacity duration-300",
          controlsVisible || !playing || selectorOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {/* Play / Pause */}
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause slideshow" : "Play slideshow"}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-500"
        >
          {playing ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
          <span>{playing ? "Pause" : "Play"}</span>
        </button>

        {/* Multi-page / Multi-slide Navigation */}
        {slides.length > 1 ? (
          <div className="flex items-center gap-1 px-1">
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i - 1 + slides.length) % slides.length)}
              aria-label="Previous page"
              className="flex size-8 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-xs font-semibold tabular text-white/90">
              {currentIdx + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i + 1) % slides.length)}
              aria-label="Next page"
              className="flex size-8 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : (
          <span className="px-2 text-xs font-medium text-white/70">1 / 1</span>
        )}

        {/* Speed Selector (only when multiple slides exist) */}
        {slides.length > 1 ? (
          <button
            type="button"
            onClick={() => {
              const idx = SPEEDS.findIndex((s) => s.seconds === speedSec);
              setSpeedSec(SPEEDS[(idx + 1) % SPEEDS.length].seconds);
            }}
            title="Slideshow speed per page"
            className=" rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold tabular text-white/85 hover:bg-white/20"
          >
            {speedSec}s
          </button>
        ) : null}

        {/* Admin Poster Selector (only on main /tv channel, hidden on single-poster TV page) */}
        {!singlePosterParam ? (
          <button
            type="button"
            onClick={() => setSelectorOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
          >
            <ListChecks className="size-3.5 text-emerald-400" />
            <span>Select Posters{adminSelectedCount > 0 ? ` (${adminSelectedCount})` : ""}</span>
          </button>
        ) : null}

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-xs font-semibold text-white hover:bg-white/25"
        >
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Full Screen"}</span>
        </button>
      </div>

      {/* Admin Poster Selector Modal (for /tv channel) */}
      {selectorOpen ? (
        <div
          onClick={() => setSelectorOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-2xl ring-1 ring-white/15"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-base font-bold">Select Posters for TV Display</h2>
                <p className="text-xs text-white/60">
                  Choose which offer posters should play on the TV. All pages of selected posters will cycle in the slideshow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectorOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3">
              {availablePosters.map((poster) => {
                const resolved = resolveItems(poster.items, products);
                const pages = Math.max(1, posterGeometry(poster, store, resolved.length).pages);
                const selected = Boolean(poster.content.showOnTv);
                return (
                  <button
                    key={poster.id}
                    type="button"
                    disabled={updatingId === poster.id}
                    onClick={() => void togglePosterOnTv(poster)}
                    className={cx(
                      "group relative flex flex-col overflow-hidden rounded-xl p-2.5 text-left transition-all",
                      selected
                        ? "bg-emerald-950/60 ring-2 ring-emerald-400"
                        : "bg-white/5 ring-1 ring-white/10 hover:bg-white/10",
                    )}
                  >
                    <div className="relative mb-2 rounded-lg bg-black/40 p-1.5">
                      <PosterThumb poster={poster} store={store} products={products} maxHeight={140} />
                      <span
                        className={cx(
                          "absolute right-2 top-2 flex size-6 items-center justify-center rounded-full shadow-md transition-colors",
                          selected ? "bg-emerald-500 text-white" : "bg-black/60 text-white/60 ring-1 ring-white/30",
                        )}
                      >
                        <Check className="size-3.5" />
                      </span>
                    </div>
                    <p className="truncate text-xs font-bold text-white">{poster.title}</p>
                    <p className="mt-0.5 text-[11px] text-white/60">
                      {pages} {pages === 1 ? "page" : "pages"} · {resolved.length} items
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 bg-neutral-950/60 px-5 py-3">
              <span className="text-xs text-white/70">
                {adminSelectedCount > 0
                  ? `${adminSelectedCount} poster${adminSelectedCount === 1 ? "" : "s"} selected (${slides.length} total slide pages)`
                  : `Showing all active posters (${slides.length} total slide pages)`}
              </span>
              <button
                type="button"
                onClick={() => setSelectorOpen(false)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
