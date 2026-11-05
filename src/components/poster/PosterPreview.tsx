"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { FORMATS } from "@/lib/poster/templates";
import type { PosterCanvasProps } from "./PosterCanvas";

/** Konva touches `window`, so the canvas only loads in the browser. */
export const PosterCanvas = dynamic(() => import("./PosterCanvas"), { ssr: false });

/** Poster canvas that scales to fit its container, keeping the poster's aspect ratio. */
export function FittedPoster({
  maxHeight,
  className,
  ...props
}: Omit<PosterCanvasProps, "displayWidth"> & { maxHeight?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const format = FORMATS[props.poster.layout.format];
  const aspect = format.height / format.width;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth;
      const byHeight = maxHeight ? maxHeight / aspect : Infinity;
      setWidth(Math.max(120, Math.floor(Math.min(available, byHeight))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [aspect, maxHeight]);

  return (
    <div ref={ref} className={className}>
      <div
        className="mx-auto overflow-hidden rounded-md bg-white shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_-8px_rgb(0_0_0/0.25)] ring-1 ring-black/5"
        style={{ width: width || undefined, aspectRatio: `${format.width} / ${format.height}` }}
      >
        {width ? <PosterCanvas {...props} displayWidth={width} /> : null}
      </div>
    </div>
  );
}
