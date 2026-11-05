import type { Metadata } from "next";
import { ProductsScreen } from "@/components/screens/ProductsScreen";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return <ProductsScreen />;
}
