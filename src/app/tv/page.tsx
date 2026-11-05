import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { TvDisplayScreen } from "@/components/screens/TvDisplayScreen";
import { getRepo } from "@/lib/db";

export const metadata: Metadata = {
  title: "Smart TV Live Offer Display",
};

export default function TvPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-slate-950 text-white">
          <p className="animate-pulse text-lg font-semibold">Starting Smart TV Display…</p>
        </div>
      }
    >
      <TvLoader />
    </Suspense>
  );
}

async function TvLoader() {
  await connection();
  const repo = getRepo();
  const [store, posters, products] = await Promise.all([repo.getStore(), repo.listPosters(), repo.listProducts()]);
  return <TvDisplayScreen fallbackStore={store} fallbackPosters={posters} fallbackProducts={products} />;
}

