import type { Metadata } from "next";
import { SettingsScreen } from "@/components/screens/SettingsScreen";

export const metadata: Metadata = { title: "Branding" };

export default function SettingsPage() {
  return <SettingsScreen />;
}
