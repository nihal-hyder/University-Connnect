"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production builds (or when NEXT_PUBLIC_ENABLE_SW=1),
 * so development keeps normal hot reloading.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    const enabled = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW === "1";
    if (!enabled || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}

/** Removes cached tickets on this device; called just before signing out. */
export async function clearPrivateCaches() {
  try {
    navigator.serviceWorker?.controller?.postMessage("clear-private-caches");
    if ("caches" in window) await caches.delete("cc-tickets");
  } catch {
    /* best effort; the server also sends Clear-Site-Data */
  }
}
