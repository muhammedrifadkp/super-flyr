"use client";

import { Package, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DEMO_PRODUCTS } from "@/lib/defaults";
import { api, useProducts } from "@/lib/client/api";
import { emojiToBlob } from "@/lib/client/image";
import { discountPercent, formatPrice } from "@/lib/format";
import type { Product, ProductInput } from "@/lib/types";
import { useConfirm } from "../Confirm";
import { ProductDialog } from "../ProductDialog";
import { useToast } from "../Toast";
import { Button, EmptyState, IconButton, Input, PageHeader, Skeleton, cx } from "../ui";

export function ProductsScreen() {
  const { data: products, error, mutate, isLoading } = useProducts();
  const toast = useToast();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [editing, setEditing] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [demoProgress, setDemoProgress] = useState<string | null>(null);

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
        setDemoProgress(`Adding demo products… ${index + 1}/${DEMO_PRODUCTS.length}`);
        const imageUrl = await api.upload(await emojiToBlob(demo.emoji), demo.name);
        const { emoji: _emoji, ...rest } = demo;
        void _emoji;
        inputs.push({ ...rest, imageUrl });
      }
      await api.post("/api/products", { products: inputs });
      await mutate();
      toast.success(`${inputs.length} demo products added.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add demo products.");
    } finally {
      setDemoProgress(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <PageHeader
        title="Products"
        description="Your product library. Update prices here and every poster uses the new price."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={openNew}>
            Add product
          </Button>
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
                {demoProgress ?? "Load 20 demo products"}
              </Button>
            </>
          }
        >
          Add products once with photo and prices. Then build posters in seconds.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
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

          <p className="mb-2 text-sm text-gray-600" aria-live="polite">
            {filtered.length} of {products.length} products
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
    </div>
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
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap sm:px-4">
      <div className="checkerboard flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-gray-200">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" width={56} height={56} loading="lazy" className="size-full object-contain p-1" />
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
            "mb-2 w-14 shrink-0 text-center text-xs font-semibold tabular",
            discount > 0 ? "text-red-700" : "text-gray-400",
          )}
        >
          {discount > 0 ? `${discount}% off` : "No offer"}
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
