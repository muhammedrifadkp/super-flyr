"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** window.location.origin on the client, "" during server rendering (hydration-safe). */
export function useOrigin(): string {
  return useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );
}

/** True when the browser can share files through the native share sheet. */
export function useCanShareFiles(): boolean {
  return useSyncExternalStore(
    noop,
    () => typeof navigator.share === "function" && typeof navigator.canShare === "function",
    () => false,
  );
}
