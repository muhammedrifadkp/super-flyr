import { MapPin, MessageCircle, Minus, Phone, Plus, Sparkles } from "lucide-react";
import { discountPercent, formatPrice } from "@/lib/format";
import { readableOn } from "@/lib/poster/templates";
import type { ResolvedItem, Store } from "@/lib/types";

export function whatsappLink(store: Store, text?: string): string {
  const digits = store.whatsapp.replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return digits ? `https://wa.me/${digits}${query}` : `https://wa.me/${query}`;
}

export function StoreHero({
  store,
  color,
  ended = false,
  children,
}: {
  store: Store;
  color: string;
  ended?: boolean;
  children?: React.ReactNode;
}) {
  const text = readableOn(color);
  return (
    <header style={{ background: color, color: text }}>
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logoUrl} alt="" width={64} height={64} className="size-16 shrink-0 rounded-2xl bg-white object-contain p-1.5 shadow" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-xl font-bold sm:text-2xl">{store.name}</p>
            {ended ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                Offer Expired
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm">
                <Sparkles className="size-3" aria-hidden="true" /> WhatsApp Ordering Live
              </span>
            )}
          </div>
          {store.tagline ? <p className="truncate text-sm opacity-90">{store.tagline}</p> : null}
          {store.address ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs opacity-80">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" /> {store.address}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </header>
  );
}

export function ContactBar({ store, color, message }: { store: Store; color: string; message: string }) {
  const wa = whatsappLink(store, message);
  const actions = [
    store.phone && { href: `tel:${store.phone.replace(/[^\d+]/g, "")}`, label: "Call", icon: Phone },
    { href: wa, label: "WhatsApp", icon: MessageCircle },
    store.mapUrl && { href: store.mapUrl, label: "Directions", icon: MapPin },
  ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof Phone }>;
  return (
    <nav
      aria-label="Contact the store"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-3 pt-2 backdrop-blur pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:static sm:mx-auto sm:mt-8 sm:max-w-5xl sm:border-0 sm:bg-transparent sm:px-4"
    >
      <div className="mx-auto grid max-w-md gap-2" style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}>
        {actions.map(({ href, label, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-sm transition-[filter] hover:brightness-95"
            style={label === "WhatsApp" ? { background: "#1fa855", color: "#fff" } : { background: color, color: readableOn(color) }}
          >
            <Icon className="size-4" aria-hidden="true" /> {label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function ProductGrid({
  items,
  priceColor,
  badgeColor,
  cart,
  onAdd,
  onUpdateQty,
}: {
  items: ResolvedItem[];
  priceColor: string;
  badgeColor: string;
  cart?: Record<string, number>;
  onAdd?: (item: ResolvedItem) => void;
  onUpdateQty?: (item: ResolvedItem, delta: number) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <OfferCard
          key={item.id}
          item={item}
          priceColor={priceColor}
          badgeColor={badgeColor}
          qty={cart?.[item.id] ?? 0}
          onAdd={onAdd ? () => onAdd(item) : undefined}
          onUpdateQty={onUpdateQty ? (delta) => onUpdateQty(item, delta) : undefined}
        />
      ))}
    </ul>
  );
}

function OfferCard({
  item,
  priceColor,
  badgeColor,
  qty = 0,
  onAdd,
  onUpdateQty,
}: {
  item: ResolvedItem;
  priceColor: string;
  badgeColor: string;
  qty?: number;
  onAdd?: () => void;
  onUpdateQty?: (delta: number) => void;
}) {
  const discount = discountPercent(item.normalPrice, item.offerPrice);
  const save = item.normalPrice - item.offerPrice;
  const badgeLabel = item.tag?.trim()
    ? item.tag.trim()
    : save >= 25
      ? `SAVE ${formatPrice(save)}`
      : discount > 0
        ? `${discount}% OFF`
        : "";

  return (
    <li className="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-950/5 transition-shadow hover:shadow-md">
      {badgeLabel ? (
        <span
          className="absolute right-2 top-2 z-10 rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tabular shadow"
          style={{ background: badgeColor, color: readableOn(badgeColor) }}
        >
          {badgeLabel}
        </span>
      ) : null}
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-gray-50 p-5 sm:p-6">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            width={240}
            height={240}
            loading="lazy"
            decoding="async"
            style={item.imageScale && item.imageScale !== 1 ? { transform: `scale(${item.imageScale})` } : undefined}
            className="size-full object-contain"
          />
        ) : (
          <span className="text-4xl font-black text-gray-200" aria-hidden="true">
            {item.name.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-gray-950">{item.name}</p>
        {item.nameMl ? (
          <p lang="ml" className="font-ml line-clamp-1 text-sm text-gray-600">
            {item.nameMl}
          </p>
        ) : null}
        <div className="mt-auto pt-2">
          {discount > 0 ? (
            <p className="text-xs text-gray-500 tabular">
              <span className="line-through">MRP {formatPrice(item.normalPrice)}</span>
            </p>
          ) : null}
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold tabular" style={{ color: priceColor }}>
                  {formatPrice(item.offerPrice)}
                </span>
                {item.unit ? <span className="text-xs text-gray-600">/{item.unit}</span> : null}
              </p>
              {save > 0 ? <p className="text-xs font-semibold text-green-700 tabular">Save {formatPrice(save)}</p> : null}
            </div>

            {onAdd && onUpdateQty ? (
              qty > 0 ? (
                <div className="inline-flex h-9 items-center rounded-xl bg-gray-900 px-1 text-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(-1)}
                    aria-label={`Decrease ${item.name} quantity`}
                    className="flex size-7 items-center justify-center rounded-lg hover:bg-white/15"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="min-w-6 text-center text-xs font-bold tabular">{qty}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(1)}
                    aria-label={`Increase ${item.name} quantity`}
                    className="flex size-7 items-center justify-center rounded-lg hover:bg-white/15"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onAdd}
                  className="inline-flex h-9 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <Plus className="size-3.5" aria-hidden="true" /> Add
                </button>
              )
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/** Groups items by category when there are several categories, otherwise one flat list. */
export function groupByCategory(items: ResolvedItem[]): Array<{ category: string; items: ResolvedItem[] }> {
  const groups = new Map<string, ResolvedItem[]>();
  for (const item of items) {
    const key = item.category || "Offers";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  if (groups.size <= 1 || items.length < 8) return [{ category: "", items }];
  return Array.from(groups, ([category, list]) => ({ category, items: list }));
}

export function PoweredBy() {
  return (
    <p className="pb-28 pt-6 text-center text-xs text-gray-400 sm:pb-8">
      Digital Storefront & Offers by <span translate="no" className="font-semibold text-gray-500">Super Flyr</span>
    </p>
  );
}
