"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { relativeFromNow } from "@/lib/format";

type Recent = { slug: string; title: string; at: number };
const KEY = "cc_recently_viewed";

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Recent[] } = { raw: null, value: [] };

function read(): Recent[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return [];
  }
  if (raw === cache.raw) return cache.value;
  let value: Recent[] = [];
  try {
    const parsed = JSON.parse(raw ?? "[]");
    if (Array.isArray(parsed)) value = parsed.filter((r) => typeof r?.slug === "string" && typeof r?.title === "string").slice(0, 8);
  } catch {
    value = [];
  }
  cache = { raw, value };
  return value;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const EMPTY: Recent[] = [];

/**
 * Events this browser opened recently. Stored only on this device
 * (localStorage, written by ViewTracker); never sent to the server.
 */
export function RecentlyViewed() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  if (!items.length) {
    return <p className="text-sm leading-6 text-muted-foreground">Events you open will show up here. This list stays on this device only.</p>;
  }
  return (
    <div>
      <ul className="space-y-2.5">
        {items.slice(0, 5).map((r) => (
          <li key={r.slug} className="text-sm">
            <Link href={`/events/${r.slug}`} className="font-medium hover:underline">
              {r.title}
            </Link>
            <span className="block text-xs text-muted-foreground">Viewed {relativeFromNow(new Date(r.at))}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-3 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        onClick={() => {
          try {
            localStorage.removeItem(KEY);
          } catch {
            /* ignore */
          }
          listeners.forEach((l) => l());
        }}
      >
        Clear history on this device
      </button>
    </div>
  );
}
