import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Super Flyr – Offer Poster Maker", template: "%s · Super Flyr" },
  description: "Create professional supermarket offer posters in minutes and share them with customers.",
  applicationName: "Super Flyr",
  appleWebApp: { capable: true, title: "Super Flyr", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: { apple: "/pwa-icon/180" },
};

export const viewport: Viewport = {
  themeColor: "#f6f7f9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
