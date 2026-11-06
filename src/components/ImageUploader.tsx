"use client";

import { ImageUp, Minus, Plus, RotateCcw, Trash2, Wand2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { encodeImage, fileToCanvas, removeBackground, trimTransparent } from "@/lib/client/image";
import { Button, Switch, cx } from "./ui";

export interface PendingImage {
  /** Encoded result ready to upload */
  blob: Blob;
  previewUrl: string;
}

/**
 * Pick / drop / paste an image, optionally remove a plain background for free (in the browser),
 * preview it on a checkerboard and hand back the processed file.
 */
export function ImageUploader({
  currentUrl,
  onChange,
  scale,
  onScaleChange,
  removeBgDefault = true,
  maxSize = 1000,
  label = "Product photo",
}: {
  currentUrl?: string;
  onChange: (image: PendingImage | null | "remove") => void;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  removeBgDefault?: boolean;
  maxSize?: number;
  label?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState<HTMLCanvasElement | null>(null);
  const [removeBg, setRemoveBg] = useState(removeBgDefault);
  const [tolerance, setTolerance] = useState(35);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [removed, setRemoved] = useState(false);

  const timer = useRef<number | undefined>(undefined);
  const runId = useRef(0);
  const previewRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  /** Runs background removal + encoding. Later calls cancel earlier ones. */
  function process(source: HTMLCanvasElement, remove: boolean, strength: number, delay = 0) {
    window.clearTimeout(timer.current);
    setBusy(true);
    const id = ++runId.current;
    timer.current = window.setTimeout(async () => {
      try {
        const processed = remove ? trimTransparent(removeBackground(source, strength)) : source;
        const blob = await encodeImage(processed);
        if (id !== runId.current) return;
        const url = URL.createObjectURL(blob);
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = url;
        setPreview(url);
        onChange({ blob, previewUrl: url });
      } catch (e) {
        if (id === runId.current) setError(e instanceof Error ? e.message : "Could not process this image.");
      } finally {
        if (id === runId.current) setBusy(false);
      }
    }, delay);
  }

  async function load(file: File | Blob) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file (JPG, PNG or WebP).");
      return;
    }
    setBusy(true);
    try {
      const canvas = await fileToCanvas(file, maxSize);
      setOriginal(canvas);
      setRemoved(false);
      process(canvas, removeBg, tolerance);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this image.");
      setBusy(false);
    }
  }

  const shown = preview ?? (removed ? null : currentUrl || null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-800">
          {label}
        </label>
        {shown ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
            onClick={() => {
              runId.current++;
              setOriginal(null);
              setPreview(null);
              setBusy(false);
              setRemoved(true);
              onChange("remove");
            }}
          >
            <Trash2 className="size-3.5" aria-hidden="true" /> Remove photo
          </button>
        ) : null}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void load(file);
        }}
        onPaste={(e) => {
          const file = Array.from(e.clipboardData.files)[0];
          if (file) {
            e.preventDefault();
            void load(file);
          }
        }}
        className={cx(
          "relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl ring-1 ring-gray-300",
          shown ? "checkerboard" : "bg-gray-50",
          dragging && "ring-2 ring-brand-600",
        )}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Preview"
            style={scale && scale !== 1 ? { transform: `scale(${scale})` } : undefined}
            className="max-h-full max-w-full object-contain p-3 transition-transform duration-100"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-center text-sm text-gray-600">
            <ImageUp className="size-8 text-gray-400" aria-hidden="true" />
            <span>Drop, paste or choose a photo</span>
            <span className="text-xs text-gray-500">White background photos work best</span>
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-medium text-gray-700" aria-live="polite">
            Processing…
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void load(file);
          e.target.value = "";
        }}
      />
      <Button icon={<ImageUp className="size-4" />} onClick={() => inputRef.current?.click()} className="w-full">
        {shown ? "Change photo…" : "Choose photo…"}
      </Button>

      {shown && onScaleChange ? (
        <div className="space-y-1.5 rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-gray-800">Product size</span>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold tabular text-gray-900">{Math.round((scale ?? 1) * 100)}%</span>
              {scale !== undefined && scale !== 1 ? (
                <button
                  type="button"
                  onClick={() => onScaleChange(1)}
                  className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-50"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrease product size"
              onClick={() => onScaleChange(Math.max(0.5, Number(((scale ?? 1) - 0.05).toFixed(2))))}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100"
            >
              <Minus className="size-3.5" />
            </button>
            <input
              type="range"
              min={0.5}
              max={1.8}
              step={0.05}
              value={scale ?? 1}
              onChange={(e) => onScaleChange(Number(e.target.value))}
              aria-label="Product size"
              className="w-full accent-brand-600"
            />
            <button
              type="button"
              aria-label="Increase product size"
              onClick={() => onScaleChange(Math.min(1.8, Number(((scale ?? 1) + 0.05).toFixed(2))))}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {original ? (
        <div className="space-y-2 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
          <Switch
            checked={removeBg}
            onChange={(value) => {
              setRemoveBg(value);
              if (original) process(original, value, tolerance);
            }}
            label={
              <span className="inline-flex items-center gap-1.5">
                <Wand2 className="size-4 text-brand-600" aria-hidden="true" /> Remove background
              </span>
            }
            description="Free, runs on this device. Best for plain white backgrounds."
          />
          {removeBg ? (
            <label className="block">
              <span className="flex justify-between text-xs text-gray-600">
                <span>Strength</span>
                <span className="tabular">{tolerance}</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={tolerance}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setTolerance(value);
                  if (original) process(original, removeBg, value, 120);
                }}
                className="mt-1 w-full accent-brand-600"
              />
              <span className="flex justify-between text-[11px] text-gray-500">
                <span>Keeps white product parts</span>
                <span>Removes shadows</span>
              </span>
            </label>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
