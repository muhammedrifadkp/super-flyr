"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, useProducts, useStore } from "@/lib/client/api";
import { addDays, discountPercent, todayIst } from "@/lib/format";
import { resolveProductImageUrl } from "@/lib/keralaCatalogue";
import { FORMATS, TEMPLATES, TEMPLATE_CATEGORIES, applyBrandColors, defaultContent, defaultLayout, type TemplateCategory } from "@/lib/poster/templates";
import type { FormatKey, Poster, Product, ResolvedItem } from "@/lib/types";
import { FittedPoster } from "../poster/PosterPreview";
import { useToast } from "../Toast";
import { Skeleton, Spinner, cx } from "../ui";

const SAMPLE: ResolvedItem[] = [
  { name: "Tomato", nameMl: "തക്കാളി", normal: 40, offer: 28, imageUrl: "/poster-assets/products/tomato.png" },
  { name: "Ooty Carrot", nameMl: "കാരറ്റ്", normal: 65, offer: 48, imageUrl: "/poster-assets/products/carrot.png" },
  { name: "Nendran Banana", nameMl: "നേന്ത്രപ്പഴം", normal: 72, offer: 56, imageUrl: "/poster-assets/products/banana.png" },
  { name: "Kashmir Apple", nameMl: "ആപ്പിൾ", normal: 220, offer: 175, imageUrl: "/poster-assets/products/apple.png" },
  { name: "Nestle Milkmaid", nameMl: "മിൽക്ക്മെയ്ഡ്", normal: 152, offer: 135, imageUrl: "/poster-assets/products/milkmaid.png" },
  { name: "Palakkadan Matta Rice", nameMl: "പാലക്കാടൻ മട്ട അരി", normal: 325, offer: 279, imageUrl: "/poster-assets/products/rice-bag.png" },
].map((s, i) => ({
  id: `s${i}`,
  productId: `s${i}`,
  name: s.name,
  nameMl: s.nameMl,
  unit: "kg",
  category: "",
  imageUrl: s.imageUrl,
  normalPrice: s.normal,
  offerPrice: s.offer,
}));

function toResolved(p: Product): ResolvedItem {
  return { ...p, productId: p.id, imageUrl: resolveProductImageUrl(p) };
}

export function NewPosterScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data: store } = useStore();
  const { data: products } = useProducts();
  const [format, setFormat] = useState<FormatKey>("portrait");
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [creating, setCreating] = useState<string | null>(null);
  // Cache Components keeps this page mounted but hidden after navigating to the editor: clear the spinner then.
  useEffect(() => () => setCreating(null), []);

  const previews = useMemo(() => {
    if (!store) return [];
    const today = todayIst();
    return TEMPLATES.filter((t) => category === "all" || t.category === category).map((t) => {
      let picks = (products ?? []).filter((p) => (t.autoCategory ? p.category === t.autoCategory : discountPercent(p.normalPrice, p.offerPrice) > 0));
      if (!picks.length) picks = products ?? [];
      const items = picks.length ? picks.slice(0, 6).map(toResolved) : SAMPLE;
      const poster: Pick<Poster, "id" | "templateId" | "layout" | "style" | "content"> = {
        id: t.id,
        templateId: t.id,
        layout: defaultLayout(format, t),
        style: t.brand ? applyBrandColors(t.style, store.colors) : t.style,
        content: defaultContent(t, today, addDays(today, t.validDays - 1)),
      };
      const count = t.autoCategory ? (products ?? []).filter((p) => p.category === t.autoCategory).length : 0;
      return { template: t, poster, items, count };
    });
  }, [store, products, format, category]);

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

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Template type">
        {[{ id: "all" as const, label: "All templates" }, ...TEMPLATE_CATEGORIES].map((cat) => {
          const count = cat.id === "all" ? TEMPLATES.length : TEMPLATES.filter((t) => t.category === cat.id).length;
          if (!count) return null;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={category === cat.id}
              onClick={() => setCategory(cat.id)}
              className={cx(
                "h-9 shrink-0 rounded-full px-3.5 text-sm font-medium ring-1 transition-colors",
                category === cat.id ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-gray-700 ring-gray-300 hover:ring-gray-400",
              )}
            >
              {cat.label}
              <span className={cx("ml-1.5 tabular text-xs", category === cat.id ? "text-brand-100" : "text-gray-500")}>{count}</span>
            </button>
          );
        })}
      </div>

      {!store ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-5 lg:grid-cols-3">
          {previews.map(({ template, poster, items, count }) => (
            <li key={template.id} className="flex">
              <button
                type="button"
                onClick={() => create(template.id)}
                disabled={creating !== null}
                className="group flex w-full flex-col rounded-2xl bg-white p-2 text-left shadow-sm ring-1 ring-gray-950/5 transition-shadow hover:shadow-md hover:ring-brand-300 active:scale-[0.99] disabled:opacity-70 sm:p-3"
              >
                <div className="relative overflow-hidden rounded-xl bg-gray-100 p-1.5 sm:p-3">
                  <FittedPoster poster={poster} store={store} items={items} page={0} maxHeight={260} />
                  {creating === template.id ? (
                    <span className="absolute inset-0 flex items-center justify-center gap-2 bg-white/75 text-xs font-medium sm:text-sm">
                      <Spinner /> Creating…
                    </span>
                  ) : null}
                </div>
                <div className="px-1 pb-1 pt-2 sm:pt-3">
                  <p className="truncate text-sm font-semibold text-gray-950 sm:text-base">{template.name}</p>
                  <p className="line-clamp-2 text-xs text-gray-600 sm:text-sm">{template.description}</p>
                  {template.autoCategory ? (
                    <p className="mt-1 truncate text-[11px] font-medium text-brand-700 sm:text-xs">
                      {count > 0 ? `Adds your ${count} ${template.autoCategory.toLowerCase()}` : `No ${template.autoCategory.toLowerCase()} in library yet`}
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
