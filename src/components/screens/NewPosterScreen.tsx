"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api, useProducts, useStore } from "@/lib/client/api";
import { addDays, discountPercent, todayIst } from "@/lib/format";
import { FORMATS, TEMPLATES, applyBrandColors, defaultContent, defaultLayout } from "@/lib/poster/templates";
import type { FormatKey, Poster, Product, ResolvedItem } from "@/lib/types";
import { FittedPoster } from "../poster/PosterPreview";
import { useToast } from "../Toast";
import { Skeleton, Spinner, cx } from "../ui";

const SAMPLE: ResolvedItem[] = [
  { name: "Tomato", nameMl: "തക്കാളി", normal: 40, offer: 29 },
  { name: "Carrot", nameMl: "കാരറ്റ്", normal: 60, offer: 45 },
  { name: "Banana", nameMl: "പഴം", normal: 70, offer: 55 },
  { name: "Apple", nameMl: "ആപ്പിൾ", normal: 220, offer: 179 },
  { name: "Milk", nameMl: "പാൽ", normal: 56, offer: 52 },
  { name: "Rice", nameMl: "അരി", normal: 320, offer: 285 },
].map((s, i) => ({
  id: `s${i}`,
  productId: `s${i}`,
  name: s.name,
  nameMl: s.nameMl,
  unit: "kg",
  category: "",
  imageUrl: "",
  normalPrice: s.normal,
  offerPrice: s.offer,
}));

function toResolved(p: Product): ResolvedItem {
  return { ...p, productId: p.id };
}

export function NewPosterScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: store } = useStore();
  const { data: products } = useProducts();
  const [format, setFormat] = useState<FormatKey>("portrait");
  const [creating, setCreating] = useState<string | null>(null);

  const previews = useMemo(() => {
    if (!store) return [];
    const today = todayIst();
    return TEMPLATES.map((t) => {
      let picks = (products ?? []).filter((p) => (t.autoCategory ? p.category === t.autoCategory : discountPercent(p.normalPrice, p.offerPrice) > 0));
      if (!picks.length) picks = products ?? [];
      const items = picks.length ? picks.slice(0, 6).map(toResolved) : SAMPLE;
      const poster: Pick<Poster, "id" | "layout" | "style" | "content"> = {
        id: t.id,
        layout: defaultLayout(format),
        style: t.brand ? applyBrandColors(t.style, store.colors) : t.style,
        content: defaultContent(t, today, addDays(today, t.validDays - 1)),
      };
      const count = t.autoCategory ? (products ?? []).filter((p) => p.category === t.autoCategory).length : 0;
      return { template: t, poster, items, count };
    });
  }, [store, products, format]);

  async function create(templateId: string) {
    setCreating(templateId);
    try {
      const poster = await api.post<Poster>("/api/posters", { templateId, format });
      router.push(`/dashboard/posters/${poster.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create poster.");
      setCreating(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <Link href="/dashboard/posters" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-950">
        <ArrowLeft className="size-4" aria-hidden="true" /> Posters
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Choose a template</h1>
      <p className="mt-1 text-sm text-gray-600">Everything can be changed later: products, colours, fonts and size.</p>

      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Poster size">
        {(Object.keys(FORMATS) as FormatKey[]).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={format === key}
            onClick={() => setFormat(key)}
            className={cx(
              "h-9 shrink-0 rounded-full px-3.5 text-sm font-medium ring-1",
              format === key ? "bg-gray-900 text-white ring-gray-900" : "bg-white text-gray-700 ring-gray-300 hover:ring-gray-400",
            )}
          >
            {FORMATS[key].label}
            <span className={cx("ml-1.5 text-xs", format === key ? "text-gray-300" : "text-gray-500")}>{FORMATS[key].hint}</span>
          </button>
        ))}
      </div>

      {!store ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {previews.map(({ template, poster, items, count }) => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => create(template.id)}
                disabled={creating !== null}
                className="group block w-full rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-gray-950/5 transition-shadow hover:shadow-md hover:ring-brand-300 disabled:opacity-70"
              >
                <div className="relative overflow-hidden rounded-xl bg-gray-100 p-3">
                  <FittedPoster poster={poster} store={store} items={items} page={0} maxHeight={340} />
                  {creating === template.id ? (
                    <span className="absolute inset-0 flex items-center justify-center gap-2 bg-white/70 text-sm font-medium">
                      <Spinner /> Creating…
                    </span>
                  ) : null}
                </div>
                <div className="px-1 pb-1 pt-3">
                  <p className="font-semibold text-gray-950">{template.name}</p>
                  <p className="text-sm text-gray-600">{template.description}</p>
                  {template.autoCategory ? (
                    <p className="mt-1 text-xs font-medium text-brand-700">
                      {count > 0 ? `Adds your ${count} ${template.autoCategory.toLowerCase()}` : `No ${template.autoCategory.toLowerCase()} in your library yet`}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
