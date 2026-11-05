"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { resolveItems } from "@/lib/format";
import type { Poster, Product, Store } from "@/lib/types";
import { MiniPoster } from "./MiniPoster";
import { FittedPoster } from "./PosterPreview";

/** Real poster render for lists. Draws only once it scrolls into view; CSS sketch until then. */
export function PosterThumb({
  poster,
  store,
  products,
  maxHeight = 220,
}: {
  poster: Poster;
  store?: Store;
  products?: Product[];
  maxHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const items = useMemo(() => (products ? resolveItems(poster.items, products) : []), [poster.items, products]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="pointer-events-none" aria-hidden="true">
      {visible && store && products ? (
        <FittedPoster poster={poster} store={store} items={items} page={0} maxHeight={maxHeight} />
      ) : (
        <div className="mx-auto overflow-hidden rounded shadow-sm" style={{ maxHeight, maxWidth: "100%" }}>
          <MiniPoster poster={poster} />
        </div>
      )}
    </div>
  );
}
