"use client";

import { Copy, Download, ExternalLink, FileImage, FileText, Image as ImageIcon, MessageCircle, Printer, QrCode, Share2, Tag, Tv } from "lucide-react";
import { useMemo, useState } from "react";
import { buildPdf, downloadBlob, downloadImages, maxPixelRatio, printPages, renderShelfTagPages, sharePages } from "@/lib/client/export";
import { useCanShareFiles, useOrigin } from "@/lib/client/useOrigin";
import { formatValidity, isExpired } from "@/lib/format";
import { encodeQrMatrix, qrMatrixToSvgPath, renderQrCardPng } from "@/lib/poster/qr";
import { FORMATS } from "@/lib/poster/templates";
import type { Poster, ResolvedItem, Store } from "@/lib/types";
import { Dialog } from "../Dialog";
import { useToast } from "../Toast";
import { Button, Switch, cx } from "../ui";

type RenderPages = (options: { pixelRatio: number; mime: "image/png" | "image/jpeg"; quality?: number }) => Promise<string[]>;
type Kind = "png" | "jpg" | "pdf" | "print" | "tags";

const KINDS: Array<{ id: Kind; label: string; hint: string; icon: typeof FileImage }> = [
  { id: "png", label: "PNG", hint: "Best quality", icon: FileImage },
  { id: "jpg", label: "JPG", hint: "Smaller, for WhatsApp", icon: ImageIcon },
  { id: "pdf", label: "PDF", hint: "Print shop / email", icon: FileText },
  { id: "print", label: "Print", hint: "Print poster now", icon: Printer },
  { id: "tags", label: "Shelf Tags", hint: "A4 rack price cards", icon: Tag },
];

