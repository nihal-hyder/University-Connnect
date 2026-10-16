"use client";

import { useEffect } from "react";

/**
 * Stores this ticket page in the offline ticket cache. Needed because opening
 * a ticket via an in-app link is a client navigation, which the service worker
 * never sees as a page request.
 */
export function SaveTicketOffline() {
  useEffect(() => {
    if (!("caches" in window) || !navigator.serviceWorker?.controller) return;
    const path = window.location.pathname;
    caches
      .open("cc-tickets")
      .then((cache) => cache.add(new Request(path, { credentials: "same-origin" })))
      .catch(() => undefined);
  }, []);
  return null;
}
