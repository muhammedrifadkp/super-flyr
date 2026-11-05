import { ConfirmProvider } from "@/components/Confirm";
import { ToastProvider } from "@/components/Toast";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
