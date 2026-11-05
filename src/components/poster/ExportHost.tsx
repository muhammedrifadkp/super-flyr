"use client";

import type Konva from "konva";
import { useCallback, useEffect, useRef } from "react";
import { FORMATS } from "@/lib/poster/templates";
import type { Poster, ResolvedItem, Store } from "@/lib/types";
import { PosterCanvas } from "./PosterPreview";

export interface ExportRequest {
  pixelRatio: number;
  mime: "image/png" | "image/jpeg";
  quality: number;
  resolve: (pages: string[]) => void;
  reject: (error: Error) => void;
}

/**
 * Draws every page off-screen at full size, waits for fonts and images, then returns data URLs.
 * Mounted only while an export is running.
 */
export function ExportHost({
  request,
  poster,
  store,
  items,
  pages,
}: {
  request: ExportRequest;
  poster: Poster;
  store: Store;
  items: ResolvedItem[];
  pages: number;
}) {
  const stages = useRef<Array<Konva.Stage | null>>([]);
  const ready = useRef(new Set<number>());
  const finished = useRef(false);
  const width = FORMATS[poster.layout.format].width;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    try {
      const urls = stages.current.slice(0, pages).map((stage) => {
        if (!stage) throw new Error("Poster page was not drawn.");
        return stage.toDataURL({ pixelRatio: request.pixelRatio, mimeType: request.mime, quality: request.quality });
      });
      request.resolve(urls);
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "SecurityError"
          ? "An image blocked the export (cross-origin). Re-upload that product photo."
          : error instanceof Error
            ? error.message
            : "Export failed.";
      request.reject(new Error(message));
    }
  }, [pages, request]);

  const markReady = useCallback(
    (page: number) => {
      ready.current.add(page);
      if (ready.current.size >= pages) finish();
    },
    [finish, pages],
  );

  // Safety net: never leave the user waiting forever on a broken image or font.
  useEffect(() => {
    const timer = window.setTimeout(finish, 20_000);
    return () => window.clearTimeout(timer);
  }, [finish]);

  return (
    <div aria-hidden="true" style={{ position: "fixed", left: -100_000, top: 0, pointerEvents: "none" }}>
      {Array.from({ length: pages }, (_, page) => (
        <ExportPage
          key={page}
          page={page}
          width={width}
          poster={poster}
          store={store}
          items={items}
          onReady={markReady}
          setStage={(stage) => {
            stages.current[page] = stage;
          }}
        />
      ))}
    </div>
  );
}

function ExportPage({
  page,
  width,
  poster,
  store,
  items,
  onReady,
  setStage,
}: {
  page: number;
  width: number;
  poster: Poster;
  store: Store;
  items: ResolvedItem[];
  onReady: (page: number) => void;
  setStage: (stage: Konva.Stage | null) => void;
}) {
  const handleReady = useCallback(() => onReady(page), [onReady, page]);
  return <PosterCanvas poster={poster} store={store} items={items} page={page} displayWidth={width} stageRef={setStage} onReady={handleReady} />;
}
