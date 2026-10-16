/*
 * CampusConnect service worker.
 * - Network first for everything, so content is always fresh when online.
 * - Ticket pages (/dashboard/registrations/<id>) are kept in a cache after each
 *   successful visit, so a ticket opens at the venue gate without signal.
 * - Built static assets are cached so cached pages render properly offline.
 * - Other page navigations fall back to /offline when there is no network.
 * The ticket cache is deleted on sign-out (page script + Clear-Site-Data).
 */
const VERSION = "v1";
const STATIC_CACHE = `cc-static-${VERSION}`;
const TICKET_CACHE = "cc-tickets";
const OFFLINE_URL = "/offline";
const TICKET_PATH = /^\/dashboard\/registrations\/[0-9a-f-]{36}$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("cc-static-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-private-caches") event.waitUntil(caches.delete(TICKET_CACHE));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Immutable build assets: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (request.mode !== "navigate") return;

  // Tickets: network first, keep a copy for offline use.
  if (TICKET_PATH.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(TICKET_CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(() => caches.match(url.pathname, { cacheName: TICKET_CACHE }).then((hit) => hit || caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Any other page: network, then the offline page.
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
});
