"use client";

import { Copy, CopyPlus, Download, Globe, ImagePlus, MoreVertical, Plus, QrCode, Trash2, Tv } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, usePosters, useProducts, useStore } from "@/lib/client/api";
import { downloadBlob } from "@/lib/client/export";
import { useOrigin } from "@/lib/client/useOrigin";
import { formatValidity, isExpired, slugify } from "@/lib/format";
import { renderQrCardPng } from "@/lib/poster/qr";
import type { Poster, Product, Store } from "@/lib/types";
import { useConfirm } from "../Confirm";
import { Dialog } from "../Dialog";
import { PublicQrSvg } from "../poster/EditorDialogs";
import { PosterThumb } from "../poster/PosterThumb";
import { useToast } from "../Toast";
import { Button, ButtonLink, EmptyState, IconButton, PageHeader, Skeleton, cx } from "../ui";

const updatedFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function PostersScreen() {
  const { data: posters, error, isLoading, mutate } = usePosters();
  const { data: store } = useStore();
  const { data: products } = useProducts();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const origin = useOrigin();
  const [qrPoster, setQrPoster] = useState<Poster | null>(null);
  const [downloadingQr, setDownloadingQr] = useState(false);

  async function duplicate(poster: Poster) {
    try {
      const copy = await api.post<Poster>(`/api/posters/${poster.id}/duplicate`);
      await mutate();
      router.push(`/dashboard/posters/${copy.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not duplicate.");
    }
  }

  async function remove(poster: Poster) {
    const ok = await confirm({
      title: `Delete “${poster.title}”?`,
      message: poster.published ? "Its public link will stop working. This can’t be undone." : "This can’t be undone.",
      confirmLabel: "Delete poster",
      danger: true,
    });
    if (!ok) return;
    try {
      await mutate(
        async () => {
          await api.delete(`/api/posters/${poster.id}`);
          return (posters ?? []).filter((p) => p.id !== poster.id);
        },
        { optimisticData: (posters ?? []).filter((p) => p.id !== poster.id), rollbackOnError: true, revalidate: false },
      );
      toast.success("Poster deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete.");
    }
  }

  async function toggleTv(poster: Poster) {
    const nextVal = !poster.content.showOnTv;
    const nextContent = { ...poster.content, showOnTv: nextVal };
    const optimistic = (posters ?? []).map((p) => (p.id === poster.id ? { ...p, content: nextContent } : p));
    try {
      await mutate(
        async () => {
          await api.patch(`/api/posters/${poster.id}`, { content: nextContent });
          return optimistic;
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false },
      );
      toast.success(nextVal ? `“${poster.title}” added to Shop TV display.` : `“${poster.title}” removed from Shop TV display.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update TV setting.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <PageHeader
        title="Posters"
        description="Create, edit and share your offer posters."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/tv"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
            >
              <Tv className="size-4 text-emerald-400" aria-hidden="true" />
              TV Display
            </a>
            <ButtonLink href="/dashboard/posters/new" variant="primary" icon={<Plus className="size-4" />}>
              New poster
            </ButtonLink>
          </div>
        }
      />
      {error ? (
        <EmptyState title="Couldn’t load posters" action={<Button onClick={() => mutate()}>Try again</Button>}>
          {error.message}
        </EmptyState>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5]" />
          ))}
        </div>
      ) : !posters?.length ? (
        <EmptyState
          icon={<ImagePlus className="size-10" />}
          title="No posters yet"
          action={
            <ButtonLink href="/dashboard/posters/new" variant="primary" icon={<Plus className="size-4" />}>
              Create your first poster
            </ButtonLink>
          }
        >
          Pick a template, add products, download or share. It takes about a minute.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {posters.map((poster) => (
            <PosterCard
              key={poster.id}
              poster={poster}
              store={store}
              products={products}
              onDuplicate={() => duplicate(poster)}
              onDelete={() => remove(poster)}
              onCopyLink={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/o/${poster.slug}`);
                toast.success("Public link copied.");
              }}
              onShowQr={() => setQrPoster(poster)}
              onToggleTv={() => void toggleTv(poster)}
            />
          ))}
        </ul>
      )}
      {qrPoster ? (
        <Dialog
          open={Boolean(qrPoster)}
          onClose={() => setQrPoster(null)}
          title={qrPoster.title}
          description="Customers can scan this QR code to view today's offers & order on WhatsApp."
          footer={<Button onClick={() => setQrPoster(null)}>Done</Button>}
        >
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <PublicQrSvg url={`${origin}/o/${qrPoster.slug}`} className="size-48" />
            <code className="max-w-full truncate rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-800" translate="no">
              {`${origin}/o/${qrPoster.slug}`}
            </code>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="primary"
                icon={<Download className="size-4" />}
                loading={downloadingQr}
                onClick={async () => {
                  setDownloadingQr(true);
                  try {
                    const blob = await renderQrCardPng(`${origin}/o/${qrPoster.slug}`, qrPoster.content.headline || qrPoster.title, store?.name);
                    downloadBlob(blob, `${slugify(qrPoster.title)}-qr-code.png`);
                    toast.success("QR code downloaded.");
                  } finally {
                    setDownloadingQr(false);
                  }
                }}
              >
                Download QR Card
              </Button>
              <Button
                icon={<Copy className="size-4" />}
                onClick={async () => {
                  await navigator.clipboard.writeText(`${origin}/o/${qrPoster.slug}`);
                  toast.success("Public link copied.");
                }}
              >
                Copy Link
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

function PosterCard({
  poster,
  store,
  products,
  onDuplicate,
  onDelete,
  onCopyLink,
  onShowQr,
  onToggleTv,
}: {
  poster: Poster;
  store?: Store;
  products?: Product[];
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  onShowQr: () => void;
  onToggleTv: () => void;
}) {
  const expired = isExpired(poster.content.validTo);
  const validity = formatValidity(poster.content.validFrom, poster.content.validTo);
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5 transition-shadow hover:shadow-md">
      <Link href={`/dashboard/posters/${poster.id}`} className="block bg-gray-100 p-3">
        <span className="sr-only">Open {poster.title}</span>
        <PosterThumb poster={poster} store={store} products={products} maxHeight={224} />
      </Link>
      <div className="flex min-w-0 flex-1 items-start gap-1 p-3">
        <div className="min-w-0 flex-1">
          <Link href={`/dashboard/posters/${poster.id}`} className="block truncate text-sm font-semibold text-gray-950 hover:underline">
            {poster.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {poster.items.length} products{validity ? ` · ${validity}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <span
              className={cx(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                poster.published ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-700",
              )}
            >
              {poster.published ? <Globe className="size-3" aria-hidden="true" /> : null}
              {poster.published ? "Published" : "Draft"}
            </span>
            {poster.published ? (
              <button
                type="button"
                onClick={onShowQr}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-800 hover:bg-gray-200"
              >
                <QrCode className="size-3" aria-hidden="true" />
                QR
              </button>
            ) : null}
            <button
              type="button"
              onClick={onToggleTv}
              title={poster.content.showOnTv ? "Showing on Shop TV (click to remove)" : "Click to include on Shop TV"}
              className={cx(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                poster.content.showOnTv ? "bg-slate-900 text-emerald-300" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
              )}
            >
              <Tv className="size-3" aria-hidden="true" />
              {poster.content.showOnTv ? "On TV" : "TV"}
            </button>
            {expired ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">Ended</span> : null}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">Edited {updatedFormat.format(new Date(poster.updatedAt))}</p>
        </div>
        <CardMenu
          poster={poster}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onCopyLink={onCopyLink}
          onShowQr={onShowQr}
          onToggleTv={onToggleTv}
        />
      </div>
    </li>
  );
}

function CardMenu({
  poster,
  onDuplicate,
  onDelete,
  onCopyLink,
  onShowQr,
  onToggleTv,
}: {
  poster: Poster;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  onShowQr: () => void;
  onToggleTv: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none";
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative -mr-1">
      <IconButton ref={buttonRef} label={`More actions for ${poster.title}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <MoreVertical className="size-4" />
      </IconButton>
      {open ? (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-20 mb-1 w-52 rounded-lg bg-white p-1 shadow-lg ring-1 ring-gray-950/10"
          onKeyDown={(e) => {
            const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
            const index = items.indexOf(document.activeElement as HTMLElement);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              items[(index + 1) % items.length]?.focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              items[(index - 1 + items.length) % items.length]?.focus();
            }
          }}
        >
          <a
            href={`/tv?poster=${poster.id}`}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            className={item}
            onClick={() => setOpen(false)}
          >
            <Tv className="size-4 text-emerald-600" aria-hidden="true" /> Open TV Show
          </a>
          <button type="button" role="menuitem" className={item} onClick={run(onToggleTv)}>
            <Tv className="size-4" aria-hidden="true" />
            {poster.content.showOnTv ? "Remove from Shop TV" : "Show on Shop TV"}
          </button>
          <button type="button" role="menuitem" className={item} onClick={run(onDuplicate)}>
            <CopyPlus className="size-4" aria-hidden="true" /> Duplicate
          </button>
          {poster.published ? (
            <>
              <button type="button" role="menuitem" className={item} onClick={run(onShowQr)}>
                <QrCode className="size-4" aria-hidden="true" /> Show QR code
              </button>
              <button type="button" role="menuitem" className={item} onClick={run(onCopyLink)}>
                <Copy className="size-4" aria-hidden="true" /> Copy public link
              </button>
            </>
          ) : null}
          <button type="button" role="menuitem" className={cx(item, "text-red-700 hover:bg-red-50 focus:bg-red-50")} onClick={run(onDelete)}>
            <Trash2 className="size-4" aria-hidden="true" /> Delete…
          </button>
        </div>
      ) : null}
    </div>
  );
}
