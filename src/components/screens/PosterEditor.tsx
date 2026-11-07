"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Globe,
  Layout as LayoutIcon,
  Minimize2,
  Package,
  Paintbrush,
  Redo2,
  RotateCcw,
  Share2,
  Type,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, usePoster, useProducts, useStore } from "@/lib/client/api";
import { resolveItems, slugify } from "@/lib/format";
import { posterGeometry } from "@/lib/poster/layout";
import { FORMATS, normalizePoster } from "@/lib/poster/templates";
import type { ElementTransform, Poster, PosterPatch, Product, Store } from "@/lib/types";
import { ExportHost, type ExportRequest } from "../poster/ExportHost";
import { ExportDialog, ShareDialog } from "../poster/EditorDialogs";
import { LayoutPanel, ProductsPanel, StylePanel, TextPanel } from "../poster/EditorPanels";
import type { ItemTransformPatch } from "../poster/PosterCanvas";
import { FittedPoster } from "../poster/PosterPreview";
import { useToast } from "../Toast";
import { Button, EmptyState, IconButton, Skeleton, Spinner, cx } from "../ui";

type Tab = "products" | "layout" | "style" | "text";
const TABS: Array<{ id: Tab; label: string; icon: typeof Package }> = [
  { id: "products", label: "Products", icon: Package },
  { id: "layout", label: "Layout", icon: LayoutIcon },
  { id: "style", label: "Style", icon: Paintbrush },
  { id: "text", label: "Text", icon: Type },
];

type SaveState = "saved" | "pending" | "saving" | "error";
const SAVE_DELAY = 800;
const HISTORY_LIMIT = 60;

function editable(p: Poster): PosterPatch {
  return { title: p.title, templateId: p.templateId, published: p.published, layout: p.layout, style: p.style, content: p.content, items: p.items };
}

function readTabFromUrl(): Tab {
  const fromUrl = new URLSearchParams(window.location.search).get("tab");
  return TABS.find((t) => t.id === fromUrl)?.id ?? "products";
}

export function PosterEditor() {
  const { id } = useParams<{ id: string }>();
  const { data: remote, error, mutate: mutateRemote } = usePoster(id);
  const { data: products } = useProducts();
  const { data: store } = useStore();
  const onSaved = useCallback((saved: Poster) => void mutateRemote(saved, { revalidate: false }), [mutateRemote]);

  if (error) {
    return (
      <div className="p-6">
        <EmptyState title="Poster not found" action={<Link className="text-sm font-medium text-brand-700 underline" href="/dashboard/posters">Back to posters</Link>}>
          {error.message}
        </EmptyState>
      </div>
    );
  }

  if (!remote || !store || !products) {
    return (
      <div className="flex h-dvh flex-col md:flex-row" aria-busy="true">
        <div className="space-y-3 border-b border-gray-200 bg-white p-4 md:w-[380px] md:border-b-0 md:border-r">
          <Skeleton className="h-10" />
          <Skeleton className="h-64" />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <Skeleton className="aspect-[4/5] w-full max-w-md" />
        </div>
      </div>
    );
  }

  // Editing works on a local copy; remount when switching posters.
  return <EditorInner key={remote.id} initial={remote} store={store} products={products} onSaved={onSaved} />;
}

