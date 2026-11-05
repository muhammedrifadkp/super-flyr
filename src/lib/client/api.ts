"use client";

import useSWR from "swr";
import type { Poster, Product, Store } from "../types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth/")) {
    // Session expired: a full reload to the login page also clears client caches.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) => request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (url: string) => request<void>(url, { method: "DELETE" }),
  async upload(file: Blob, name = "image"): Promise<string> {
    const form = new FormData();
    const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
    form.append("file", file, `${name}.${ext}`);
    const { url } = await request<{ url: string }>("/api/upload", { method: "POST", body: form });
    return url;
  },
};

const fetcher = <T>(url: string) => request<T>(url);

export function useStore() {
  return useSWR<Store>("/api/store", fetcher);
}

export function useProducts() {
  return useSWR<Product[]>("/api/products", fetcher);
}

export function usePosters() {
  return useSWR<Poster[]>("/api/posters", fetcher);
}

export function usePoster(id: string | undefined) {
  return useSWR<Poster>(id ? `/api/posters/${id}` : null, fetcher, { revalidateOnFocus: false });
}

export interface AppStatus {
  auth: boolean;
  database: "mongo" | "local";
  storage: "cloudinary" | "local";
}

export function useStatus() {
  return useSWR<AppStatus>("/api/status", fetcher, { revalidateOnFocus: false });
}
