import { CalendarX2, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { InteractiveOfferCatalog, OfferCountdown } from "@/components/public/InteractiveCatalog";
import { PoweredBy, StoreHero } from "@/components/public/PublicParts";
import { getRepo } from "@/lib/db";
import { discountPercent, formatValidity, isExpired, resolveItems } from "@/lib/format";
import { normalizeStyle, pageColor, readableOn } from "@/lib/poster/templates";

async function load(slug: string) {
  await connection();
  const repo = getRepo();
  const poster = await repo.getPosterBySlug(slug);
  if (!poster || !poster.published) return null;
  const ended = isExpired(poster.content.validTo);
  const [store, products, posters] = await Promise.all([
    repo.getStore(),
    ended ? Promise.resolve([]) : repo.listProducts(),
    ended ? repo.listPosters() : Promise.resolve([]),
  ]);
  const activeOffer = ended
    ? posters.find((p) => p.published && p.id !== poster.id && !isExpired(p.content.validTo))
    : undefined;
  return {
    poster,
    store,
    ended,
    activeSlug: activeOffer?.slug,
    items: ended ? [] : resolveItems(poster.items, products),
  };
}

export async function generateMetadata({ params }: PageProps<"/o/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Offer not found", robots: { index: false } };
  const { poster, store, items, ended } = data;
  if (ended) {
    return {
      title: { absolute: `Offer Expired – ${store.name}` },
      description: `This offer at ${store.name} has expired.`,
      robots: { index: false },
    };
  }
  const best = Math.max(0, ...items.map((i) => discountPercent(i.normalPrice, i.offerPrice)));
  const description = `${items.length} offers${best ? `, up to ${best}% off` : ""} at ${store.name}. ${formatValidity(poster.content.validFrom, poster.content.validTo)}`.trim();
  return {
    title: { absolute: `${poster.content.headline || poster.title} – ${store.name}` },
    description,
    openGraph: { title: `${poster.content.headline || poster.title} – ${store.name}`, description, type: "website" },
  };
}

export default function OfferPage({ params }: PageProps<"/o/[slug]">) {
  return (
    <Suspense fallback={<OfferSkeleton />}>
      <Offer params={params} />
    </Suspense>
  );
}

async function Offer({ params }: { params: PageProps<"/o/[slug]">["params"] }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { poster, store, items, ended, activeSlug } = data;
  const { content } = poster;
  const style = normalizeStyle(poster.style);
  const validity = formatValidity(content.validFrom, content.validTo);
  const themeColor = pageColor(style);

  if (ended) {
    return (
      <div className="flex min-h-dvh flex-col bg-gray-50" style={{ colorScheme: "light" }}>
        <StoreHero store={store} color={themeColor} ended />
        <main id="main" className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-10">
          <div className="w-full rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-gray-200 sm:p-9">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
              <CalendarX2 className="size-8" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-950">This Offer Has Expired</h1>
            <p lang="ml" className="font-ml mt-1 text-base font-bold text-red-700">
              ഈ ഓഫറിന്റെ കാലാവധി അവസാനിച്ചു
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              The validity period for <strong className="font-semibold text-gray-900">“{content.headline || poster.title}”</strong>
              {validity ? ` (${validity})` : ""} has ended. Viewing offer products and placing orders for this promotion are closed.
            </p>
            {activeSlug ? (
              <div className="mt-6">
                <Link
                  href={`/o/${activeSlug}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  View Today’s Active Offers
                </Link>
              </div>
            ) : null}
          </div>
        </main>
        <PoweredBy />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50" style={{ colorScheme: "light" }}>
      <StoreHero store={store} color={themeColor}>
        <div className="mx-auto max-w-5xl px-4 pb-6">
          <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">{content.headline || poster.title}</h1>
          {content.headlineMl ? (
            <p lang="ml" className="font-ml text-xl font-bold">
              {content.headlineMl}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {content.subheadline ? <span className="rounded-full bg-white/20 px-3 py-1">{content.subheadline}</span> : null}
            {content.deliveryBadge ? <span className="rounded-full bg-white/20 px-3 py-1 font-semibold">{content.deliveryBadge}</span> : null}
            {validity ? (
              <span className="rounded-full px-3 py-1 font-semibold" style={{ background: style.badgeBg, color: readableOn(style.badgeBg) }}>
                {validity}
              </span>
            ) : null}
            {content.validTo ? <OfferCountdown validTo={content.validTo} /> : null}
          </div>
        </div>
      </StoreHero>

      <main id="main" className="mx-auto max-w-5xl px-4 py-6">
        {items.length === 0 ? (
          <p className="rounded-xl bg-white p-8 text-center text-gray-600 ring-1 ring-gray-200">No products in this offer yet.</p>
        ) : (
          <InteractiveOfferCatalog
            items={items}
            store={store}
            posterTitle={content.headline || poster.title}
            validTo={content.validTo}
            priceColor={style.priceBg}
            badgeColor={style.badgeBg}
            themeColor={themeColor}
          />
        )}
        {content.footerNote ? <p className="mt-6 text-center text-xs text-gray-500">{content.footerNote}</p> : null}
      </main>

      <PoweredBy />
    </div>
  );
}

function OfferSkeleton() {
  return (
    <div className="min-h-dvh bg-gray-50" aria-busy="true">
      <div className="h-56 animate-pulse bg-gray-300" />
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
