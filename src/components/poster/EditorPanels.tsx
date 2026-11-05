"use client";

import { ArrowDown, ArrowUp, Check, ChevronDown, Package, Palette, Plus, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { discountPercent, formatPrice, randomId } from "@/lib/format";
import { LATIN_FONT_KEYS, MALAYALAM_FONT_KEYS, POSTER_FONTS } from "@/lib/poster/fonts";
import { FORMATS, TEMPLATES, applyBrandColors } from "@/lib/poster/templates";
import type { FontKey, FormatKey, Poster, PosterItem, PosterStyle, Product, ResolvedItem, Store } from "@/lib/types";
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
                      <Thumb url={product.imageUrl} />
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
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);
  const overridden = raw.name !== undefined || raw.nameMl !== undefined || raw.unit !== undefined || raw.normalPrice !== undefined || raw.offerPrice !== undefined;
  const discount = discountPercent(item.normalPrice, item.offerPrice);

  const num = (value: string) => {
    const n = Number(value.replace(/[₹,\s]/g, ""));
    return value.trim() === "" || !Number.isFinite(n) || n < 0 ? undefined : n;
  };

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
            {overridden ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw className="size-4" />}
                onClick={() => onPatch({ name: undefined, nameMl: undefined, unit: undefined, normalPrice: undefined, offerPrice: undefined })}
              >
                Use library values
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

// ---------------- Layout ----------------

export function LayoutPanel({ poster, update, pages }: { poster: Poster; update: Update; pages: number }) {
  const { layout, style } = poster;
  const setLayout = (patch: Partial<Poster["layout"]>) => update({ layout: { ...layout, ...patch } });
  const setStyle = (patch: Partial<PosterStyle>) => update({ style: { ...style, ...patch } });
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
      <Section title="Grid">
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
          label="Product image size"
          min={0.6}
          max={1.4}
          step={0.05}
          value={layout.imageScale}
          display={`${Math.round(layout.imageScale * 100)}%`}
          onChange={(imageScale) => setLayout({ imageScale })}
        />
      </Section>
      <Section title="Cards">
        <Slider label="Corner roundness" min={0} max={48} value={style.cardRadius} onChange={(cardRadius) => setStyle({ cardRadius })} />
        <Switch checked={style.cardShadow} onChange={(cardShadow) => setStyle({ cardShadow })} label="Card shadow" />
      </Section>
    </div>
  );
}

// ---------------- Style ----------------

const COLOR_FIELDS: Array<{ key: keyof PosterStyle; label: string }> = [
  { key: "bgTop", label: "Background top" },
  { key: "bgBottom", label: "Background bottom" },
  { key: "headerBg", label: "Header" },
  { key: "headerText", label: "Header text" },
  { key: "cardBg", label: "Card" },
  { key: "nameColor", label: "Product name" },
  { key: "priceBg", label: "Price box" },
  { key: "priceText", label: "Price text" },
  { key: "mrpColor", label: "MRP text" },
  { key: "badgeBg", label: "Badge" },
  { key: "badgeText", label: "Badge text" },
  { key: "footerBg", label: "Footer" },
  { key: "footerText", label: "Footer text" },
  { key: "decorationColor", label: "Decoration" },
];

