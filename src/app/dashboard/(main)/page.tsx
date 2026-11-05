import type { Metadata } from "next";
import { HomeScreen } from "@/components/screens/HomeScreen";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <HomeScreen />;
}
