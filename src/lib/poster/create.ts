import { addDays, discountPercent, randomId, todayIst } from "../format";
import type { FormatKey, PosterItem, Product, Store } from "../types";
import type { NewPoster } from "../db/repo";
import { FORMATS, applyBrandColors, defaultContent, defaultLayout, getTemplate } from "./templates";

const titleDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/** Builds a new poster from a template, pre-filled with suitable products. */
export function buildPoster(options: {
  templateId: string;
  format?: FormatKey;
  title?: string;
  store: Store;
  products: Product[];
}): NewPoster {
  const template = getTemplate(options.templateId);
  const format = options.format ?? "portrait";
  const today = todayIst();
  const limit = FORMATS[format].maxPerPage;

  let picks: Product[];
  if (template.autoCategory) {
    picks = options.products.filter((p) => p.category === template.autoCategory);
  } else {
    picks = options.products
      .filter((p) => discountPercent(p.normalPrice, p.offerPrice) > 0)
      .sort((a, b) => discountPercent(b.normalPrice, b.offerPrice) - discountPercent(a.normalPrice, a.offerPrice));
  }
  const layout = defaultLayout(format, template);
  const wanted = layout.columns && layout.rows ? layout.columns * layout.rows : layout.columns ? layout.columns * 3 : 9;
  const items: PosterItem[] = picks.slice(0, Math.min(limit, wanted)).map((p) => ({ id: randomId(8), productId: p.id }));

  return {
    title: options.title?.trim() || `${template.name} · ${titleDate.format(new Date())}`,
    templateId: template.id,
    published: false,
    layout,
    style: template.brand ? applyBrandColors(template.style, options.store.colors) : { ...template.style },
    content: defaultContent(template, today, addDays(today, Math.max(0, template.validDays - 1))),
    items,
  };
}
