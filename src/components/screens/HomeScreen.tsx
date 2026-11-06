"use client";

import { ArrowRight, ExternalLink, Globe, ImagePlus, Package, Palette, Plus, ShoppingBag, Sparkles, Tv } from "lucide-react";
import Link from "next/link";
import { usePosters, useProducts, useStore } from "@/lib/client/api";
import { discountPercent } from "@/lib/format";
import { PosterThumb } from "../poster/PosterThumb";
import { ButtonLink, Card, Skeleton } from "../ui";

export function HomeScreen() {
  const { data: store } = useStore();
  const { data: products } = useProducts();
  const { data: posters } = usePosters();

  const onOffer = products?.filter((p) => discountPercent(p.normalPrice, p.offerPrice) > 0).length ?? 0;
  const published = posters?.filter((p) => p.published).length ?? 0;
  const brandingDone = Boolean(store && (store.logoUrl || store.name !== "My Supermarket"));

  const steps = [
    { done: brandingDone, label: "Add your logo & store name", href: "/dashboard/settings", icon: Palette },
    { done: (products?.length ?? 0) > 0, label: "Add products with prices", href: "/dashboard/products", icon: Package },
    { done: (posters?.length ?? 0) > 0, label: "Create your first poster", href: "/dashboard/posters/new", icon: ImagePlus },
    { done: published > 0, label: "Publish & share the offer link", href: "/dashboard/posters", icon: Globe },
  ];
  const allDone = steps.every((s) => s.done);
  const loading = !store || !products || !posters;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-600">Welcome back</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-950">{store?.name ?? " "}</h1>
        </div>
        <ButtonLink href="/dashboard/posters/new" variant="primary" size="lg" icon={<Plus className="size-5" />}>
          New poster
        </ButtonLink>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <Stat label="Products" value={products?.length} href="/dashboard/products" />
        <Stat label="On offer" value={products ? onOffer : undefined} href="/dashboard/products" />
        <Stat label="Published" value={posters ? published : undefined} href="/dashboard/posters" />
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="group flex items-start gap-3 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-4 text-white shadow-sm transition hover:shadow-md"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <ShoppingBag className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <span>WhatsApp Mini-Store</span>
              <ExternalLink className="size-3.5 opacity-80" aria-hidden="true" />
            </div>
            <p className="mt-0.5 text-xs text-emerald-100">
              Live customer storefront with +Add cart & direct WhatsApp order checkout
            </p>
          </div>
        </a>

        <a
          href="/tv"
          target="_blank"
          rel="noreferrer"
          className="group flex items-start gap-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-sm transition hover:shadow-md"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300">
            <Tv className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <span>Smart TV Live Display</span>
              <ExternalLink className="size-3.5 opacity-80" aria-hidden="true" />
            </div>
            <p className="mt-0.5 text-xs text-slate-300">
              Full-screen 16:9 auto-rotating offer slides & QR code for in-store TVs
            </p>
          </div>
        </a>

        <Link
          href="/dashboard/products"
          className="group flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-950/5 transition hover:shadow-md"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-950">
              <span>Kerala Catalogue & Rate Board</span>
              <ArrowRight className="size-3.5 text-gray-400 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
            <p className="mt-0.5 text-xs text-gray-600">
              45+ ready Kerala items, Auto മലയാളം typing, CSV import & 1-click Rate Poster
            </p>
          </div>
        </Link>
      </section>

      {!loading && !allDone ? (
        <Card className="mt-6 p-5">
          <h2 className="text-base font-semibold">Get set up</h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {steps.map((step, i) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className="flex h-full items-center gap-3 rounded-lg p-3 ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
                >
                  <span
                    className={
                      step.done
                        ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
                        : "flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700"
                    }
                  >
                    {step.done ? "✓" : i + 1}
                  </span>
                  <span className={step.done ? "text-sm text-gray-500 line-through" : "text-sm font-medium text-gray-900"}>{step.label}</span>
                  <span className="sr-only">{step.done ? "(done)" : ""}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent posters</h2>
          <Link href="/dashboard/posters" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            All posters <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {!posters ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/5]" />
            ))}
          </div>
        ) : posters.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
            No posters yet.{" "}
            <Link href="/dashboard/posters/new" className="font-medium text-brand-700 underline">
              Create one
            </Link>
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {posters.slice(0, 4).map((poster) => (
              <li key={poster.id}>
                <Link
                  href={`/dashboard/posters/${poster.id}`}
                  className="block overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5 transition-shadow hover:shadow-md"
                >
                  <div className="bg-gray-100 p-3">
                    <PosterThumb poster={poster} store={store} products={products} maxHeight={192} />
                  </div>
                  <p className="truncate px-3 py-2.5 text-sm font-medium text-gray-900">{poster.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value?: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-950/5 transition-shadow hover:shadow-md sm:p-4">
      <p className="truncate text-xs text-gray-600 sm:text-sm">{label}</p>
      <div className="mt-1 text-2xl font-semibold tabular text-gray-950 sm:text-3xl">{value ?? <Skeleton className="mt-1 h-7 w-10 sm:h-8 sm:w-12" />}</div>
    </Link>
  );
}
