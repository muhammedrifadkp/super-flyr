"use client";

import { Download, Home, ImagePlus, LogOut, Package, Settings, Store as StoreIcon, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, useStatus, useStore } from "@/lib/client/api";
import { cx } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/posters", label: "Posters", icon: ImagePlus },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/settings", label: "Branding", icon: Settings },
];

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function useInstallPrompt() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return event
    ? async () => {
        await event.prompt();
        await event.userChoice.catch(() => undefined);
        setEvent(null);
      }
    : null;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: store } = useStore();
  const { data: status } = useStatus();
  const install = useInstallPrompt();

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  async function logout() {
    await api.post("/api/auth/logout").catch(() => undefined);
    router.replace("/login");
  }

  const warnings: string[] = [];
  if (status && status.database === "local") warnings.push("Demo storage: data is saved on this computer only.");
  if (status && !status.auth) warnings.push("Login is off. Set ADMIN_PASSWORD before going live.");

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
          <div className="flex items-center gap-3 px-4 py-4">
            <StoreBadge logoUrl={store?.logoUrl} color={store?.colors.primary} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-950">{store?.name ?? " "}</p>
              <p className="text-xs text-gray-500" translate="no">
                Super Flyr
              </p>
            </div>
          </div>
          <nav aria-label="Main" className="flex flex-col gap-0.5 px-2">
            {NAV.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href, exact) ? "page" : undefined}
                className={cx(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  isActive(href, exact) ? "bg-brand-50 text-brand-800" : "text-gray-700 hover:bg-gray-100 hover:text-gray-950",
                )}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
                {label}
              </Link>
            ))}
            <Link
              href="/"
              target="_blank"
              className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-950"
            >
              <StoreIcon className="size-[18px]" aria-hidden="true" />
              Public offers page
            </Link>
          </nav>
          <div className="mt-auto space-y-2 p-3">
            {warnings.map((w) => (
              <p key={w} className="flex gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 ring-1 ring-amber-200">
                <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                {w}
              </p>
            ))}
            {install ? (
              <button
                type="button"
                onClick={install}
                className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <Download className="size-[18px]" aria-hidden="true" />
                Install app
              </button>
            ) : null}
            {status?.auth ? (
              <button
                type="button"
                onClick={logout}
                className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="size-[18px]" aria-hidden="true" />
                Log out
              </button>
            ) : null}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          {
            <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur md:hidden">
              <StoreBadge logoUrl={store?.logoUrl} color={store?.colors.primary} small />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{store?.name ?? ""}</p>
              {install ? (
                <button type="button" onClick={install} className="rounded-lg px-2 py-1.5 text-sm font-medium text-brand-700">
                  Install
                </button>
              ) : null}
              {status?.auth ? (
                <button type="button" onClick={logout} aria-label="Log out" className="rounded-lg p-2 text-gray-600">
                  <LogOut className="size-5" />
                </button>
              ) : null}
            </header>
          }

          <main id="main" className="min-w-0 flex-1 pb-20 md:pb-0">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile tab bar */}
      {
        <nav
          aria-label="Main"
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-gray-200 bg-white md:hidden"
        >
          {NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href, exact) ? "page" : undefined}
              className={cx(
                "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                isActive(href, exact) ? "text-brand-700" : "text-gray-600",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      }
    </>
  );
}

function StoreBadge({ logoUrl, color, small }: { logoUrl?: string; color?: string; small?: boolean }) {
  const size = small ? "size-8" : "size-10";
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        width={40}
        height={40}
        className={cx(size, "shrink-0 rounded-lg bg-white object-contain ring-1 ring-gray-200")}
      />
    );
  }
  return (
    <span
      className={cx(size, "flex shrink-0 items-center justify-center rounded-lg text-white")}
      style={{ background: color ?? "#059669" }}
      aria-hidden="true"
    >
      <StoreIcon className={small ? "size-4" : "size-5"} />
    </span>
  );
}
