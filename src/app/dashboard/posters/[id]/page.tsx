import type { Metadata } from "next";
import { Suspense } from "react";
import { PosterEditor } from "@/components/screens/PosterEditor";

export const metadata: Metadata = { title: "Poster editor" };

export default function PosterEditorPage() {
  return (
    <Suspense>
      <PosterEditor />
    </Suspense>
  );
}
