"use client";

import { useEffect } from "react";

type Recent = { slug: string; title: string; at: number };
const RECENT_KEY = "cc_recently_viewed";

/**
 * Records an anonymous daily view and keeps a "recently viewed" list in this
 * browser only (never sent to the server).
 */
export function ViewTracker({ eventId, slug, title }: { eventId: string; slug: string; title: string }) {
  useEffect(() => {
    const key = `cc_viewed_${eventId}`;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        void fetch("/api/views", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ eventId }),
          keepalive: true,
        }).catch(() => undefined);
      }
    } catch {
      /* storage unavailable: skip counting */
    }
    try {
      const list: Recent[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
      const next = [{ slug, title, at: Date.now() }, ...list.filter((r) => r.slug !== slug)].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [eventId, slug, title]);
  return null;
}
