"use client";

import { ArrowDown, ArrowUp, Check, ChevronDown, Package, Palette, Plus, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { discountPercent, formatPrice, randomId } from "@/lib/format";
import { resolveProductImageUrl } from "@/lib/keralaCatalogue";
import { LATIN_FONT_KEYS, MALAYALAM_FONT_KEYS, POSTER_FONTS } from "@/lib/poster/fonts";
import { api } from "@/lib/client/api";
import {
  BASE_CONTENT,
  FORMATS,
  HERO_PRESETS,
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  applyBrandColors,
  defaultLayout,
  isTransparent,
  resolveHeroImageUrl,
  type TemplateCategory,
} from "@/lib/poster/templates";
import { FittedPoster } from "./PosterPreview";
import type { BadgeMode, BrandAlign, FontKey, FormatKey, Poster, PosterItem, PosterStyle, Product, ResolvedItem, Store } from "@/lib/types";
import { ImageUploader, type PendingImage } from "../ImageUploader";
import { Button, ColorInput, Field, IconButton, Input, Select, Switch, Textarea, cx } from "../ui";

type Update = (patch: Partial<Poster>) => void;

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-gray-100 px-4 py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  display?: string;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm text-gray-700">
        <span>{label}</span>
        <span className="tabular text-gray-500">{display ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-brand-600"
      />
    </label>
  );
}

// ---------------- Products ----------------

