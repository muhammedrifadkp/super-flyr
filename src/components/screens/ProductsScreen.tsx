"use client";

import { Check, Download, FileSpreadsheet, ImagePlus, Package, Pencil, Plus, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { DEMO_PRODUCTS } from "@/lib/defaults";
import { api, useProducts } from "@/lib/client/api";
import { emojiToBlob } from "@/lib/client/image";
import { discountPercent, formatPrice, randomId } from "@/lib/format";
import { KERALA_MASTER_CATALOGUE, lookupMalayalamName, matchStudioProductUrl, resolveProductImageUrl, type MasterCatalogueItem } from "@/lib/keralaCatalogue";
import type { Poster, Product, ProductInput } from "@/lib/types";
import { useConfirm } from "../Confirm";
import { Dialog } from "../Dialog";
import { ProductDialog } from "../ProductDialog";
import { useToast } from "../Toast";
import { Button, EmptyState, IconButton, Input, PageHeader, Skeleton, cx } from "../ui";

export function ProductsScreen() {
  const { data: products, error, mutate, isLoading } = useProducts();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [editing, setEditing] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [masterOpen, setMasterOpen] = useState(false);
  const [demoProgress, setDemoProgress] = useState<string | null>(null);
  const [creatingPoster, setCreatingPoster] = useState(false);

  const categories = useMemo(() => Array.from(new Set((products ?? []).map((p) => p.category))).sort(), [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.nameMl.includes(q) || p.category.toLowerCase().includes(q)),
    );
  }, [products, query, category]);

  function openDialog(product: Product | null) {
    setEditing(product);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openNew() {
    openDialog(null);
  }

  async function updatePrice(product: Product, field: "normalPrice" | "offerPrice", raw: string) {
    const value = Number(raw.replace(/[₹,\s]/g, ""));
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid price, e.g. 29");
      return false;
    }
    if (value === product[field]) return true;
    const optimistic = (products ?? []).map((p) => (p.id === product.id ? { ...p, [field]: value } : p));
    try {
      await mutate(
        async () => {
          const saved = await api.patch<Product>(`/api/products/${product.id}`, { [field]: value });
          return optimistic.map((p) => (p.id === saved.id ? saved : p));
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false },
      );
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update price.");
      return false;
    }
  }

  async function remove(product: Product) {
    const ok = await confirm({
      title: `Delete “${product.name}”?`,
      message: "It will also disappear from posters that use it. This can’t be undone.",
      confirmLabel: "Delete product",
      danger: true,
    });
    if (!ok) return;
    try {
      await mutate(
        async () => {
          await api.delete(`/api/products/${product.id}`);
          return (products ?? []).filter((p) => p.id !== product.id);
        },
        { optimisticData: (products ?? []).filter((p) => p.id !== product.id), rollbackOnError: true, revalidate: false },
      );
      toast.success(`${product.name} deleted.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete.");
    }
  }

  async function loadDemo() {
    try {
      const inputs: ProductInput[] = [];
      for (const [index, demo] of DEMO_PRODUCTS.entries()) {
        setDemoProgress(`Adding Kerala demo products… ${index + 1}/${DEMO_PRODUCTS.length}`);
        const imageUrl = demo.imageUrl || (await api.upload(await emojiToBlob(demo.emoji, 520, demo.accent), demo.name));
        const { emoji: _emoji, accent: _accent, ...rest } = demo;
        void _emoji;
        void _accent;
        inputs.push({ ...rest, imageUrl });
      }
      await api.post("/api/products", { products: inputs });
      await mutate();
      toast.success(`${inputs.length} Kerala supermarket products added.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add demo products.");
    } finally {
      setDemoProgress(null);
    }
  }

  async function createPosterFromFiltered() {
    if (!filtered.length) return;
    setCreatingPoster(true);
    try {
      const templateId =
        category === "Vegetables"
          ? "green-fresh-deals"
          : category === "Fruits"
            ? "paper-fresh-deals"
            : category === "Meat & Fish"
              ? "fish-meat-catch"
              : "daily-deals";
      const title = category === "All" ? "Today's Special Offers" : `Today's ${category} Rates`;
      const created = await api.post<Poster>("/api/posters", { templateId, title });
      const items = filtered.slice(0, 24).map((p) => ({ id: randomId(8), productId: p.id }));
      await api.patch<Poster>(`/api/posters/${created.id}`, { items });
      router.push(`/dashboard/posters/${created.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create poster.");
      setCreatingPoster(false);
    }
  }

  function exportCsv() {
    if (!products?.length) return;
    const escapeCsv = (val: string | number) => {
      const s = String(val ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = "Name,Malayalam Name,Category,Unit,MRP,Offer Price";
    const rows = products.map((p) => [p.name, p.nameMl, p.category, p.unit, p.normalPrice, p.offerPrice].map(escapeCsv).join(","));
    // Include UTF-8 BOM so Microsoft Excel opens Malayalam script properly
    const blob = new Blob([`\uFEFF${[header, ...rows].join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "supermarket-products.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${products.length} products to CSV.`);
  }

  async function handleCsvUpload(file: File) {
    try {
      const text = await file.text();
      const lines = text
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        toast.error("CSV file is empty or missing rows.");
        return;
      }
      const parseLine = (line: string) => {
        const cols: string[] = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === "," && !inQuotes) {
            cols.push(cur.trim());
            cur = "";
          } else {
            cur += ch;
          }
        }
        cols.push(cur.trim());
        return cols;
      };

      const parsed: ProductInput[] = [];
      for (let i = 1; i < lines.length && parsed.length < 200; i++) {
        const cols = parseLine(lines[i]);
        const name = (cols[0] ?? "").slice(0, 80);
        if (!name) continue;
        const rawMl = (cols[1] ?? "").slice(0, 80);
        const nameMl = rawMl || lookupMalayalamName(name) || "";
        const cat = (cols[2] || "Grocery").slice(0, 40);
        const unit = (cols[3] || "pcs").slice(0, 20);
        const mrp = Math.max(0, Number((cols[4] ?? "0").replace(/[₹,\s]/g, "")) || 0);
        const offer = Math.max(0, Number((cols[5] ?? String(mrp)).replace(/[₹,\s]/g, "")) || mrp);
        parsed.push({ name, nameMl, category: cat, unit, normalPrice: mrp, offerPrice: offer, imageUrl: matchStudioProductUrl(name, nameMl) ?? "" });
      }
      if (!parsed.length) {
        toast.error("No valid product rows found in CSV.");
        return;
      }
      await api.post("/api/products", { products: parsed });
      await mutate();
      toast.success(`Imported ${parsed.length} products from CSV.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "CSV import failed.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <PageHeader
        title="Products & Daily Rates"
        description="Your supermarket product library. Update prices inline here and every poster & TV screen updates automatically."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={<Sparkles className="size-4 text-brand-600" />} onClick={() => setMasterOpen(true)}>
              Kerala Catalogue
            </Button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCsvUpload(f);
                e.target.value = "";
              }}
            />
            <Button icon={<Upload className="size-4" />} onClick={() => csvInputRef.current?.click()}>
              Import CSV
            </Button>
            {products?.length ? (
              <Button icon={<Download className="size-4" />} onClick={exportCsv}>
                Export CSV
              </Button>
            ) : null}
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={openNew}>
              Add product
            </Button>
          </div>
        }
      />

      {error ? (
        <EmptyState title="Couldn’t load products" action={<Button onClick={() => mutate()}>Try again</Button>}>
          {error.message}
        </EmptyState>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[72px]" />
          ))}
        </div>
      ) : !products?.length ? (
        <EmptyState
          icon={<Package className="size-10" />}
          title="No products yet"
          action={
            <>
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={openNew}>
                Add your first product
              </Button>
              <Button icon={<Sparkles className="size-4" />} onClick={loadDemo} loading={demoProgress !== null}>
                {demoProgress ?? `Load ${DEMO_PRODUCTS.length} Kerala Demo Products`}
              </Button>
              <Button icon={<FileSpreadsheet className="size-4" />} onClick={() => setMasterOpen(true)}>
                Browse 46+ Kerala Items
              </Button>
            </>
          }
        >
          Add products once with photo and Malayalam names, or pick from the ready-made Kerala Supermarket Catalogue.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search English or മലയാളം…"
                  aria-label="Search products"
                  className="pl-9"
                />
              </div>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filter by category">
                {["All", ...categories].map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                    className={cx(
                      "h-9 shrink-0 rounded-full px-3.5 text-sm font-medium ring-1 transition-colors",
                      category === c ? "bg-gray-900 text-white ring-gray-900" : "bg-white text-gray-700 ring-gray-300 hover:ring-gray-400",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length > 0 ? (
              <Button
                size="sm"
                icon={<ImagePlus className="size-4 text-brand-700" />}
                onClick={createPosterFromFiltered}
                loading={creatingPoster}
              >
                {category === "All" ? `Make Poster (${Math.min(24, filtered.length)})` : `Make ${category} Rate Poster`}
              </Button>
            ) : null}
          </div>

          <p className="mb-2 text-sm text-gray-600" aria-live="polite">
            {filtered.length} of {products.length} products · <span className="text-xs text-gray-500">Tip: Edit MRP or Offer price directly below and press Enter</span>
          </p>

          {filtered.length === 0 ? (
            <EmptyState title="No matching products" action={<Button onClick={() => (setQuery(""), setCategory("All"))}>Clear filters</Button>}>
              Try another name or category.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5">
              {filtered.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onEdit={() => openDialog(product)}
                  onDelete={() => remove(product)}
                  onPrice={(field, value) => updatePrice(product, field, value)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <ProductDialog
        key={dialogKey}
        open={dialogOpen}
        product={editing}
        categories={categories}
        onClose={() => setDialogOpen(false)}
        onSaved={(saved, created) => {
          setDialogOpen(false);
          void mutate(
            (list = []) => (created ? [...list, saved] : list.map((p) => (p.id === saved.id ? saved : p))).sort((a, b) => a.name.localeCompare(b.name)),
            { revalidate: false },
          );
          toast.success(created ? `${saved.name} added.` : `${saved.name} saved.`);
        }}
      />

      <KeralaMasterCatalogueDialog
        open={masterOpen}
        existingNames={new Set((products ?? []).map((p) => p.name.toLowerCase()))}
        onClose={() => setMasterOpen(false)}
        onAdded={async () => {
          setMasterOpen(false);
          await mutate();
        }}
      />
    </div>
  );
}

function KeralaMasterCatalogueDialog({
  open,
  existingNames,
  onClose,
  onAdded,
}: {
  open: boolean;
  existingNames: Set<string>;
  onClose: () => void;
  onAdded: () => Promise<void>;
}) {
  const toast = useToast();
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  const categories = useMemo(() => ["All", ...Array.from(new Set(KERALA_MASTER_CATALOGUE.map((i) => i.category)))], []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return KERALA_MASTER_CATALOGUE.filter(
      (item) =>
        (cat === "All" || item.category === cat) &&
        (!q ||
          item.name.toLowerCase().includes(q) ||
          item.nameMl.includes(q) ||
          item.manglish.some((m) => m.includes(q))),
    );
  }, [cat, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of visible) {
        if (!existingNames.has(item.name.toLowerCase())) next.add(item.id);
      }
      return next;
    });
  }

  async function importSelected() {
    const picks: MasterCatalogueItem[] = KERALA_MASTER_CATALOGUE.filter((i) => selected.has(i.id));
    if (!picks.length) return;
    try {
      const inputs: ProductInput[] = [];
      for (const [idx, item] of picks.entries()) {
        setAdding(`Adding ${idx + 1}/${picks.length}…`);
        const imageUrl = item.imageUrl || (await api.upload(await emojiToBlob(item.emoji, 520, item.accent), item.name));
        inputs.push({
          name: item.name,
          nameMl: item.nameMl,
          category: item.category,
          unit: item.unit,
          normalPrice: item.normalPrice,
          offerPrice: item.offerPrice,
          imageUrl,
        });
      }
      await api.post("/api/products", { products: inputs });
      setSelected(new Set());
      toast.success(`${inputs.length} products added to your library.`);
      await onAdded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add items.");
    } finally {
      setAdding(null);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Kerala Supermarket Master Catalogue"
      description="Pre-loaded Malayalam & English items with ready studio illustrations and standard Kerala prices."
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={importSelected} loading={adding !== null} disabled={selected.size === 0}>
            {adding ?? `Add ${selected.size} Selected Products`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search e.g. Matta, Mathi, Savala, Milma…"
            className="sm:w-72"
          />
          <Button size="sm" variant="ghost" onClick={selectAllVisible}>
            Select all in view
          </Button>
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cx(
                "h-8 shrink-0 rounded-full px-3 text-xs font-medium ring-1 transition-colors",
                cat === c ? "bg-gray-900 text-white ring-gray-900" : "bg-white text-gray-700 ring-gray-300 hover:ring-gray-400",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <ul className="grid max-h-[22rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {visible.map((item) => {
            const alreadyInStore = existingNames.has(item.name.toLowerCase());
            const isSelected = selected.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-xl p-2.5 text-left ring-1 transition-colors",
                    isSelected ? "bg-brand-50 ring-2 ring-brand-600" : "bg-white ring-gray-200 hover:ring-gray-300",
                  )}
                >
                  <span className="checkerboard flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 text-2xl ring-1 ring-gray-200/80">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" width={44} height={44} loading="lazy" className="size-full object-contain p-1" />
                    ) : (
                      item.emoji
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-950">
                      {item.name}
                      {alreadyInStore ? (
                        <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">Added</span>
                      ) : null}
                    </p>
                    <p lang="ml" className="font-ml truncate text-xs text-gray-600">
                      {item.nameMl} · {formatPrice(item.offerPrice)}/{item.unit}
                    </p>
                  </div>
                  <span
                    className={cx(
                      "flex size-7 shrink-0 items-center justify-center rounded-full",
                      isSelected ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {isSelected ? <Check className="size-4" /> : <Plus className="size-4" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}

function ProductRow({
  product,
  onEdit,
  onDelete,
  onPrice,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onPrice: (field: "normalPrice" | "offerPrice", value: string) => Promise<boolean>;
}) {
  const discount = discountPercent(product.normalPrice, product.offerPrice);
  const save = Math.max(0, Math.round(product.normalPrice - product.offerPrice));
  const resolvedImageUrl = resolveProductImageUrl(product);
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap sm:px-4">
      <div className="checkerboard flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-gray-200">
        {resolvedImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolvedImageUrl} alt="" width={56} height={56} loading="lazy" className="size-full object-contain p-1" />
        ) : (
          <Package className="size-6 text-gray-300" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-950">{product.name}</p>
        <p className="truncate text-sm text-gray-600">
          {product.nameMl ? (
            <span lang="ml" className="font-ml">
              {product.nameMl} ·{" "}
            </span>
          ) : null}
          {product.category}
          {product.unit ? ` · ${product.unit}` : ""}
        </p>
      </div>
      <div className="flex w-full items-end gap-2 sm:w-auto">
        <PriceInput label="MRP" value={product.normalPrice} onCommit={(v) => onPrice("normalPrice", v)} />
        <PriceInput label="Offer" value={product.offerPrice} onCommit={(v) => onPrice("offerPrice", v)} strong />
        <span
          className={cx(
            "mb-1.5 w-16 shrink-0 text-center text-xs font-semibold tabular leading-tight",
            discount > 0 ? "text-red-700" : "text-gray-400",
          )}
        >
          {discount > 0 ? (
            <>
              {discount}% off
              <span className="block text-[10px] font-medium text-emerald-700">Save ₹{save}</span>
            </>
          ) : (
            "No offer"
          )}
        </span>
        <div className="ml-auto flex sm:ml-0">
          <IconButton label={`Edit ${product.name}`} onClick={onEdit}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton label={`Delete ${product.name}`} onClick={onDelete} className="hover:bg-red-50 hover:text-red-700">
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
    </li>
  );
}

/** Quick price edit: saves on Enter or when leaving the field. */
function PriceInput({
  label,
  value,
  onCommit,
  strong,
}: {
  label: string;
  value: number;
  onCommit: (value: string) => Promise<boolean>;
  strong?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);

  async function commit() {
    if (draft === null) return;
    const ok = await onCommit(draft);
    if (ok) setDraft(null);
  }

  return (
    <label className="block w-24">
      <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">₹</span>
        <input
          inputMode="decimal"
          value={shown}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setDraft(null);
          }}
          aria-label={`${label} price`}
          title={formatPrice(value)}
          className={cx(
            "h-9 w-full rounded-lg border-0 bg-white pl-6 pr-2 text-base tabular ring-1 ring-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-600 sm:text-sm",
            strong && "font-semibold text-gray-950",
            draft !== null && "ring-amber-400",
          )}
        />
      </span>
    </label>
  );
}
