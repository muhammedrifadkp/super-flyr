"use client";

import { useRef, useState, type FormEvent } from "react";
import { DEFAULT_CATEGORIES, DEFAULT_UNITS } from "@/lib/defaults";
import { api } from "@/lib/client/api";
import { discountPercent } from "@/lib/format";
import type { Product, ProductInput } from "@/lib/types";
import { Dialog } from "./Dialog";
import { ImageUploader, type PendingImage } from "./ImageUploader";
import { Button, Field, Input } from "./ui";

type Errors = Partial<Record<keyof ProductInput, string>>;

function validate(values: ProductInput): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Enter the product name.";
  if (!values.category.trim()) errors.category = "Choose or type a category.";
  if (!Number.isFinite(values.normalPrice) || values.normalPrice < 0) errors.normalPrice = "Enter a valid price, e.g. 40";
  if (!Number.isFinite(values.offerPrice) || values.offerPrice < 0) errors.offerPrice = "Enter a valid price, e.g. 29";
  return errors;
}

function parsePrice(value: FormDataEntryValue | null): number {
  const text = String(value ?? "").replace(/[₹,\s]/g, "");
  return text === "" ? NaN : Number(text);
}

export function ProductDialog({
  open,
  product,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: Product | null;
  categories: string[];
  onClose: () => void;
  onSaved: (product: Product, created: boolean) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [image, setImage] = useState<PendingImage | null | "remove">(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // The parent remounts this dialog (via `key`) each time it opens, so initial state is fresh.
  const [prices, setPrices] = useState(() => ({
    normal: product ? String(product.normalPrice) : "",
    offer: product ? String(product.offerPrice) : "",
  }));

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]));
  const discount = discountPercent(Number(prices.normal), Number(prices.offer));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values: ProductInput = {
      name: String(form.get("name") ?? "").trim(),
      nameMl: String(form.get("nameMl") ?? "").trim(),
      category: String(form.get("category") ?? "").trim(),
      unit: String(form.get("unit") ?? "").trim(),
      normalPrice: parsePrice(form.get("normalPrice")),
      offerPrice: parsePrice(form.get("offerPrice")),
      imageUrl: product?.imageUrl ?? "",
    };
    const found = validate(values);
    setErrors(found);
    const firstError = Object.keys(found)[0];
    if (firstError) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      if (image === "remove") values.imageUrl = "";
      else if (image) values.imageUrl = await api.upload(image.blob, values.name);
      const saved = product
        ? await api.patch<Product>(`/api/products/${product.id}`, values)
        : await api.post<Product>("/api/products", values);
      onSaved(saved, !product);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={product ? "Edit product" : "Add product"}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="product-form" loading={saving}>
            {product ? "Save changes" : "Add product"}
          </Button>
        </>
      }
    >
      <form id="product-form" ref={formRef} onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-[1fr_15rem]">
        <div className="space-y-4">
          <Field label="Product name" error={errors.name}>
            {(p) => (
              <Input
                {...p}
                name="name"
                defaultValue={product?.name}
                placeholder="e.g. Tomato…"
                autoComplete="off"
                maxLength={80}
                autoFocus
              />
            )}
          </Field>
          <Field label="Malayalam name" hint="Optional. Shown under the English name.">
            {(p) => (
              <Input
                {...p}
                name="nameMl"
                defaultValue={product?.nameMl}
                placeholder="e.g. തക്കാളി…"
                autoComplete="off"
                lang="ml"
                maxLength={80}
                className="font-ml"
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" error={errors.category}>
              {(p) => (
                <>
                  <Input
                    {...p}
                    name="category"
                    list="category-options"
                    defaultValue={product?.category ?? "Vegetables"}
                    placeholder="e.g. Vegetables…"
                    autoComplete="off"
                    maxLength={40}
                  />
                  <datalist id="category-options">
                    {allCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
            <Field label="Unit" hint="kg, pcs, 500 g…">
              {(p) => (
                <>
                  <Input
                    {...p}
                    name="unit"
                    list="unit-options"
                    defaultValue={product?.unit ?? "kg"}
                    placeholder="e.g. kg…"
                    autoComplete="off"
                    maxLength={20}
                  />
                  <datalist id="unit-options">
                    {DEFAULT_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Normal price (MRP)" error={errors.normalPrice}>
              {(p) => (
                <Input
                  {...p}
                  name="normalPrice"
                  inputMode="decimal"
                  value={prices.normal}
                  onChange={(e) => setPrices((v) => ({ ...v, normal: e.target.value }))}
                  placeholder="₹ 40…"
                  autoComplete="off"
                  className="tabular"
                />
              )}
            </Field>
            <Field
              label="Offer price"
              error={errors.offerPrice}
              hint={discount > 0 ? `${discount}% off` : "Same as MRP = no discount badge"}
            >
              {(p) => (
                <Input
                  {...p}
                  name="offerPrice"
                  inputMode="decimal"
                  value={prices.offer}
                  onChange={(e) => setPrices((v) => ({ ...v, offer: e.target.value }))}
                  placeholder="₹ 29…"
                  autoComplete="off"
                  className="tabular"
                />
              )}
            </Field>
          </div>
          {serverError ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              {serverError}
            </p>
          ) : null}
        </div>
        <ImageUploader currentUrl={product?.imageUrl} onChange={setImage} />
      </form>
    </Dialog>
  );
}