export function ProductsPanel({
  poster,
  items,
  products,
  update,
  selectedId,
  onSelect,
}: {
  poster: Poster;
  items: ResolvedItem[];
  products: Product[];
  update: Update;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))).sort(), [products]);
  const onPoster = useMemo(() => new Map(poster.items.map((i) => [i.productId, i.id])), [poster.items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) => (category === "All" || p.category === category) && (!q || p.name.toLowerCase().includes(q) || p.nameMl.includes(q)),
    );
  }, [products, query, category]);

  const setItems = (next: PosterItem[]) => update({ items: next });

  function toggle(product: Product) {
    const existing = onPoster.get(product.id);
    if (existing) setItems(poster.items.filter((i) => i.id !== existing));
    else setItems([...poster.items, { id: randomId(8), productId: product.id }]);
  }

  function addAll() {
    const missing = filtered.filter((p) => !onPoster.has(p.id)).map((p) => ({ id: randomId(8), productId: p.id }));
    setItems([...poster.items, ...missing]);
  }

  function move(index: number, delta: number) {
    const next = [...poster.items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  }

  function patchItem(id: string, patch: Partial<PosterItem>) {
    setItems(poster.items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  const missingCount = filtered.filter((p) => !onPoster.has(p.id)).length;

  return (
    <div>
      <Section
        title={`On this poster (${items.length})`}
        action={
          items.length ? (
            <button type="button" className="text-xs font-medium text-red-700 hover:underline" onClick={() => setItems([])}>
              Remove all
            </button>
          ) : null
        }
      >
        {items.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">No products yet. Add some from the list below.</p>
        ) : (
          <ol className="space-y-1.5">
            {items.map((item, index) => (
              <PosterItemRow
                key={item.id}
                item={item}
                raw={poster.items.find((i) => i.id === item.id)!}
                index={index}
                count={items.length}
                open={selectedId === item.id}
                onToggle={() => onSelect(selectedId === item.id ? null : item.id)}
                onMove={(delta) => move(index, delta)}
                onRemove={() => setItems(poster.items.filter((i) => i.id !== item.id))}
                onPatch={(patch) => patchItem(item.id, patch)}
              />
            ))}
          </ol>
        )}
      </Section>

      <Section
        title="Add products"
        action={
          missingCount > 0 ? (
            <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={addAll}>
              Add all {missingCount}
            </Button>
          ) : null
        }
      >
        {products.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            Your product library is empty.{" "}
            <a href="/dashboard/products" className="font-medium text-brand-700 underline">
              Add products
            </a>{" "}
            first.
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" aria-label="Search products" className="pl-9" />
              </div>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="w-36">
                <option value="All">All</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <ul className="relative max-h-[26rem] space-y-1 overflow-y-auto overscroll-contain pr-1">
              {filtered.map((product) => {
                const added = onPoster.has(product.id);
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => toggle(product)}
                      aria-pressed={added}
                      className={cx(
                        "flex w-full items-center gap-3 rounded-lg p-2 text-left ring-1 transition-colors",
                        added ? "bg-brand-50 ring-brand-200" : "bg-white ring-gray-200 hover:ring-gray-300",
                      )}
                    >
                      <Thumb url={resolveProductImageUrl(product)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">{product.name}</span>
                        <span className="block truncate text-xs text-gray-600 tabular">
                          {formatPrice(product.offerPrice)}
                          {product.unit ? `/${product.unit}` : ""} · {product.category}
                        </span>
                      </span>
                      <span
                        className={cx(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          added ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700",
                        )}
                        aria-hidden="true"
                      >
                        {added ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </span>
                      <span className="sr-only">{added ? "Remove from poster" : "Add to poster"}</span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 ? <li className="p-3 text-sm text-gray-600">No products match.</li> : null}
            </ul>
          </>
        )}
      </Section>
    </div>
  );
}

function Thumb({ url }: { url: string }) {
  return (
    <span className="checkerboard flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-gray-200">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={40} height={40} loading="lazy" className="size-full object-contain p-0.5" />
      ) : (
        <Package className="size-4 text-gray-300" aria-hidden="true" />
      )}
    </span>
  );
}

function PosterItemRow({
  item,
  raw,
  index,
  count,
  open,
  onToggle,
  onMove,
  onRemove,
  onPatch,
}: {
  item: ResolvedItem;
  raw: PosterItem;
  index: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onPatch: (patch: Partial<PosterItem>) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgKey, setImgKey] = useState(0);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);
  const textOverridden =
    raw.name !== undefined ||
    raw.nameMl !== undefined ||
    raw.unit !== undefined ||
    raw.imageUrl !== undefined ||
    raw.normalPrice !== undefined ||
    raw.offerPrice !== undefined ||
    Boolean(raw.tag);
  const sizeOverridden =
    (raw.widthScale !== undefined && raw.widthScale !== 1) ||
    (raw.heightScale !== undefined && raw.heightScale !== 1) ||
    (raw.imageScale !== undefined && raw.imageScale !== 1) ||
    Boolean(raw.offsetX) ||
    Boolean(raw.offsetY);
  const overridden = textOverridden || sizeOverridden;
  const discount = discountPercent(item.normalPrice, item.offerPrice);

  const num = (value: string) => {
    const n = Number(value.replace(/[₹,\s]/g, ""));
    return value.trim() === "" || !Number.isFinite(n) || n < 0 ? undefined : n;
  };

  async function uploadItemImage(image: PendingImage | null | "remove") {
    if (image === null) return;
    if (image === "remove") {
      onPatch({ imageUrl: undefined });
      return;
    }
    setUploadingImg(true);
    try {
      const url = await api.upload(image.blob, item.name);
      onPatch({ imageUrl: url });
      setImgKey((k) => k + 1);
    } finally {
      setUploadingImg(false);
    }
  }

  return (
    <li ref={ref} className={cx("rounded-lg ring-1", open ? "bg-white ring-brand-300" : "bg-white ring-gray-200")}>
      <div className="flex items-center gap-2 p-1.5">
        <span className="w-5 shrink-0 text-center text-xs tabular text-gray-500">{index + 1}</span>
        <Thumb url={item.imageUrl} />
        <button type="button" onClick={onToggle} aria-expanded={open} className="min-w-0 flex-1 rounded py-1 text-left">
          <span className="block truncate text-sm font-medium text-gray-900">
            {item.name}
            {overridden ? <span className="ml-1.5 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">EDITED</span> : null}
          </span>
          <span className="block text-xs text-gray-600 tabular">
            {formatPrice(item.offerPrice)}
            {discount > 0 ? <span className="ml-1 text-red-700">−{discount}%</span> : null}
          </span>
        </button>
        <IconButton label="Move up" onClick={() => onMove(-1)} disabled={index === 0} className="size-8">
          <ArrowUp className="size-4" />
        </IconButton>
        <IconButton label="Move down" onClick={() => onMove(1)} disabled={index === count - 1} className="size-8">
          <ArrowDown className="size-4" />
        </IconButton>
        <IconButton label={`Edit ${item.name} on this poster`} onClick={onToggle} className="size-8">
          <ChevronDown className={cx("size-4 transition-transform", open && "rotate-180")} />
        </IconButton>
        <IconButton label={`Remove ${item.name}`} onClick={onRemove} className="size-8 hover:bg-red-50 hover:text-red-700">
          <X className="size-4" />
        </IconButton>
      </div>
      {open ? (
        <div className="grid grid-cols-2 gap-3 border-t border-gray-100 p-3">
          <p className="col-span-2 text-xs text-gray-600">Changes here apply to this poster only.</p>
          <Field label="Name" className="col-span-2">
            {(p) => <Input {...p} value={raw.name ?? item.name} onChange={(e) => onPatch({ name: e.target.value })} maxLength={80} />}
          </Field>
          <Field label="Malayalam name" className="col-span-2">
            {(p) => (
              <Input {...p} lang="ml" className="font-ml" value={raw.nameMl ?? item.nameMl} onChange={(e) => onPatch({ nameMl: e.target.value })} maxLength={80} />
            )}
          </Field>
          <Field label="MRP">
            {(p) => (
              <Input
                {...p}
                inputMode="decimal"
                className="tabular"
                key={`mrp-${item.normalPrice}`}
                defaultValue={String(item.normalPrice)}
                onBlur={(e) => onPatch({ normalPrice: num(e.target.value) ?? item.normalPrice })}
              />
            )}
          </Field>
          <Field label="Offer price">
            {(p) => (
              <Input
                {...p}
                inputMode="decimal"
                className="tabular"
                key={`offer-${item.offerPrice}`}
                defaultValue={String(item.offerPrice)}
                onBlur={(e) => onPatch({ offerPrice: num(e.target.value) ?? item.offerPrice })}
              />
            )}
          </Field>
          <Field label="Unit">
            {(p) => <Input {...p} value={raw.unit ?? item.unit} onChange={(e) => onPatch({ unit: e.target.value })} maxLength={20} />}
          </Field>
          <div className="flex items-end">
            {textOverridden ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw className="size-4" />}
                onClick={() =>
                  onPatch({
                    name: undefined,
                    nameMl: undefined,
                    unit: undefined,
                    imageUrl: undefined,
                    normalPrice: undefined,
                    offerPrice: undefined,
                    tag: undefined,
                  })
                }
              >
                Use library values
              </Button>
            ) : null}
          </div>
          <div className="col-span-2">
            <ImageUploader
              key={imgKey}
              label="Product photo on this poster"
              currentUrl={item.imageUrl}
              onChange={uploadItemImage}
              scale={raw.imageScale ?? 1}
              onScaleChange={(imageScale) => onPatch({ imageScale })}
            />
            {uploadingImg ? <p className="mt-1 text-xs text-gray-600" aria-live="polite">Uploading photo…</p> : null}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Field label="Special badge on this card" hint="Overrides the discount % badge (e.g. BUY 1 GET 1)">
              {(p) => <Input {...p} value={raw.tag ?? ""} onChange={(e) => onPatch({ tag: e.target.value || undefined })} placeholder="Default (% or Save ₹)" maxLength={24} />}
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {["BUY 1 GET 1", "COMBO", "MEGA DEAL", "TODAY ONLY", ""].map((preset) => (
                <button
                  key={preset || "default"}
                  type="button"
                  onClick={() => onPatch({ tag: preset || undefined })}
                  className={cx(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors",
                    (raw.tag ?? "") === preset ? "bg-brand-600 text-white ring-brand-600" : "bg-gray-50 text-gray-700 ring-gray-200 hover:bg-gray-100",
                  )}
                >
                  {preset || "Default"}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2 space-y-2.5 rounded-lg bg-gray-50/90 p-2.5 ring-1 ring-gray-200/80">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-900">Single Card Size & Position</span>
              {sizeOverridden ? (
                <button
                  type="button"
                  onClick={() =>
                    onPatch({
                      widthScale: undefined,
                      heightScale: undefined,
                      imageScale: undefined,
                      offsetX: undefined,
                      offsetY: undefined,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-50"
                >
                  <RotateCcw className="size-3" />
                  Reset size
                </button>
              ) : null}
            </div>
            <Slider
              label="This card width"
              min={0.5}
              max={1.8}
              step={0.05}
              value={raw.widthScale ?? 1}
              display={`${Math.round((raw.widthScale ?? 1) * 100)}%`}
              onChange={(widthScale) => onPatch({ widthScale })}
            />
            <Slider
              label="This card height"
              min={0.5}
              max={1.8}
              step={0.05}
              value={raw.heightScale ?? 1}
              display={`${Math.round((raw.heightScale ?? 1) * 100)}%`}
              onChange={(heightScale) => onPatch({ heightScale })}
            />
            <Slider
              label="This card image size"
              min={0.5}
              max={1.8}
              step={0.05}
              value={raw.imageScale ?? 1}
              display={`${Math.round((raw.imageScale ?? 1) * 100)}%`}
              onChange={(imageScale) => onPatch({ imageScale })}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Slider
                label="Position X"
                min={-300}
                max={300}
                step={5}
                value={raw.offsetX ?? 0}
                display={`${raw.offsetX ?? 0}px`}
                onChange={(offsetX) => onPatch({ offsetX })}
              />
              <Slider
                label="Position Y"
                min={-300}
                max={300}
                step={5}
                value={raw.offsetY ?? 0}
                display={`${raw.offsetY ?? 0}px`}
                onChange={(offsetY) => onPatch({ offsetY })}
              />
            </div>
            <p className="text-[11px] text-gray-500">Tip: You can also drag this card directly on the poster canvas.</p>
          </div>
        </div>
      ) : null}
    </li>
  );
}

// ---------------- Brand (Store Logo & Name) Size & Position ----------------

function BrandSizeAndPositionSection({ poster, update }: { poster: Poster; update: Update }) {
  const { content } = poster;
  const set = (patch: Partial<Poster["content"]>) => update({ content: { ...content, ...patch } });
  const logoScale = content.logoScale ?? 1;
  const storeNameScale = content.storeNameScale ?? 1;
  const brandAlign = content.brandAlign ?? "auto";
  const brandOffsetX = content.brandOffsetX ?? 0;
  const brandOffsetY = content.brandOffsetY ?? 0;
  const storeNameOffsetX = content.storeNameOffsetX ?? 0;
  const storeNameOffsetY = content.storeNameOffsetY ?? 0;
  const hasBrandCustom =
    logoScale !== 1 ||
    storeNameScale !== 1 ||
    brandAlign !== "auto" ||
    brandOffsetX !== 0 ||
    brandOffsetY !== 0 ||
    storeNameOffsetX !== 0 ||
    storeNameOffsetY !== 0;

  return (
    <Section
      title="Store Logo & Shop Name (Size & Position)"
      action={
        hasBrandCustom ? (
          <button
            type="button"
            onClick={() =>
              set({
                logoScale: 1,
                storeNameScale: 1,
                brandAlign: "auto",
                brandOffsetX: 0,
                brandOffsetY: 0,
                storeNameOffsetX: 0,
                storeNameOffsetY: 0,
              })
            }
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
        ) : null
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Switch checked={content.showLogo} onChange={(showLogo) => set({ showLogo })} label="Show store logo" />
          <Switch checked={content.showStoreName ?? true} onChange={(showStoreName) => set({ showStoreName })} label="Show shop name" />
        </div>
        <Slider
          label="Logo size"
          min={0.4}
          max={2.2}
          step={0.05}
          value={logoScale}
          display={`${Math.round(logoScale * 100)}%`}
          onChange={(v) => set({ logoScale: v })}
        />
        <Slider
          label="Shop name size"
          min={0.4}
          max={2.2}
          step={0.05}
          value={storeNameScale}
          display={`${Math.round(storeNameScale * 100)}%`}
          onChange={(v) => set({ storeNameScale: v })}
        />
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-gray-800">Quick position</span>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Logo and shop name position">
            {(
              [
                ["auto", "Default"],
                ["left", "Left"],
                ["center", "Center"],
                ["right", "Right"],
              ] as Array<[BrandAlign, string]>
            ).map(([align, label]) => (
              <button
                key={align}
                type="button"
                role="radio"
                aria-checked={brandAlign === align}
                onClick={() => set({ brandAlign: align })}
                className={cx(
                  "rounded-lg px-2 py-1.5 text-xs font-medium ring-1 transition-colors",
                  brandAlign === align ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Slider
            label="Logo & Name X"
            min={-450}
            max={450}
            step={5}
            value={brandOffsetX}
            display={`${brandOffsetX}px`}
            onChange={(v) => set({ brandOffsetX: v })}
          />
          <Slider
            label="Logo & Name Y"
            min={-250}
            max={250}
            step={5}
            value={brandOffsetY}
            display={`${brandOffsetY}px`}
            onChange={(v) => set({ brandOffsetY: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Slider
            label="Shop Name Extra X"
            min={-300}
            max={300}
            step={5}
            value={storeNameOffsetX}
            display={`${storeNameOffsetX}px`}
            onChange={(v) => set({ storeNameOffsetX: v })}
          />
          <Slider
            label="Shop Name Extra Y"
            min={-200}
            max={200}
            step={5}
            value={storeNameOffsetY}
            display={`${storeNameOffsetY}px`}
            onChange={(v) => set({ storeNameOffsetY: v })}
          />
        </div>
        <p className="text-[11px] text-gray-500">Tip: You can also drag the store logo & name directly on the poster canvas.</p>
      </div>
    </Section>
  );
}

// ---------------- Layout ----------------

export function LayoutPanel({
  poster,
  items,
  selectedId,
  onSelect,
  update,
  pages,
}: {
  poster: Poster;
  items: ResolvedItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  update: Update;
  pages: number;
}) {
  const { layout, style } = poster;
  const setLayout = (patch: Partial<Poster["layout"]>) => update({ layout: { ...layout, ...patch } });
  const setStyle = (patch: Partial<PosterStyle>) => update({ style: { ...style, ...patch } });
  const cardWidthScale = layout.cardWidthScale ?? 1;
  const cardHeightScale = layout.cardHeightScale ?? 1;
  const activeCardId = selectedId && items.some((i) => i.id === selectedId) ? selectedId : (items[0]?.id ?? null);
  const activeRaw = activeCardId ? poster.items.find((i) => i.id === activeCardId) : undefined;
  const patchActiveCard = (patch: Partial<PosterItem>) => {
    if (!activeCardId) return;
    update({ items: poster.items.map((it) => (it.id === activeCardId ? { ...it, ...patch } : it)) });
  };
  const singleCardCustom =
    Boolean(activeRaw) &&
    ((activeRaw?.widthScale !== undefined && activeRaw.widthScale !== 1) ||
      (activeRaw?.heightScale !== undefined && activeRaw.heightScale !== 1) ||
      (activeRaw?.imageScale !== undefined && activeRaw.imageScale !== 1) ||
      Boolean(activeRaw?.offsetX) ||
      Boolean(activeRaw?.offsetY));

  return (
    <div>
      <Section title="Size">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Poster size">
          {(Object.keys(FORMATS) as FormatKey[]).map((key) => {
            const f = FORMATS[key];
            const active = layout.format === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setLayout({ format: key })}
                className={cx(
                  "flex items-center gap-3 rounded-lg p-2.5 text-left ring-1 transition-colors",
                  active ? "bg-brand-50 ring-2 ring-brand-600" : "bg-white ring-gray-200 hover:ring-gray-300",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden="true">
                  <span
                    className={cx("block rounded-sm", active ? "bg-brand-600" : "bg-gray-300")}
                    style={{ width: f.width > f.height ? 36 : (36 * f.width) / f.height, height: f.height >= f.width ? 36 : (36 * f.height) / f.width }}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900">{f.label}</span>
                  <span className="block truncate text-[11px] text-gray-500">{f.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <BrandSizeAndPositionSection poster={poster} update={update} />

      <Section title="Grid & Header">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Columns">
            {(p) => (
              <Select {...p} value={layout.columns} onChange={(e) => setLayout({ columns: Number(e.target.value) })}>
                <option value={0}>Auto</option>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Rows">
            {(p) => (
              <Select {...p} value={layout.rows} onChange={(e) => setLayout({ rows: Number(e.target.value) })}>
                <option value={0}>Auto</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <p className="text-xs text-gray-600">
          {pages > 1 ? `${pages} pages. Extra products move to the next page.` : "Auto picks the biggest cards for your products."}
        </p>
        <Slider label="Space between cards" min={0} max={60} value={layout.gap} onChange={(gap) => setLayout({ gap })} />
        <Slider
          label="Header height"
          min={0.7}
          max={1.5}
          step={0.05}
          value={layout.headerSize}
          display={`${Math.round(layout.headerSize * 100)}%`}
          onChange={(headerSize) => setLayout({ headerSize })}
        />
        <Switch
          checked={Boolean(layout.heroFirst)}
          onChange={(heroFirst) => setLayout({ heroFirst })}
          label="Highlight 1st product as Mega Deal"
          description="Makes the first product 2 columns wide on page 1"
        />
      </Section>

      <Section
        title="All Product Cards (Width & Height)"
        action={
          cardWidthScale !== 1 || cardHeightScale !== 1 || layout.imageScale !== 1 ? (
            <button
              type="button"
              onClick={() => setLayout({ cardWidthScale: 1, cardHeightScale: 1, imageScale: 1 })}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </button>
          ) : null
        }
      >
        <Slider
          label="All cards width"
          min={0.5}
          max={1.35}
          step={0.05}
          value={cardWidthScale}
          display={`${Math.round(cardWidthScale * 100)}%`}
          onChange={(v) => setLayout({ cardWidthScale: v })}
        />
        <Slider
          label="All cards height"
          min={0.5}
          max={1.35}
          step={0.05}
          value={cardHeightScale}
          display={`${Math.round(cardHeightScale * 100)}%`}
          onChange={(v) => setLayout({ cardHeightScale: v })}
        />
        <Slider
          label="All product images size"
          min={0.6}
          max={1.4}
          step={0.05}
          value={layout.imageScale}
          display={`${Math.round(layout.imageScale * 100)}%`}
          onChange={(imageScale) => setLayout({ imageScale })}
        />
        <Slider label="Corner roundness" min={0} max={48} value={style.cardRadius} onChange={(cardRadius) => setStyle({ cardRadius })} />
        <Switch checked={style.cardShadow} onChange={(cardShadow) => setStyle({ cardShadow })} label="Card shadow" />
      </Section>

      <Section
        title="Single Card Size & Position"
        action={
          singleCardCustom ? (
            <button
              type="button"
              onClick={() =>
                patchActiveCard({
                  widthScale: undefined,
                  heightScale: undefined,
                  imageScale: undefined,
                  offsetX: undefined,
                  offsetY: undefined,
                })
              }
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
            >
              <RotateCcw className="size-3.5" />
              Reset card
            </button>
          ) : null
        }
      >
        {items.length === 0 ? (
          <p className="text-xs text-gray-500">Add products to this poster to customize individual card width, height, and position.</p>
        ) : (
          <div className="space-y-3">
            <Field label="Select product card to resize / move" hint="Or tap any product card directly on the poster">
              {(p) => (
                <Select {...p} value={activeCardId ?? ""} onChange={(e) => onSelect(e.target.value || null)}>
                  {items.map((it, idx) => (
                    <option key={it.id} value={it.id}>
                      #{idx + 1} — {it.name} ({formatPrice(it.offerPrice)})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Slider
              label="Single card width"
              min={0.5}
              max={1.8}
              step={0.05}
              value={activeRaw?.widthScale ?? 1}
              display={`${Math.round((activeRaw?.widthScale ?? 1) * 100)}%`}
              onChange={(widthScale) => patchActiveCard({ widthScale })}
            />
            <Slider
              label="Single card height"
              min={0.5}
              max={1.8}
              step={0.05}
              value={activeRaw?.heightScale ?? 1}
              display={`${Math.round((activeRaw?.heightScale ?? 1) * 100)}%`}
              onChange={(heightScale) => patchActiveCard({ heightScale })}
            />
            <Slider
              label="Single card image size"
              min={0.5}
              max={1.8}
              step={0.05}
              value={activeRaw?.imageScale ?? 1}
              display={`${Math.round((activeRaw?.imageScale ?? 1) * 100)}%`}
              onChange={(imageScale) => patchActiveCard({ imageScale })}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Slider
                label="Card Position X"
                min={-300}
                max={300}
                step={5}
                value={activeRaw?.offsetX ?? 0}
                display={`${activeRaw?.offsetX ?? 0}px`}
                onChange={(offsetX) => patchActiveCard({ offsetX })}
              />
              <Slider
                label="Card Position Y"
                min={-300}
                max={300}
                step={5}
                value={activeRaw?.offsetY ?? 0}
                display={`${activeRaw?.offsetY ?? 0}px`}
                onChange={(offsetY) => patchActiveCard({ offsetY })}
              />
            </div>
            <p className="text-[11px] text-gray-500">Tip: Drag any product card directly on the poster preview to move it freely.</p>
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------------- Style ----------------

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

const HEADER_OPTIONS: Array<[PosterStyle["headerStyle"], string]> = [
  ["banner", "Banner (curved block)"],
  ["split", "Split block + offer box"],
  ["arc", "Half circle"],
  ["blob", "Big curve + title circle"],
  ["circle", "Title circle + store info"],
  ["stack", "Big stacked title"],
  ["script", "Logo circle + script title"],
  ["ribbon", "Ribbon"],
  ["plain", "Plain"],
];

const COLOR_GROUPS: Array<{ title: string; fields: Array<{ key: keyof PosterStyle; label: string }> }> = [
  {
    title: "Background",
    fields: [
      { key: "bgTop", label: "Top" },
      { key: "bgBottom", label: "Bottom" },
      { key: "decorationColor", label: "Decoration" },
    ],
  },
  {
    title: "Header",
    fields: [
      { key: "headerBg", label: "Header" },
      { key: "headlineColor", label: "Main headline" },
      { key: "headerText", label: "Other header text" },
      { key: "panelBg", label: "Logo / offer box / circle" },
      { key: "panelText", label: "Text on that box" },
    ],
  },
  {
    title: "Date strip",
    fields: [
      { key: "stripBg", label: "Strip" },
      { key: "stripText", label: "Strip text" },
    ],
  },
  {
    title: "Products",
    fields: [
      { key: "cardBg", label: "Card" },
      { key: "nameColor", label: "Product name" },
      { key: "mrpColor", label: "MRP text" },
      { key: "priceBg", label: "Price" },
      { key: "priceText", label: "Price text" },
      { key: "priceAccent", label: "Price ring / name bar" },
      { key: "badgeBg", label: "Discount badge" },
      { key: "badgeText", label: "Discount text" },
    ],
  },
  {
    title: "Footer",
    fields: [
      { key: "footerBg", label: "Footer" },
      { key: "footerText", label: "Footer text" },
      { key: "footerAccent", label: "Icons / strip" },
    ],
  },
];

export function StylePanel({ poster, store, items, update }: { poster: Poster; store: Store; items: ResolvedItem[]; update: Update }) {
  const { style, content } = poster;
  const setStyle = (patch: Partial<PosterStyle>) => update({ style: { ...style, ...patch } });
  const setContent = (patch: Partial<Poster["content"]>) => update({ content: { ...content, ...patch } });
  const [matchTexts, setMatchTexts] = useState(true);
  const [showAllColors, setShowAllColors] = useState(false);
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const templates = TEMPLATES.filter((t) => category === "all" || t.category === category);

  function applyTemplate(t: (typeof TEMPLATES)[number]) {
    const next = t.brand ? applyBrandColors(t.style, store.colors) : t.style;
    const patch: Partial<Poster> = { templateId: t.id, style: { ...next } };
    if (matchTexts) {
      patch.content = {
        ...poster.content,
        ...t.content,
        footerNote: t.content.footerNote ?? BASE_CONTENT.footerNote,
        showDiscount: t.content.showDiscount ?? true,
        showMrp: t.content.showMrp ?? true,
      };
      patch.layout = { ...poster.layout, columns: 0, rows: 0, imageScale: 1, ...t.layout, format: poster.layout.format };
    }
    update(patch);
  }

  return (
    <div>
      <Section title="Template">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Template type">
          {[{ id: "all" as const, label: "All" }, ...TEMPLATE_CATEGORIES].map((cat) => (
            <button
              key={cat.id}
              type="button"
              aria-pressed={category === cat.id}
              onClick={() => setCategory(cat.id)}
              className={cx(
                "h-8 shrink-0 rounded-full px-3 text-xs font-medium ring-1 transition-colors",
                category === cat.id ? "bg-gray-900 text-white ring-gray-900" : "bg-white text-gray-700 ring-gray-300 hover:ring-gray-400",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => {
            const active = poster.templateId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => applyTemplate(t)}
                className={cx(
                  "overflow-hidden rounded-lg text-left ring-1 transition-shadow",
                  active ? "ring-2 ring-brand-600" : "ring-gray-200 hover:ring-gray-300",
                )}
              >
                <span className="block bg-gray-100 p-1.5" aria-hidden="true">
                  <TemplateThumb template={t} store={store} items={items} format={poster.layout.format} />
                </span>
                <span className="block truncate px-2 py-1.5 text-xs font-medium text-gray-900">{t.name}</span>
              </button>
            );
          })}
        </div>
        <Switch checked={matchTexts} onChange={setMatchTexts} label="Also use the template’s texts & grid" description="Turn off to keep your headline and layout." />
        <Button size="sm" className="w-full" icon={<Palette className="size-4" />} onClick={() => update({ style: applyBrandColors(style, store.colors) })}>
          Use my brand colours
        </Button>
      </Section>

      <Section title="Header">
        <Choice label="Header layout" value={style.headerStyle} options={HEADER_OPTIONS} onChange={(headerStyle) => setStyle({ headerStyle })} />
        <div className="grid grid-cols-2 gap-3">
          <Choice
            label="Background texture"
            value={style.bgPattern}
            options={[
              ["none", "None"],
              ["wood", "Wood planks"],
              ["paper", "Paper"],
              ["bokeh", "Soft light"],
              ["diagonal", "Lines (split header)"],
            ]}
            onChange={(bgPattern) => setStyle({ bgPattern })}
          />
          <Choice
            label="Decoration"
            value={style.decoration}
            options={[
              ["none", "None"],
              ["rays", "Sun rays (banner)"],
              ["leaves", "Leaves"],
              ["flowers", "Onam flowers"],
              ["sparkles", "Sparkles"],
              ["swoosh", "Green swoosh"],
              ["dots", "Dots"],
              ["confetti", "Confetti"],
              ["kasavu", "Kasavu gold border"],
            ]}
            onChange={(decoration) => setStyle({ decoration })}
          />
        </div>
        <Switch checked={style.headline3d} onChange={(headline3d) => setStyle({ headline3d })} label="3D headline" description="Outline and drop shadow" />
        <Switch checked={style.headingItalic} onChange={(headingItalic) => setStyle({ headingItalic })} label="Slanted headline" />
        <Choice
          label="Date strip"
          value={style.stripStyle}
          options={[
            ["pill", "Rounded pill"],
            ["bar", "Solid bar"],
          ]}
          onChange={(stripStyle) => setStyle({ stripStyle })}
        />
      </Section>

      <Section title="Products">
        <div className="grid grid-cols-2 gap-3">
          <Choice
            label="Card"
            value={style.cardStyle}
            options={[
              ["card", "White card"],
              ["panel", "See-through panel"],
              ["free", "No card"],
              ["divider", "Lines between"],
            ]}
            onChange={(cardStyle) => setStyle({ cardStyle })}
          />
          <Choice
            label="Price"
            value={style.priceStyle}
            options={[
              ["pill", "Wide pill"],
              ["tag", "Tag + name left"],
              ["big", "Big number"],
              ["circle", "Round badge"],
              ["slant", "Slanted tag"],
              ["flag", "Arrow flag"],
              ["bar", "Box + name bar"],
            ]}
            onChange={(priceStyle) => setStyle({ priceStyle })}
          />
          <Choice
            label="Discount badge"
            value={style.badgeShape}
            options={[
              ["burst", "Star burst"],
              ["circle", "Circle"],
              ["tag", "Tag"],
              ["corner", "Corner tab"],
              ["dot", "Small dot"],
            ]}
            onChange={(badgeShape) => setStyle({ badgeShape })}
          />
          <Choice
            label="Badge side"
            value={style.badgePosition}
            options={[
              ["right", "Right"],
              ["left", "Left"],
            ]}
            onChange={(badgePosition) => setStyle({ badgePosition })}
          />
          <Choice<BadgeMode>
            label="Discount badge text"
            value={content.badgeMode ?? "percent"}
            options={[
              ["percent", "Percentage (e.g. 25% OFF)"],
              ["save", "Rupee savings (e.g. SAVE ₹45)"],
              ["smart", "Smart (Save ₹ if ≥ ₹25, else %)"],
              ["bogo", "Buy 1 Get 1 Free (BOGO)"],
            ]}
            onChange={(badgeMode) => setContent({ badgeMode })}
            className="col-span-2"
          />
          <Choice
            label="Name position"
            value={style.namePosition}
            options={[
              ["below", "Below picture"],
              ["above", "Above picture"],
            ]}
            onChange={(namePosition) => setStyle({ namePosition })}
            className="col-span-2"
          />
        </div>
      </Section>

      <Section title="Footer">
        <Choice
          label="Footer layout"
          value={style.footerStyle}
          options={[
            ["band", "Simple band"],
            ["split", "Icons: phone, WhatsApp, address"],
            ["strip", "Logo + slanted note strip"],
            ["banner", "Rounded banner"],
          ]}
          onChange={(footerStyle) => setStyle({ footerStyle })}
        />
      </Section>

      <Section title="Colours">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "Store Brand", colors: store.colors },
              { name: "Supermarket Red", colors: { primary: "#d71920", secondary: "#fff4d6", accent: "#ffcc00" } },
              { name: "Fresh Veg Green", colors: { primary: "#15803d", secondary: "#ecfdf5", accent: "#facc15" } },
              { name: "Royal Blue", colors: { primary: "#1e3a8a", secondary: "#eff6ff", accent: "#facc15" } },
              { name: "Kasavu Gold", colors: { primary: "#7a1616", secondary: "#fffaf0", accent: "#c9a227" } },
              { name: "Ramzan Emerald", colors: { primary: "#047857", secondary: "#ecfdf5", accent: "#fde047" } },
            ].map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => update({ style: applyBrandColors(style, preset.colors) })}
                className="flex items-center gap-2 rounded-lg bg-white p-2 text-left text-xs font-medium text-gray-800 ring-1 ring-gray-200 hover:ring-gray-300"
              >
                <span className="flex -space-x-1" aria-hidden="true">
                  {[preset.colors.primary, preset.colors.secondary, preset.colors.accent].map((c, idx) => (
                    <span key={idx} className="size-4 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                  ))}
                </span>
                <span className="truncate">{preset.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAllColors((v) => !v)}
            aria-expanded={showAllColors}
            className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
          >
            <span>{showAllColors ? "Hide detailed colour pickers" : "Customize individual colours (20)"}</span>
            <ChevronDown className={cx("size-4 transition-transform", showAllColors && "rotate-180")} />
          </button>
          {showAllColors ? (
            <div className="space-y-4 pt-2">
              {COLOR_GROUPS.map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{group.title}</p>
                  {group.fields.map(({ key, label }) => (
                    <ColorInput key={key} label={label} value={String(style[key])} onChange={(v) => setStyle({ [key]: v } as Partial<PosterStyle>)} />
                  ))}
                </div>
              ))}
              {isTransparent(style.headerBg) ? <p className="text-xs text-gray-500">Header colour is see-through in this template. Pick a colour to add a header panel.</p> : null}
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Fonts">
        <FontSelect label="Headline" value={style.headingFont} options={LATIN_FONT_KEYS} onChange={(headingFont) => setStyle({ headingFont })} />
        <FontSelect label="Price" value={style.priceFont} options={LATIN_FONT_KEYS} onChange={(priceFont) => setStyle({ priceFont })} />
        <FontSelect label="Product names" value={style.bodyFont} options={LATIN_FONT_KEYS} onChange={(bodyFont) => setStyle({ bodyFont })} />
        <FontSelect label="Malayalam text" value={style.mlFont} options={MALAYALAM_FONT_KEYS} onChange={(mlFont) => setStyle({ mlFont })} />
      </Section>
    </div>
  );
}

function FontSelect({ label, value, options, onChange }: { label: string; value: FontKey; options: FontKey[]; onChange: (v: FontKey) => void }) {
  return (
    <Field label={label}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value as FontKey)}>
          {options.map((key) => (
            <option key={key} value={key}>
              {POSTER_FONTS[key].label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

// ---------------- Text ----------------

export function TextPanel({ poster, update }: { poster: Poster; update: Update }) {
  const { content } = poster;
  const set = (patch: Partial<Poster["content"]>) => update({ content: { ...content, ...patch } });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [heroKey, setHeroKey] = useState(0);
  const activeHeroUrl = resolveHeroImageUrl(content, poster.templateId);

  async function uploadHero(image: PendingImage | null | "remove") {
    if (image === null) return;
    if (image === "remove") {
      set({ heroImageUrl: "", heroEmoji: "" });
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const url = await api.upload(image.blob, "header");
      set({ heroImageUrl: url });
      setHeroKey((k) => k + 1);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <BrandSizeAndPositionSection poster={poster} update={update} />
      <Section title="Headline">
        <Field label="Small line above" hint="e.g. Weekend, Today only">
          {(p) => <Input {...p} value={content.kicker} onChange={(e) => set({ kicker: e.target.value })} placeholder="e.g. Weekend…" maxLength={40} />}
        </Field>
        <Field label="Headline">
          {(p) => <Input {...p} value={content.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="e.g. BIG DEALS…" maxLength={60} />}
        </Field>
        <Field label="Second headline word / line" hint="Shown in the second colour, e.g. DEALS">
          {(p) => <Input {...p} value={content.headline2} onChange={(e) => set({ headline2: e.target.value })} placeholder="e.g. DEALS…" maxLength={60} />}
        </Field>
        <Field label="Malayalam headline">
          {(p) => (
            <Input
              {...p}
              lang="ml"
              className="font-ml"
              value={content.headlineMl}
              onChange={(e) => set({ headlineMl: e.target.value })}
              placeholder="e.g. ഇന്നത്തെ ഓഫറുകൾ…"
              maxLength={60}
            />
          )}
        </Field>
        <Field label="Sub-headline" hint="Branch name, days or a short promise">
          {(p) => <Input {...p} value={content.subheadline} onChange={(e) => set({ subheadline: e.target.value })} placeholder="e.g. Best prices in town…" maxLength={100} />}
        </Field>
        <Field label="Sticker text" hint="Small tilted label. Leave empty to hide.">
          {(p) => <Input {...p} value={content.badgeText} onChange={(e) => set({ badgeText: e.target.value })} placeholder="e.g. TODAY ONLY…" maxLength={24} />}
        </Field>
      </Section>

      <Section title="Offer box">
        <p className="text-xs text-gray-600">Shown in the “Split block” header. Leave the value empty to hide it.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Label">
            {(p) => <Input {...p} value={content.offerLabel} onChange={(e) => set({ offerLabel: e.target.value })} placeholder="e.g. GET UP TO…" maxLength={24} />}
          </Field>
          <Field label="Value">
            {(p) => <Input {...p} value={content.offerValue} onChange={(e) => set({ offerValue: e.target.value })} placeholder="e.g. 70%…" maxLength={12} />}
          </Field>
        </div>
      </Section>

      <Section title="Header studio artwork">
        <Switch checked={content.showHero} onChange={(showHero) => set({ showHero })} label="Show header artwork" description="High-res studio cutout in circle, stacked and split headers" />
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Studio header artworks">
          {HERO_PRESETS.map((preset) => {
            const isSelected = content.showHero && activeHeroUrl === preset.url;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => set({ showHero: true, heroImageUrl: preset.url, heroEmoji: "" })}
                className={cx(
                  "flex items-center gap-2 rounded-lg p-1.5 text-left ring-1 transition-colors",
                  isSelected ? "bg-brand-50 ring-2 ring-brand-600" : "bg-white ring-gray-200 hover:ring-gray-300",
                )}
              >
                <span className="checkerboard flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-gray-200/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preset.url} alt="" width={40} height={40} loading="lazy" className="size-full object-contain p-0.5" />
                </span>
                <span className="truncate text-xs font-medium text-gray-800">{preset.label}</span>
              </button>
            );
          })}
        </div>
        <ImageUploader key={heroKey} label="Or upload your own custom PNG / store photo…" currentUrl={content.heroImageUrl} onChange={uploadHero} />
        {uploading ? <p className="text-xs text-gray-600" aria-live="polite">Uploading…</p> : null}
        {uploadError ? <p className="text-xs text-red-600" aria-live="polite">{uploadError}</p> : null}
      </Section>

      <Section title="Offer dates">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            {(p) => <Input {...p} type="date" value={content.validFrom} onChange={(e) => set({ validFrom: e.target.value })} />}
          </Field>
          <Field label="To">
            {(p) => <Input {...p} type="date" value={content.validTo} min={content.validFrom || undefined} onChange={(e) => set({ validTo: e.target.value })} />}
          </Field>
        </div>
        <Switch checked={content.showValidity} onChange={(showValidity) => set({ showValidity })} label="Show dates on poster" />
      </Section>

      <Section title="Product names">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Product names">
          {(
            [
              ["both", "English + മലയാളം"],
              ["en", "English"],
              ["ml", "മലയാളം"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={content.nameMode === mode}
              onClick={() => set({ nameMode: mode })}
              className={cx(
                "min-h-10 rounded-lg px-2 py-1.5 text-xs font-medium ring-1",
                content.nameMode === mode ? "bg-brand-50 text-brand-800 ring-2 ring-brand-600" : "bg-white text-gray-700 ring-gray-200 hover:ring-gray-300",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">Products without a Malayalam name show the English name.</p>
      </Section>

      <Section title="Footer & Highlights">
        <Field label="Delivery / Highlight stamp" hint="Shown in the date strip under the header">
          {(p) => <Input {...p} value={content.deliveryBadge ?? ""} onChange={(e) => set({ deliveryBadge: e.target.value })} placeholder="e.g. 🛵 Free Home Delivery…" maxLength={40} />}
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {["🛵 Free Home Delivery", "📱 WhatsApp Order", "✨ 100% Fresh & Halal", "💳 UPI Accepted", ""].map((stamp) => (
            <button
              key={stamp || "none"}
              type="button"
              onClick={() => set({ deliveryBadge: stamp })}
              className={cx(
                "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors",
                (content.deliveryBadge ?? "") === stamp ? "bg-brand-600 text-white ring-brand-600" : "bg-gray-50 text-gray-700 ring-gray-200 hover:bg-gray-100",
              )}
            >
              {stamp || "None"}
            </button>
          ))}
        </div>
        <Field label="Footer note">
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              value={content.footerNote}
              onChange={(e) => set({ footerNote: e.target.value })}
              placeholder="e.g. Offer valid while stocks last…"
              maxLength={160}
            />
          )}
        </Field>
        <Switch checked={content.showContact} onChange={(showContact) => set({ showContact })} label="Show phone & address" description="From Branding settings" />
        <Switch
          checked={Boolean(content.showQr)}
          onChange={(showQr) => set({ showQr })}
          label="Show QR code on poster"
          description="Customers scan to open offers & order on WhatsApp"
        />
      </Section>

      <Section title="Show on cards">
        <Switch checked={content.showMrp} onChange={(showMrp) => set({ showMrp })} label="MRP (struck through)" />
        <Switch checked={content.showDiscount} onChange={(showDiscount) => set({ showDiscount })} label="Discount % badge" />
        <Switch checked={content.showLogo} onChange={(showLogo) => set({ showLogo })} label="Store logo in header" />
      </Section>
    </div>
  );
}

/** Real mini render of a template with the poster's own products. */
function TemplateThumb({
  template,
  store,
  items,
  format,
}: {
  template: (typeof TEMPLATES)[number];
  store: Store;
  items: ResolvedItem[];
  format: FormatKey;
}) {
  const poster = useMemo(
    () => ({
      id: template.id,
      templateId: template.id,
      layout: defaultLayout(format, template),
      style: template.brand ? applyBrandColors(template.style, store.colors) : template.style,
      content: { ...BASE_CONTENT, ...template.content, validFrom: "", validTo: "" },
    }),
    [template, format, store.colors],
  );
  const sample = useMemo(() => items.slice(0, 6), [items]);
  return <FittedPoster poster={poster} store={store} items={sample} page={0} maxHeight={170} />;
}
