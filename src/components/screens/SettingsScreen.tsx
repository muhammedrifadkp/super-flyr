"use client";

import { Copy, ExternalLink, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api, useStore } from "@/lib/client/api";
import { useOrigin } from "@/lib/client/useOrigin";
import { STORE_DEMO_PRESETS } from "@/lib/defaults";
import type { BrandColors, Store } from "@/lib/types";
import { ImageUploader, type PendingImage } from "../ImageUploader";
import { useToast } from "../Toast";
import { Button, Card, ColorInput, Field, Input, PageHeader, Skeleton, Textarea } from "../ui";

const PALETTES: Array<{ name: string; colors: BrandColors }> = [
  { name: "Classic red", colors: { primary: "#d71920", secondary: "#fff4d6", accent: "#ffcc00" } },
  { name: "Fresh green", colors: { primary: "#1b7f3b", secondary: "#e8f6ea", accent: "#ffd23f" } },
  { name: "Royal blue", colors: { primary: "#1d4ed8", secondary: "#e8efff", accent: "#ffb703" } },
  { name: "Orange", colors: { primary: "#ea580c", secondary: "#fff1e6", accent: "#16a34a" } },
  { name: "Purple", colors: { primary: "#6d28d9", secondary: "#f2ecff", accent: "#facc15" } },
  { name: "Maroon gold", colors: { primary: "#7a1616", secondary: "#fbf3df", accent: "#c9a227" } },
];

type Draft = Omit<Store, "id" | "updatedAt">;

function toDraft(store: Store): Draft {
  const { id: _id, updatedAt: _u, ...rest } = store;
  void _id;
  void _u;
  return rest;
}

export function SettingsScreen() {
  const { data: store, mutate } = useStore();
  if (!store) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  // Remount with fresh form state whenever the saved store changes.
  return <SettingsForm key={store.updatedAt} store={store} onSaved={(saved) => void mutate(saved, { revalidate: false })} />;
}

