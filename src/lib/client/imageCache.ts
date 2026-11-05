"use client";

import { useEffect, useState } from "react";

type Entry = { image: HTMLImageElement; ready: boolean; failed: boolean; promise: Promise<HTMLImageElement | null> };

const cache = new Map<string, Entry>();

/** Loads an image once per URL. CORS-enabled so the poster canvas stays exportable. */
export function loadImage(url: string): Promise<HTMLImageElement | null> {
  const existing = cache.get(url);
  if (existing) return existing.promise;
  const image = new Image();
  if (!url.startsWith("blob:") && !url.startsWith("data:")) image.crossOrigin = "anonymous";
  const entry = { image, ready: false, failed: false } as Entry;
  entry.promise = new Promise((resolve) => {
    image.onload = () => {
      entry.ready = true;
      resolve(image);
    };
    image.onerror = () => {
      entry.failed = true;
      resolve(null);
    };
  });
  image.decoding = "async";
  image.src = url;
  cache.set(url, entry);
  return entry.promise;
}

export function getLoadedImage(url: string): HTMLImageElement | null {
  const entry = cache.get(url);
  return entry?.ready ? entry.image : null;
}

/** Re-renders the caller whenever one of the URLs finishes loading. Returns true when all are done. */
export function useImages(urls: string[]): boolean {
  const key = Array.from(new Set(urls.filter(Boolean))).sort().join("|");
  const [, setVersion] = useState(0);
  const [doneKey, setDoneKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split("|") : [];
    Promise.all(
      list.map((url) =>
        loadImage(url).then(() => {
          if (!cancelled) setVersion((v) => v + 1);
        }),
      ),
    ).then(() => {
      if (!cancelled) setDoneKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return doneKey === key;
}
