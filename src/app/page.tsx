import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { OfferCountdown } from "@/components/public/InteractiveCatalog";
import { ContactBar, PoweredBy, ProductGrid, StoreHero } from "@/components/public/PublicParts";
import { getRepo } from "@/lib/db";
import { formatValidity, isExpired, resolveItems } from "@/lib/format";
import { readableOn } from "@/lib/poster/templates";

async function load() {
  await connection();
  const repo = getRepo();
  const [store, posters, products] = await Promise.all([repo.getStore(), repo.listPosters(), repo.listProducts()]);
  const live = posters
    .filter((p) => p.published && !isExpired(p.content.validTo))
    .map((poster) => ({ poster, items: resolveItems(poster.items, products) }))
    .filter((o) => o.items.length > 0);
  return { store, live };
}

export async function generateMetadata(): Promise<Metadata> {
  const { store, live } = await load();
  return {
    title: { absolute: `${store.name} – Today’s offers` },
    description: live.length ? `${live.length} live offers at ${store.name}. ${store.tagline}`.trim() : `Offers from ${store.name}.`,
  };
}

export default function PublicHome() {
  return (
    <Suspense fallback={<div className="h-56 animate-pulse bg-gray-300" aria-busy="true" />}>
      <StoreOffers />
    </Suspense>
  );
}

async function StoreOffers() {
  const { store, live } = await load();
  const color = store.colors.primary;

  return (
    <div className="min-h-dvh bg-gray-50">
      <StoreHero store={store} color={color}>
        <div className="mx-auto max-w-5xl px-4 pb-6">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Today’s offers</h1>
          <p lang="ml" className="font-ml text-lg font-semibold opacity-90">
            ഇന്നത്തെ ഓഫറുകൾ • Tap any offer to order on WhatsApp
          </p>
        </div>
      </StoreHero>

      <main id="main" className="mx-auto max-w-5xl space-y-10 px-4 py-6">
        {live.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-gray-200">
            <p className="text-lg font-semibold text-gray-900">No offers right now</p>
            <p className="mt-1 text-sm text-gray-600">New offers are added every day. Please check again soon.</p>
          </div>
        ) : (
          live.map(({ poster, items }) => {
            const validity = formatValidity(poster.content.validFrom, poster.content.validTo);
            return (
              <section key={poster.id} aria-labelledby={`offer-${poster.id}`}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div className="min-w-0">
                    <h2 id={`offer-${poster.id}`} className="text-xl font-extrabold uppercase text-gray-950">
                      {poster.content.headline || poster.title}
                    </h2>
                    {poster.content.headlineMl ? (
                      <p lang="ml" className="font-ml font-semibold text-gray-700">
                        {poster.content.headlineMl}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {validity ? (
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ background: poster.style.badgeBg, color: readableOn(poster.style.badgeBg) }}
                      >
                        {validity}
                      </span>
                    ) : null}
                    {poster.content.validTo ? <OfferCountdown validTo={poster.content.validTo} /> : null}
                  </div>
                </div>
                <ProductGrid items={items.slice(0, 8)} priceColor={poster.style.priceBg} badgeColor={poster.style.badgeBg} />
                <Link
                  href={`/o/${poster.slug}`}
                  className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  {items.length > 8 ? `See all ${items.length} items & Order on WhatsApp` : "Open & Order on WhatsApp"}{" "}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </section>
            );
          })
        )}
      </main>

      <ContactBar store={store} color={color} message={`Hi ${store.name}, I saw your offers.`} />
      <PoweredBy />
    </div>
  );
}