export function StylePanel({ poster, store, update }: { poster: Poster; store: Store; update: Update }) {
  const { style } = poster;
  const setStyle = (patch: Partial<PosterStyle>) => update({ style: { ...style, ...patch } });

  return (
    <div>
      <Section title="Template">
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => {
            const s = t.brand ? applyBrandColors(t.style, store.colors) : t.style;
            const active = poster.templateId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  update({
                    templateId: t.id,
                    // Keep the user's layout choices; take the template's look.
                    style: { ...s, cardRadius: style.cardRadius, cardShadow: s.cardShadow },
                  })
                }
                className={cx(
                  "overflow-hidden rounded-lg text-left ring-1 transition-shadow",
                  active ? "ring-2 ring-brand-600" : "ring-gray-200 hover:ring-gray-300",
                )}
              >
                <span className="block h-14" style={{ background: `linear-gradient(${s.bgTop}, ${s.bgBottom})` }} aria-hidden="true">
                  <span className="block h-5" style={{ background: s.headerBg }} />
                  <span className="mx-auto mt-1.5 flex w-3/4 gap-1">
                    <span className="h-5 flex-1 rounded-sm bg-white" />
                    <span className="h-5 flex-1 rounded-sm bg-white" />
                    <span className="h-5 flex-1 rounded-sm" style={{ background: s.priceBg }} />
                  </span>
                </span>
                <span className="block truncate px-2 py-1.5 text-xs font-medium text-gray-900">{t.name}</span>
              </button>
            );
          })}
        </div>
        <Button
          size="sm"
          className="w-full"
          icon={<Palette className="size-4" />}
          onClick={() => update({ style: applyBrandColors(style, store.colors) })}
        >
          Use my brand colours
        </Button>
      </Section>
      <Section title="Shapes">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Header style">
            {(p) => (
              <Select {...p} value={style.headerStyle} onChange={(e) => setStyle({ headerStyle: e.target.value as PosterStyle["headerStyle"] })}>
                <option value="banner">Banner</option>
                <option value="ribbon">Ribbon</option>
                <option value="plain">Plain</option>
              </Select>
            )}
          </Field>
          <Field label="Discount badge">
            {(p) => (
              <Select {...p} value={style.badgeShape} onChange={(e) => setStyle({ badgeShape: e.target.value as PosterStyle["badgeShape"] })}>
                <option value="burst">Star burst</option>
                <option value="circle">Circle</option>
                <option value="tag">Tag</option>
              </Select>
            )}
          </Field>
          <Field label="Decoration" className="col-span-2">
            {(p) => (
              <Select {...p} value={style.decoration} onChange={(e) => setStyle({ decoration: e.target.value as PosterStyle["decoration"] })}>
                <option value="none">None</option>
                <option value="rays">Sun rays (banner header)</option>
                <option value="leaves">Leaves</option>
                <option value="dots">Dots</option>
                <option value="confetti">Confetti</option>
                <option value="kasavu">Kasavu gold border</option>
              </Select>
            )}
          </Field>
        </div>
      </Section>
      <Section title="Colours">
        <div className="grid gap-2.5">
          {COLOR_FIELDS.map(({ key, label }) => (
            <ColorInput key={key} label={label} value={String(style[key])} onChange={(v) => setStyle({ [key]: v } as Partial<PosterStyle>)} />
          ))}
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
  return (
    <div>
      <Section title="Headline">
        <Field label="Headline">
          {(p) => <Input {...p} value={content.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="e.g. TODAY'S OFFERS…" maxLength={60} />}
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
        <Field label="Sub-headline">
          {(p) => <Input {...p} value={content.subheadline} onChange={(e) => set({ subheadline: e.target.value })} placeholder="e.g. Best prices in town…" maxLength={100} />}
        </Field>
        <Field label="Sticker text" hint="Small tilted label at the top right. Leave empty to hide.">
          {(p) => <Input {...p} value={content.badgeText} onChange={(e) => set({ badgeText: e.target.value })} placeholder="e.g. TODAY ONLY…" maxLength={24} />}
        </Field>
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
      <Section title="Footer">
        <Field label="Footer note">
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              value={content.footerNote}
              onChange={(e) => set({ footerNote: e.target.value })}
              placeholder="e.g. Offer valid while stocks last…"
              maxLength={140}
            />
          )}
        </Field>
        <Switch checked={content.showContact} onChange={(showContact) => set({ showContact })} label="Show phone & address" description="From Branding settings" />
      </Section>
      <Section title="Show on cards">
        <Switch checked={content.showMrp} onChange={(showMrp) => set({ showMrp })} label="MRP (struck through)" />
        <Switch checked={content.showDiscount} onChange={(showDiscount) => set({ showDiscount })} label="Discount % badge" />
        <Switch checked={content.showLogo} onChange={(showLogo) => set({ showLogo })} label="Store logo in header" />
      </Section>
    </div>
  );
}
