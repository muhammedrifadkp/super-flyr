import { DashboardShell } from "@/components/DashboardShell";

/** Sidebar / bottom-tab shell for every dashboard page except the full-screen poster editor. */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
