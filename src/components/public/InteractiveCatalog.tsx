"use client";

import { CalendarX2, Check, Clock, MessageCircle, Minus, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatPrice, isExpired } from "@/lib/format";
import type { ResolvedItem, Store } from "@/lib/types";
import { ContactBar, groupByCategory, ProductGrid, whatsappLink } from "./PublicParts";

/** Live urgency countdown timer for active offers. */
export function OfferCountdown({ validTo }: { validTo: string }) {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!validTo || !/^\d{4}-\d{2}-\d{2}$/.test(validTo)) return;
    const target = new Date(`${validTo}T23:59:59+05:30`).getTime();
    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setRemaining(null);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      if (days > 7) {
        setRemaining(null);
        return;
      }
      const parts = [
        days > 0 ? `${days}d` : "",
        `${String(hours).padStart(2, "0")}h`,
        `${String(mins).padStart(2, "0")}m`,
        `${String(secs).padStart(2, "0")}s`,
      ].filter(Boolean);
      setRemaining(parts.join(" : "));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [validTo]);

  if (!remaining) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-sm tabular">
      <Clock className="size-3.5 animate-pulse" aria-hidden="true" /> Ends in {remaining}
    </span>
  );
}

/**
 * Interactive storefront with search, category filter, and 1-click WhatsApp Cart ordering.
 */