export function ExportDialog({
  open,
  onClose,
  poster,
  store,
  items,
  pages,
  baseName,
  renderPages,
  empty,
}: {
  open: boolean;
  onClose: () => void;
  poster: Poster;
  store: Store;
  items: ResolvedItem[];
  pages: number;
  baseName: string;
  renderPages: RenderPages;
  empty: boolean;
}) {
  const toast = useToast();
  const format = FORMATS[poster.layout.format];
  const maxRatio = maxPixelRatio(format.width, format.height);
  const [kind, setKind] = useState<Kind>(poster.layout.format === "a4" ? "pdf" : "png");
  const [ratio, setRatio] = useState(2);
  const [busy, setBusy] = useState(false);

  const qualities = [
    { value: 1, label: "Standard" },
    { value: 2, label: "HD" },
    { value: Math.min(3, maxRatio), label: "Print" },
  ];

  async function run(printTags = false) {
    setBusy(true);
    try {
      if (kind === "tags") {
        const validity = formatValidity(poster.content.validFrom, poster.content.validTo);
        const tagUrls = await renderShelfTagPages(items, store, validity);
        if (printTags) {
          printPages(tagUrls, "a4");
        } else {
          const pdfBlob = await buildPdf(tagUrls, "a4", 1654, 2339);
          downloadBlob(pdfBlob, `${baseName}-shelf-tags.pdf`);
          toast.success(`Shelf tags PDF (${items.length} products) downloaded.`);
        }
        onClose();
        return;
      }
      const pixelRatio = Math.min(ratio, maxRatio);
      const mime = kind === "png" ? "image/png" : "image/jpeg";
      const urls = await renderPages({ pixelRatio, mime, quality: kind === "jpg" ? 0.9 : 0.95 });
      if (kind === "png" || kind === "jpg") {
        await downloadImages(urls, baseName, kind);
        toast.success(urls.length > 1 ? `${urls.length} images downloaded.` : "Poster downloaded.");
      } else if (kind === "pdf") {
        downloadBlob(await buildPdf(urls, poster.layout.format, format.width, format.height), `${baseName}.pdf`);
        toast.success("PDF downloaded.");
      } else {
        printPages(urls, poster.layout.format);
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  const actionLabel =
    kind === "print"
      ? "Print poster"
      : kind === "tags"
        ? "Download Shelf Tags PDF"
        : `Download ${kind.toUpperCase()}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Download & Print"
      description={pages > 1 && kind !== "tags" ? `${pages} pages will be exported.` : undefined}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          {kind === "tags" ? (
            <Button icon={<Printer className="size-4" />} onClick={() => void run(true)} loading={busy} disabled={empty}>
              Print Tags
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => void run(false)} loading={busy} disabled={empty}>
            {actionLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {empty ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Add at least one product before downloading.</p> : null}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-800">Export format</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {KINDS.map(({ id, label, hint, icon: Icon }) => (
              <label
                key={id}
                className={cx(
                  "flex cursor-pointer flex-col items-center gap-1 rounded-xl p-3 text-center ring-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600",
                  kind === id ? "bg-brand-50 ring-2 ring-brand-600" : "ring-gray-200 hover:ring-gray-300",
                )}
              >
                <input type="radio" name="kind" value={id} checked={kind === id} onChange={() => setKind(id)} className="sr-only" />
                <Icon className="size-5 text-gray-700" aria-hidden="true" />
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-[11px] leading-tight text-gray-500">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {kind === "tags" ? (
          <div className="rounded-xl bg-brand-50/70 p-3.5 text-sm text-gray-800 ring-1 ring-brand-200">
            <p className="font-semibold text-brand-900">A4 Supermarket Rack Price Tags ({items.length} cards)</p>
            <p className="mt-1 text-xs text-gray-600">
              Generates printable A4 sheets (8 cut-out shelf talkers per page) with your store header, Malayalam + English product names, struck-through MRP, and bold Offer Price.
            </p>
          </div>
        ) : (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-800">Quality</legend>
            <div className="grid grid-cols-3 gap-2">
              {qualities.map((q) => (
                <label
                  key={q.label}
                  className={cx(
                    "flex cursor-pointer flex-col items-center rounded-xl p-2.5 ring-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600",
                    ratio === q.value ? "bg-brand-50 ring-2 ring-brand-600" : "ring-gray-200 hover:ring-gray-300",
                  )}
                >
                  <input type="radio" name="quality" checked={ratio === q.value} onChange={() => setRatio(q.value)} className="sr-only" />
                  <span className="text-sm font-semibold">{q.label}</span>
                  <span className="text-[11px] text-gray-500 tabular">
                    {Math.round(format.width * q.value)}×{Math.round(format.height * q.value)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </Dialog>
  );
}

export function PublicQrSvg({ url, className = "size-36" }: { url: string; className?: string }) {
  const { path, size } = useMemo(() => qrMatrixToSvgPath(encodeQrMatrix(url), 2), [url]);
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code for ${url}`}
      className={cx("rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-gray-200", className)}
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#111827" />
    </svg>
  );
}

export function ShareDialog({
  open,
  onClose,
  poster,
  store,
  baseName,
  renderPages,
  onPublish,
  onTogglePosterQr,
}: {
  open: boolean;
  onClose: () => void;
  poster: Poster;
  store?: Store;
  baseName: string;
  renderPages: RenderPages;
  onPublish: (published: boolean) => Promise<void>;
  onTogglePosterQr?: (showQr: boolean) => void;
}) {
  const toast = useToast();
  const origin = useOrigin();
  const canShareFiles = useCanShareFiles();
  const [publishing, setPublishing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);

  const url = `${origin}/o/${poster.slug}`;
  const message = `${poster.content.headline || poster.title} – see today's offers & order on WhatsApp: ${url}`;

  async function togglePublish(next: boolean) {
    setPublishing(true);
    try {
      await onPublish(next);
      toast.success(next ? "Published. Customers can scan the QR code or open the link now." : "Unpublished. The link is hidden.");
    } finally {
      setPublishing(false);
    }
  }

  async function downloadQrPng() {
    setDownloadingQr(true);
    try {
      const blob = await renderQrCardPng(url, poster.content.headline || poster.title, store?.name);
      downloadBlob(blob, `${baseName}-qr-code.png`);
      toast.success("QR code downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download QR code.");
    } finally {
      setDownloadingQr(false);
    }
  }

  async function shareImage() {
    setSharing(true);
    try {
      const urls = await renderPages({ pixelRatio: 2, mime: "image/jpeg", quality: 0.9 });
      const ok = await sharePages(urls, baseName, poster.title, poster.published ? url : undefined);
      if (!ok) toast.show("Sharing images isn’t supported here. Use Download instead.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not share.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Share & Publish Offers" footer={<Button onClick={onClose}>Done</Button>}>
      <div className="space-y-5">
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <Switch
            checked={poster.published}
            onChange={togglePublish}
            label={publishing ? "Updating…" : "Public offer & WhatsApp ordering page"}
            description="Customers can scan the QR code or open the link to view offers & order on WhatsApp!"
          />
        </div>

        {poster.published ? (
          <div className="space-y-4">
            {isExpired(poster.content.validTo) ? (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-800 ring-1 ring-red-200">
                This poster’s offer validity ({poster.content.validTo}) has ended. Customers scanning the QR code or opening the link will see an “Offer Expired” screen and cannot view products or place orders until you extend the “To” date in the Text tab.
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-gray-100 px-3 py-2.5 text-sm" translate="no">
                {url}
              </code>
              <Button
                icon={<Copy className="size-4" />}
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link copied.");
                }}
              >
                Copy
              </Button>
            </div>

            {/* Scannable QR Code Card */}
            <div className="flex flex-col items-center gap-4 rounded-xl bg-brand-50/60 p-4 ring-1 ring-brand-200 sm:flex-row sm:items-start">
              <PublicQrSvg url={url} className="size-36 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2.5 text-center sm:text-left">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-950">
                    <QrCode className="size-4 text-brand-700" aria-hidden="true" />
                    Customer Scan QR Code
                  </p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    Customers can scan this QR code with their phone camera to view all product offers and send their order on WhatsApp.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Button size="sm" variant="primary" icon={<Download className="size-4" />} onClick={downloadQrPng} loading={downloadingQr}>
                    Download QR Card
                  </Button>
                </div>
                {onTogglePosterQr ? (
                  <div className="pt-1 text-left">
                    <Switch
                      checked={Boolean(poster.content.showQr)}
                      onChange={onTogglePosterQr}
                      label="Also print this QR code on the poster footer"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1fa855] px-3 text-sm font-medium text-white hover:bg-[#178a45]"
              >
                <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp Link
              </a>
              <a
                href={`/o/${poster.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                <ExternalLink className="size-4" aria-hidden="true" /> Offer Page
              </a>
              <a
                href="/tv"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                <Tv className="size-4" aria-hidden="true" /> Smart TV Mode
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Turn on the public page to get a scannable QR code & link you can send to customers and show on your shop Smart TV.</p>
        )}

        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-800">Share the poster image</h3>
          <p className="mb-3 text-sm text-gray-600">Opens your phone’s share sheet: WhatsApp status, groups, Instagram…</p>
          <Button icon={<Share2 className="size-4" />} onClick={shareImage} loading={sharing} disabled={!canShareFiles || poster.items.length === 0}>
            Share image
          </Button>
          {!canShareFiles ? <p className="mt-2 text-xs text-gray-500">Not supported in this browser. Use Download, then share the file.</p> : null}
        </div>
      </div>
    </Dialog>
  );
}
