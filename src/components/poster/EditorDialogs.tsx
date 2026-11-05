"use client";

import { Copy, ExternalLink, FileImage, FileText, Image as ImageIcon, MessageCircle, Printer, Share2 } from "lucide-react";
import { useState } from "react";
import { buildPdf, downloadBlob, downloadImages, maxPixelRatio, printPages, sharePages } from "@/lib/client/export";
import { useCanShareFiles, useOrigin } from "@/lib/client/useOrigin";
import { FORMATS } from "@/lib/poster/templates";
import type { Poster } from "@/lib/types";
import { Dialog } from "../Dialog";
import { useToast } from "../Toast";
import { Button, Switch, cx } from "../ui";

type RenderPages = (options: { pixelRatio: number; mime: "image/png" | "image/jpeg"; quality?: number }) => Promise<string[]>;
type Kind = "png" | "jpg" | "pdf" | "print";

const KINDS: Array<{ id: Kind; label: string; hint: string; icon: typeof FileImage }> = [
  { id: "png", label: "PNG", hint: "Best quality", icon: FileImage },
  { id: "jpg", label: "JPG", hint: "Smaller, for WhatsApp", icon: ImageIcon },
  { id: "pdf", label: "PDF", hint: "Print shop / email", icon: FileText },
  { id: "print", label: "Print", hint: "Print now", icon: Printer },
];

export function ExportDialog({
  open,
  onClose,
  poster,
  pages,
  baseName,
  renderPages,
  empty,
}: {
  open: boolean;
  onClose: () => void;
  poster: Poster;
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

  async function run() {
    setBusy(true);
    try {
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

  const actionLabel = kind === "print" ? "Print" : `Download ${kind.toUpperCase()}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Download poster"
      description={pages > 1 ? `${pages} pages will be exported.` : undefined}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={run} loading={busy} disabled={empty}>
            {actionLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {empty ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Add at least one product before downloading.</p> : null}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-800">File type</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
      </div>
    </Dialog>
  );
}

export function ShareDialog({
  open,
  onClose,
  poster,
  baseName,
  renderPages,
  onPublish,
}: {
  open: boolean;
  onClose: () => void;
  poster: Poster;
  baseName: string;
  renderPages: RenderPages;
  onPublish: (published: boolean) => Promise<void>;
}) {
  const toast = useToast();
  const origin = useOrigin();
  const canShareFiles = useCanShareFiles();
  const [publishing, setPublishing] = useState(false);
  const [sharing, setSharing] = useState(false);

  const url = `${origin}/o/${poster.slug}`;
  const message = `${poster.content.headline || poster.title} – see today's offers: ${url}`;

  async function togglePublish(next: boolean) {
    setPublishing(true);
    try {
      await onPublish(next);
      toast.success(next ? "Published. Customers can open the link now." : "Unpublished. The link is hidden.");
    } finally {
      setPublishing(false);
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
    <Dialog open={open} onClose={onClose} title="Share offers" footer={<Button onClick={onClose}>Done</Button>}>
      <div className="space-y-5">
        <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <Switch
            checked={poster.published}
            onChange={togglePublish}
            label={publishing ? "Updating…" : "Public offer page"}
            description="Customers see these offers on a web page, without the app."
          />
        </div>

        {poster.published ? (
          <div className="space-y-3">
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
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1fa855] px-4 text-sm font-medium text-white hover:bg-[#178a45]"
              >
                <MessageCircle className="size-4" aria-hidden="true" /> Send link on WhatsApp
              </a>
              <a
                href={`/o/${poster.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                <ExternalLink className="size-4" aria-hidden="true" /> Open offer page
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Turn on the public page to get a link you can send to customers.</p>
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