export function InteractiveOfferCatalog({
  items,
  store,
  posterTitle,
  validTo,
  priceColor,
  badgeColor,
  themeColor,
}: {
  items: ResolvedItem[];
  store: Store;
  posterTitle: string;
  validTo?: string;
  priceColor: string;
  badgeColor: string;
  themeColor: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "pickup">("delivery");
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [expiredNow, setExpiredNow] = useState(() => (validTo ? isExpired(validTo) : false));

  useEffect(() => {
    if (!validTo) return;
    const check = () => {
      if (isExpired(validTo)) {
        setExpiredNow(true);
        setCart({});
        setCheckoutOpen(false);
      }
    };
    check();
    const id = window.setInterval(check, 5000);
    return () => window.clearInterval(id);
  }, [validTo]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) if (item.category) set.add(item.category);
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (category === "All" || i.category === category) &&
        (!q || i.name.toLowerCase().includes(q) || i.nameMl.includes(q) || i.category.toLowerCase().includes(q)),
    );
  }, [items, query, category]);

  const groups = useMemo(() => groupByCategory(filtered), [filtered]);

  function updateQty(item: ResolvedItem, delta: number) {
    if (expiredNow || (validTo && isExpired(validTo))) {
      setExpiredNow(true);
      setCart({});
      setCheckoutOpen(false);
      return;
    }
    setCart((prev) => {
      const nextQty = (prev[item.id] ?? 0) + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      }
      return { ...prev, [item.id]: nextQty };
    });
  }

  const cartLines = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = byId.get(id);
        return item ? { item, qty } : null;
      })
      .filter(Boolean) as Array<{ item: ResolvedItem; qty: number }>;
  }, [cart, items]);

  const totalItems = cartLines.reduce((sum, l) => sum + l.qty, 0);
  const totalOffer = cartLines.reduce((sum, l) => sum + l.item.offerPrice * l.qty, 0);
  const totalMrp = cartLines.reduce((sum, l) => sum + l.item.normalPrice * l.qty, 0);
  const totalSaved = Math.max(0, totalMrp - totalOffer);

  function buildOrderMessage(): string {
    const lines = [
      `🛒 *New Offer Order – ${store.name}*`,
      `📋 Offer: *${posterTitle}*`,
      `--------------------------------`,
      ...cartLines.map(
        ({ item, qty }, idx) =>
          `${idx + 1}. *${item.name}*${item.nameMl ? ` (${item.nameMl})` : ""}${item.unit ? ` [${item.unit}]` : ""} × ${qty} = *${formatPrice(item.offerPrice * qty)}*`,
      ),
      `--------------------------------`,
      `💰 *Total Payable: ${formatPrice(totalOffer)}*`,
      totalSaved > 0 ? `🎉 *Total Savings: ${formatPrice(totalSaved)}*` : "",
      `🚚 Mode: *${deliveryMode === "delivery" ? "Home Delivery" : "Store Pickup"}*`,
      customerName.trim() ? `👤 Name: ${customerName.trim()}` : "",
      deliveryMode === "delivery" && address.trim() ? `📍 Address: ${address.trim()}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }

  const orderWaUrl = whatsappLink(store, buildOrderMessage());

  if (expiredNow) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
          <CalendarX2 className="size-8" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-950">This Offer Has Expired</h2>
        <p lang="ml" className="font-ml mt-1 text-base font-bold text-red-700">
          ഈ ഓഫറിന്റെ കാലാവധി അവസാനിച്ചു
        </p>
        <p className="mt-2 text-sm text-gray-600">
          The validity period for this promotion has ended, so products and ordering for this offer are no longer available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.length > 4 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search offers (English / മലയാളം)…"
              aria-label="Search offers"
              className="h-10 w-full rounded-xl bg-white pl-10 pr-4 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          {categories.length > 1 ? (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filter by category">
              {["All", ...categories].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold ring-1 transition-colors ${
                    category === cat ? "bg-gray-900 text-white ring-gray-900" : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-600 ring-1 ring-gray-200">
          No matching products found.{" "}
          <button type="button" onClick={() => (setQuery(""), setCategory("All"))} className="font-semibold text-emerald-700 underline">
            Show all offers
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.category || "all"} aria-labelledby={group.category ? `cat-${group.category}` : undefined}>
              {group.category ? (
                <h2 id={`cat-${group.category}`} className="mb-3 text-lg font-bold text-gray-950">
                  {group.category}
                </h2>
              ) : null}
              <ProductGrid
                items={group.items}
                priceColor={priceColor}
                badgeColor={badgeColor}
                cart={cart}
                onAdd={(item) => updateQty(item, 1)}
                onUpdateQty={updateQty}
              />
            </section>
          ))}
        </div>
      )}

      {/* Floating WhatsApp Cart Bar when items are selected */}
      {totalItems > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow">
                <ShoppingBag className="size-5" aria-hidden="true" />
                <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-gray-950">
                  {totalItems}
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-base font-extrabold tabular text-gray-950">
                  {formatPrice(totalOffer)}
                  {totalSaved > 0 ? (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      Save {formatPrice(totalSaved)}
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-gray-600">Tap to review items & send order on WhatsApp</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#1fa855] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#178a45]"
            >
              <MessageCircle className="size-4" aria-hidden="true" /> Order on WhatsApp
            </button>
          </div>
        </div>
      ) : (
        <ContactBar store={store} color={themeColor} message={`Hi ${store.name}, I saw your “${posterTitle}” offers.`} />
      )}

      {/* WhatsApp Order Review & Checkout Modal */}
      {checkoutOpen && totalItems > 0 ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="WhatsApp Order Summary">
          <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-950">Your Offer Bag ({totalItems} items)</h2>
                <p className="text-xs text-gray-500">Order goes directly to {store.name} on WhatsApp</p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                aria-label="Close bag"
                className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <ul className="divide-y divide-gray-100 rounded-2xl bg-gray-50 px-3 ring-1 ring-gray-200/80">
                {cartLines.map(({ item, qty }) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500 tabular">
                        {formatPrice(item.offerPrice)}
                        {item.unit ? `/${item.unit}` : ""} × {qty} = <strong className="text-gray-900">{formatPrice(item.offerPrice * qty)}</strong>
                      </p>
                    </div>
                    <div className="inline-flex h-8 items-center rounded-lg bg-white px-1 ring-1 ring-gray-300">
                      <button type="button" onClick={() => updateQty(item, -1)} className="flex size-6 items-center justify-center text-gray-700">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-xs font-bold tabular">{qty}</span>
                      <button type="button" onClick={() => updateQty(item, 1)} className="flex size-6 items-center justify-center text-gray-700">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm ring-1 ring-emerald-200">
                <div>
                  <span className="font-semibold text-emerald-950">Total Payable</span>
                  {totalSaved > 0 ? <span className="block text-xs font-medium text-emerald-700">You save {formatPrice(totalSaved)} on this order!</span> : null}
                </div>
                <span className="text-xl font-black tabular text-emerald-900">{formatPrice(totalOffer)}</span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode("delivery")}
                    className={`rounded-xl py-2.5 text-xs font-bold ring-1 transition-colors ${
                      deliveryMode === "delivery" ? "bg-gray-900 text-white ring-gray-900" : "bg-white text-gray-700 ring-gray-300"
                    }`}
                  >
                    🛵 Home Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMode("pickup")}
                    className={`rounded-xl py-2.5 text-xs font-bold ring-1 transition-colors ${
                      deliveryMode === "pickup" ? "bg-gray-900 text-white ring-gray-900" : "bg-white text-gray-700 ring-gray-300"
                    }`}
                  >
                    🏪 Store Pickup
                  </button>
                </div>

                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Name (optional)"
                  className="h-10 w-full rounded-xl bg-gray-50 px-3.5 text-sm text-gray-900 ring-1 ring-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />

                {deliveryMode === "delivery" ? (
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Delivery Address / Landmark (optional)"
                    className="w-full rounded-xl bg-gray-50 p-3 text-sm text-gray-900 ring-1 ring-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3.5">
              <button
                type="button"
                onClick={() => {
                  setCart({});
                  setCheckoutOpen(false);
                }}
                className="inline-flex h-11 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 className="size-4" /> Clear
              </button>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(buildOrderMessage());
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100"
              >
                {copied ? <Check className="size-4 text-emerald-600" /> : null}
                {copied ? "Copied" : "Copy Bill"}
              </button>
              <a
                href={orderWaUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1fa855] px-4 text-sm font-bold text-white shadow hover:bg-[#178a45]"
              >
                <MessageCircle className="size-4" aria-hidden="true" /> Send Order on WhatsApp
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