function EditorInner({
  initial,
  store,
  products,
  onSaved,
}: {
  initial: Poster;
  store: Store;
  products: Product[];
  onSaved: (poster: Poster) => void;
}) {
  const toast = useToast();
  const [poster, setPoster] = useState<Poster>(() => normalizePoster(initial));
  const [tab, setTab] = useState<Tab>(readTabFromUrl);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [exportRequest, setExportRequest] = useState<ExportRequest | null>(null);
  const [dialog, setDialog] = useState<"export" | "share" | null>(null);
  const [mobileFullPreview, setMobileFullPreview] = useState(false);

  // ----- undo / redo -----
  const past = useRef<Poster[]>([]);
  const future = useRef<Poster[]>([]);
  const lastPush = useRef(0);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const syncHistory = useCallback(() => setHistory({ undo: past.current.length, redo: future.current.length }), []);

  // ----- autosave -----
  const latest = useRef<Poster>(poster);
  const timer = useRef<number | undefined>(undefined);
  const inFlight = useRef<Promise<void> | null>(null);
  const dirty = useRef(false);

  // Keep the open tab in the URL (?tab=style) so reloads restore it.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === tab) return;
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url);
  }, [tab]);

  const save = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    if (!dirty.current || !latest.current) return;
    dirty.current = false;
    const snapshot = latest.current;
    setSaveState("saving");
    const run = api
      .patch<Poster>(`/api/posters/${snapshot.id}`, editable(snapshot))
      .then((saved) => {
        onSaved(saved);
        setSaveState(dirty.current ? "pending" : "saved");
      })
      .catch((e: unknown) => {
        dirty.current = true;
        setSaveState("error");
        toast.error(e instanceof Error ? `Not saved: ${e.message}` : "Not saved. Check your connection.");
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = run;
    await run;
  }, [onSaved, toast]);

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    setSaveState("pending");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), SAVE_DELAY);
  }, [save]);

  const commit = useCallback(
    (next: Poster, recordHistory = true) => {
      const current = latest.current;
      if (recordHistory && current) {
        const now = Date.now();
        // Group rapid changes (typing, sliders) into one undo step.
        if (now - lastPush.current > 600) {
          past.current = [...past.current.slice(-HISTORY_LIMIT + 1), current];
          future.current = [];
          syncHistory();
        }
        lastPush.current = now;
      }
      latest.current = next;
      setPoster(next);
      scheduleSave();
    },
    [scheduleSave, syncHistory],
  );

  const update = useCallback(
    (patch: Partial<Poster>) => {
      if (!latest.current) return;
      commit({ ...latest.current, ...patch });
    },
    [commit],
  );

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous || !latest.current) return;
    future.current.push(latest.current);
    lastPush.current = 0;
    syncHistory();
    commit(previous, false);
  }, [commit, syncHistory]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !latest.current) return;
    past.current.push(latest.current);
    lastPush.current = 0;
    syncHistory();
    commit(next, false);
  }, [commit, syncHistory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable=true]")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Warn before leaving with unsaved changes; flush when the tab is hidden.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || inFlight.current) e.preventDefault();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirty.current) void save();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onHide);
      if (dirty.current) void save();
    };
  }, [save]);

  const previewMaxHeight = usePreviewMaxHeight(mobileFullPreview);
  const items = useMemo(() => resolveItems(poster.items, products), [poster.items, products]);
  const geo = posterGeometry(poster, store, items.length);
  const pages = geo.pages;
  const currentPage = Math.min(page, pages - 1);

  useEffect(() => {
    document.title = `${poster.title} · Super Flyr`;
  }, [poster.title]);

  const selectItem = useCallback(
    (itemId: string | null) => {
      setSelectedId(itemId);
      if (itemId) {
        setTab((current) => (current === "layout" ? "layout" : "products"));
        const index = items.findIndex((i) => i.id === itemId);
        if (index >= 0) setPage(Math.floor(index / geo.perPage));
      }
    },
    [geo.perPage, items],
  );

  const handleMoveBrand = useCallback(
    (brandOffsetX: number, brandOffsetY: number) => {
      if (!latest.current) return;
      update({
        content: {
          ...latest.current.content,
          brandOffsetX: Math.max(-600, Math.min(600, brandOffsetX)),
          brandOffsetY: Math.max(-400, Math.min(400, brandOffsetY)),
        },
      });
    },
    [update],
  );

  const handleMoveItem = useCallback(
    (itemId: string, offsetX: number, offsetY: number) => {
      if (!latest.current) return;
      setSelectedId(itemId);
      update({
        items: latest.current.items.map((it) =>
          it.id === itemId
            ? {
                ...it,
                offsetX: Math.max(-800, Math.min(800, offsetX)),
                offsetY: Math.max(-800, Math.min(800, offsetY)),
              }
            : it,
        ),
      });
    },
    [update],
  );

  const handleTransformItem = useCallback(
    (itemId: string, patch: ItemTransformPatch) => {
      if (!latest.current) return;
      setSelectedId(itemId);
      update({
        items: latest.current.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      });
    },
    [update],
  );

  const handleTransformElement = useCallback(
    (key: string, transform: ElementTransform) => {
      if (!latest.current) return;
      const current = latest.current.content;
      update({
        content: {
          ...current,
          elementTransforms: {
            ...(current.elementTransforms ?? {}),
            [key]: transform,
          },
        },
      });
    },
    [update],
  );

  const hasCanvasTransforms =
    Object.keys(poster.content.elementTransforms ?? {}).length > 0 ||
    Boolean(poster.content.brandOffsetX) ||
    Boolean(poster.content.brandOffsetY) ||
    poster.items.some(
      (it) =>
        Boolean(it.offsetX) ||
        Boolean(it.offsetY) ||
        (it.widthScale !== undefined && it.widthScale !== 1) ||
        (it.heightScale !== undefined && it.heightScale !== 1),
    );

  const resetCanvasTransforms = useCallback(() => {
    if (!latest.current) return;
    update({
      content: {
        ...latest.current.content,
        brandOffsetX: 0,
        brandOffsetY: 0,
        elementTransforms: {},
      },
      items: latest.current.items.map((it) => ({
        ...it,
        widthScale: undefined,
        heightScale: undefined,
        offsetX: undefined,
        offsetY: undefined,
      })),
    });
  }, [update]);

  /** Renders all pages at full size. Returns data URLs. */
  const renderPages = useCallback(
    (options: { pixelRatio: number; mime: "image/png" | "image/jpeg"; quality?: number }) =>
      new Promise<string[]>((resolve, reject) => {
        setExportRequest({
          pixelRatio: options.pixelRatio,
          mime: options.mime,
          quality: options.quality ?? 0.92,
          resolve: (urls) => {
            setExportRequest(null);
            resolve(urls);
          },
          reject: (err) => {
            setExportRequest(null);
            reject(err);
          },
        });
      }),
    [],
  );

  const format = FORMATS[poster.layout.format];
  const baseName = slugify(poster.title);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Top bar */}
      <header className="z-30 flex h-13 shrink-0 items-center gap-0.5 border-b border-gray-200 bg-white px-1.5 sm:h-14 sm:gap-2 sm:px-3">
        <Link
          href="/dashboard/posters"
          aria-label="Back to posters"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
          onClick={() => void save()}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <input
          value={poster.title}
          onChange={(e) => update({ title: e.target.value.slice(0, 80) })}
          onBlur={(e) => {
            if (!e.target.value.trim()) update({ title: "Untitled poster" });
          }}
          aria-label="Poster title"
          className="h-9 min-w-0 flex-1 rounded-lg border-0 bg-transparent px-1.5 text-sm font-semibold text-gray-950 hover:bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
        <SaveIndicator state={saveState} onRetry={() => void save()} />
        <div className="flex items-center">
          <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!history.undo} className="size-8 sm:size-9">
            <Undo2 className="size-4 sm:size-[18px]" />
          </IconButton>
          <IconButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!history.redo} className="size-8 sm:size-9">
            <Redo2 className="size-4 sm:size-[18px]" />
          </IconButton>
        </div>
        <IconButton
          label={mobileFullPreview ? "Show editor controls" : "Full screen preview"}
          onClick={() => setMobileFullPreview((v) => !v)}
          className={cx("size-8 md:hidden", mobileFullPreview && "bg-brand-50 text-brand-700")}
        >
          {mobileFullPreview ? <Minimize2 className="size-4" /> : <Eye className="size-4" />}
        </IconButton>
        <Button size="sm" icon={poster.published ? <Globe className="size-4 text-brand-600" /> : <Share2 className="size-4" />} onClick={() => setDialog("share")} className="px-2.5 sm:px-3">
          <span className="hidden sm:inline">{poster.published ? "Published" : "Share"}</span>
        </Button>
        <Button size="sm" variant="primary" icon={<Download className="size-4" />} onClick={() => setDialog("export")} className="px-2.5 sm:px-3">
          <span className="hidden sm:inline">Download</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        {/* Panel */}
        <aside
          className={cx(
            "flex min-h-0 flex-col border-t border-gray-200 bg-white md:w-[380px] md:shrink-0 md:border-r md:border-t-0",
            mobileFullPreview ? "shrink-0" : "flex-1 md:flex-initial",
          )}
        >
          <div role="tablist" aria-label="Editor sections" className="z-20 grid shrink-0 grid-cols-4 border-b border-gray-200 bg-white">
            {TABS.map(({ id: tabId, label, icon: Icon }) => {
              const active = !mobileFullPreview && tab === tabId;
              return (
                <button
                  key={tabId}
                  role="tab"
                  type="button"
                  id={`tab-${tabId}`}
                  aria-selected={active}
                  aria-controls={`panel-${tabId}`}
                  onClick={() => {
                    setTab(tabId);
                    setMobileFullPreview(false);
                  }}
                  className={cx(
                    "relative flex h-12 flex-col items-center justify-center gap-0.5 border-b-2 text-xs font-medium transition-colors",
                    active ? "border-brand-600 bg-brand-50/40 text-brand-700" : "border-transparent text-gray-600 hover:text-gray-950",
                  )}
                >
                  <span className="relative inline-flex items-center">
                    <Icon className="size-4" aria-hidden="true" />
                    {tabId === "products" && items.length > 0 ? (
                      <span className="ml-1 rounded-full bg-brand-100 px-1.5 py-0 text-[10px] font-bold tabular text-brand-800">
                        {items.length}
                      </span>
                    ) : null}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
          <div
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            className={cx(
              "relative min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-6",
              mobileFullPreview && "hidden md:block",
            )}
          >
            {tab === "products" ? (
              <ProductsPanel poster={poster} items={items} products={products} update={update} selectedId={selectedId} onSelect={selectItem} />
            ) : tab === "layout" ? (
              <LayoutPanel poster={poster} items={items} selectedId={selectedId} onSelect={selectItem} update={update} pages={pages} />
            ) : tab === "style" ? (
              <StylePanel poster={poster} store={store} items={items} update={update} />
            ) : (
              <TextPanel poster={poster} update={update} />
            )}
          </div>
        </aside>

        {/* Preview */}
        <section
          aria-label="Poster preview"
          className={cx(
            "flex min-h-0 flex-col bg-[#e9ebef] md:flex-1",
            mobileFullPreview ? "flex-1" : "shrink-0",
          )}
        >
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-3 py-2 md:p-8">
            <FittedPoster
              className="w-full max-w-[min(100%,1100px)]"
              maxHeight={previewMaxHeight}
              poster={poster}
              store={store}
              items={items}
              page={currentPage}
              selectedId={selectedId}
              onSelectItem={selectItem}
              onMoveBrand={handleMoveBrand}
              onMoveItem={handleMoveItem}
              onTransformItem={handleTransformItem}
              onTransformElement={handleTransformElement}
              showEmptyHint
            />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-1.5 text-xs text-gray-700 md:justify-center md:gap-4 md:pb-3 md:text-sm">
            {pages > 1 ? (
              <div className="flex items-center gap-1.5">
                <IconButton label="Previous page" onClick={() => setPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="size-7 md:size-9">
                  <ChevronLeft className="size-4 md:size-5" />
                </IconButton>
                <span className="font-medium tabular" aria-live="polite">
                  Page {currentPage + 1} / {pages}
                </span>
                <IconButton label="Next page" onClick={() => setPage(Math.min(pages - 1, currentPage + 1))} disabled={currentPage >= pages - 1} className="size-7 md:size-9">
                  <ChevronRight className="size-4 md:size-5" />
                </IconButton>
              </div>
            ) : (
              <span className="truncate text-[11px] text-gray-500 tabular md:text-xs">
                {format.label} · {format.width}×{format.height} · click any element on poster to drag or resize
              </span>
            )}
            <div className="flex shrink-0 items-center gap-1.5">
              {hasCanvasTransforms ? (
                <button
                  type="button"
                  onClick={resetCanvasTransforms}
                  className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-brand-700 shadow-xs ring-1 ring-brand-200 hover:bg-brand-50"
                >
                  <RotateCcw className="size-3" aria-hidden="true" />
                  Reset Canvas
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setMobileFullPreview((v) => !v)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-800 shadow-xs ring-1 ring-gray-300 md:hidden"
              >
                {mobileFullPreview ? (
                  <>
                    <Minimize2 className="size-3" aria-hidden="true" /> Edit Tools
                  </>
                ) : (
                  <>
                    <Eye className="size-3" aria-hidden="true" /> Full Preview
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>

      {exportRequest ? <ExportHost request={exportRequest} poster={poster} store={store} items={items} pages={pages} /> : null}

      <ExportDialog
        key={poster.layout.format}
        open={dialog === "export"}
        onClose={() => setDialog(null)}
        poster={poster}
        store={store}
        items={items}
        pages={pages}
        baseName={baseName}
        renderPages={renderPages}
        empty={items.length === 0}
      />
      <ShareDialog
        open={dialog === "share"}
        onClose={() => setDialog(null)}
        poster={poster}
        store={store}
        baseName={baseName}
        renderPages={renderPages}
        onPublish={async (published) => {
          update({ published });
          await save();
        }}
        onTogglePosterQr={(showQr) => update({ content: { ...poster.content, showQr } })}
        onToggleShowOnTv={(showOnTv) => {
          update({ content: { ...poster.content, showOnTv } });
          toast.success(showOnTv ? "Added to Shop TV display." : "Removed from Shop TV display.");
        }}
      />
    </div>
  );
}

/** Keeps the whole poster visible: viewport height minus the editor chrome. */
function usePreviewMaxHeight(mobileFullPreview: boolean) {
  const [height, setHeight] = useState(420);
  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 768) {
        setHeight(Math.max(320, window.innerHeight - 160));
      } else if (mobileFullPreview) {
        setHeight(Math.max(260, window.innerHeight - 156));
      } else {
        setHeight(Math.max(175, Math.min(300, Math.round(window.innerHeight * 0.31))));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [mobileFullPreview]);
  return height;
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "error") {
    return (
      <button type="button" onClick={onRetry} className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
        Not saved · Retry
      </button>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5 px-1 text-xs text-gray-500" aria-live="polite">
      {state === "saving" ? <Spinner className="size-3" /> : null}
      <span className="hidden sm:inline">{state === "saved" ? "Saved" : state === "saving" ? "Saving…" : "Editing…"}</span>
    </span>
  );
}