function SettingsForm({ store, onSaved }: { store: Store; onSaved: (store: Store) => void }) {
  const toast = useToast();
  const origin = useOrigin();
  const [draft, setDraft] = useState<Draft>(() => toDraft(store));
  const [logo, setLogo] = useState<PendingImage | null | "remove">(null);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const dirty =
    logo !== null || (Object.keys(draft) as Array<keyof Draft>).some((k) => JSON.stringify(draft[k]) !== JSON.stringify(store[k]));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setNameError("Enter your store name.");
      document.querySelector<HTMLInputElement>('input[name="organization"]')?.focus();
      return;
    }
    setNameError(null);
    setSaving(true);
    try {
      const patch: Draft = { ...draft, name: draft.name.trim() };
      if (logo === "remove") patch.logoUrl = "";
      else if (logo) patch.logoUrl = await api.upload(logo.blob, "logo");
      const saved = await api.patch<Store>("/api/store", patch);
      toast.success("Branding saved.");
      onSaved(saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function applyPreset(preset: (typeof STORE_DEMO_PRESETS)[number]) {
    const nextDraft: Draft = {
      ...draft,
      name: preset.name,
      tagline: preset.tagline,
      phone: preset.phone,
      whatsapp: preset.whatsapp,
      address: preset.address,
      colors: preset.colors,
    };
    setDraft(nextDraft);
    setSaving(true);
    try {
      const saved = await api.patch<Store>("/api/store", nextDraft);
      toast.success(`Switched store to ${preset.name}!`);
      onSaved(saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply preset.");
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = `${origin}/`;

  return (
    <form onSubmit={save} noValidate className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <PageHeader
        title="Store branding"
        description="Your logo, colours and contact details appear on every poster and on the public offers page."
        actions={
          <Button variant="primary" type="submit" loading={saving} disabled={!dirty && !saving}>
            Save changes
          </Button>
        }
      />

      <div className="space-y-6">
        <Card className="space-y-3 border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-700" aria-hidden="true" />
            <h2 className="text-sm font-bold text-emerald-950">1-Click Kerala Supermarket Presets</h2>
          </div>
          <p className="text-xs text-emerald-800">
            Instantly load a sample Kerala supermarket profile with realistic contact info & brand colours.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {STORE_DEMO_PRESETS.map((p) => {
              const active = draft.name === p.name;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={saving}
                  onClick={() => void applyPreset(p)}
                  className={
                    active
                      ? "flex flex-col items-start gap-1 rounded-xl bg-white p-3 text-left shadow-sm ring-2 ring-emerald-600"
                      : "flex flex-col items-start gap-1 rounded-xl bg-white/90 p-3 text-left ring-1 ring-emerald-200 transition hover:bg-white hover:ring-emerald-400"
                  }
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-gray-950">{p.label}</span>
                    <span className="flex -space-x-1" aria-hidden="true">
                      {[p.colors.primary, p.colors.accent].map((c) => (
                        <span key={c} className="size-3.5 rounded-full ring-1 ring-white" style={{ background: c }} />
                      ))}
                    </span>
                  </div>
                  <span className="line-clamp-1 text-[11px] text-gray-600">{p.address}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="grid gap-6 p-5 sm:grid-cols-[1fr_14rem]">
          <div className="space-y-4">
            <Field label="Store name" error={nameError ?? undefined}>
              {(p) => (
                <Input
                  {...p}
                  name="organization"
                  autoComplete="organization"
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Fresh Mart Supermarket…"
                  maxLength={80}
                />
              )}
            </Field>
            <Field label="Tagline" hint="Short line under your name.">
              {(p) => (
                <Input
                  {...p}
                  value={draft.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  placeholder="e.g. Fresh • Quality • Savings…"
                  maxLength={120}
                />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone">
                {(p) => (
                  <Input
                    {...p}
                    type="tel"
                    name="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={draft.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="e.g. 0484 123 4567…"
                    maxLength={30}
                  />
                )}
              </Field>
              <Field label="WhatsApp number" hint="With country code, e.g. 919876543210">
                {(p) => (
                  <Input
                    {...p}
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    value={draft.whatsapp}
                    onChange={(e) => set("whatsapp", e.target.value)}
                    placeholder="e.g. 919876543210…"
                    maxLength={30}
                  />
                )}
              </Field>
            </div>
            <Field label="Address">
              {(p) => (
                <Textarea
                  {...p}
                  name="street-address"
                  autoComplete="street-address"
                  rows={2}
                  value={draft.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="e.g. MG Road, Kochi…"
                  maxLength={240}
                />
              )}
            </Field>
            <Field label="Google Maps link" hint="Customers tap it for directions.">
              {(p) => (
                <Input
                  {...p}
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck={false}
                  value={draft.mapUrl}
                  onChange={(e) => set("mapUrl", e.target.value)}
                  placeholder="https://maps.app.goo.gl/…"
                  maxLength={500}
                />
              )}
            </Field>
          </div>
          <ImageUploader label="Logo" currentUrl={store?.logoUrl} onChange={setLogo} removeBgDefault={false} maxSize={800} />
        </Card>

        <Card className="space-y-4 p-5">
          <div>
            <h2 className="text-base font-semibold">Brand colours</h2>
            <p className="text-sm text-gray-600">Used by the “Brand Classic” template and the “Use brand colours” button.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ColorInput label="Main colour" value={draft.colors.primary} onChange={(v) => set("colors", { ...draft.colors, primary: v })} />
            <ColorInput label="Background tint" value={draft.colors.secondary} onChange={(v) => set("colors", { ...draft.colors, secondary: v })} />
            <ColorInput label="Highlight" value={draft.colors.accent} onChange={(v) => set("colors", { ...draft.colors, accent: v })} />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Colour presets">
            {PALETTES.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => set("colors", p.colors)}
                className="flex h-9 items-center gap-2 rounded-full bg-white pl-1.5 pr-3 text-sm ring-1 ring-gray-300 hover:ring-gray-400"
              >
                <span className="flex -space-x-1" aria-hidden="true">
                  {[p.colors.primary, p.colors.secondary, p.colors.accent].map((c) => (
                    <span key={c} className="size-5 rounded-full ring-2 ring-white" style={{ background: c }} />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
          </div>
          <div
            className="flex items-center gap-3 rounded-xl p-4"
            style={{ background: draft.colors.secondary }}
            aria-label="Colour preview"
          >
            <span className="rounded-lg px-3 py-1.5 text-sm font-bold text-white" style={{ background: draft.colors.primary }}>
              {draft.name || "Your store"}
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: draft.colors.accent }}>
              25% OFF
            </span>
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-base font-semibold">Public offers page</h2>
          <p className="text-sm text-gray-600">Share this link with customers. It shows every published poster.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-gray-100 px-3 py-2 text-sm" translate="no">
              {publicUrl}
            </code>
            <Button
              icon={<Copy className="size-4" />}
              onClick={async () => {
                await navigator.clipboard.writeText(publicUrl);
                toast.success("Link copied.");
              }}
            >
              Copy
            </Button>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              Open <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </div>
        </Card>
      </div>
      {dirty ? (
        <div className="sticky bottom-20 z-20 mt-6 flex items-center justify-between gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg md:bottom-4">
          <span>You have unsaved changes.</span>
          <Button variant="primary" type="submit" loading={saving}>
            Save changes
          </Button>
        </div>
      ) : null}
    </form>
  );
}
