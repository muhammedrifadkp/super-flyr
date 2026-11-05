import type { Metadata } from "next";
import { PostersScreen } from "@/components/screens/PostersScreen";

export const metadata: Metadata = { title: "Posters" };

export default function PostersPage() {
  return <PostersScreen />;
}
