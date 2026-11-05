import type { Metadata } from "next";
import { NewPosterScreen } from "@/components/screens/NewPosterScreen";

export const metadata: Metadata = { title: "New poster" };

export default function NewPosterPage() {
  return <NewPosterScreen />;
}
