/**
 * Service Worker — IKL SPPG
 * Versi : 2026.1.0
 * Strategi: Cache-First untuk aset app
 * Yang di-cache SW  : index.html (seluruh app)
 * Yang TIDAK di-cache: IndexedDB (data inspeksi) — dikelola app langsung
 */

const CACHE_NAME = 'ikl-sppg-v2026.1.0';
const APP_SHELL  = ['/', '/index.html'];

/* ── INSTALL: cache aset app ──────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: hapus cache versi lama ────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH: Cache-First, fallback ke network ─────────────────────── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, toCache));
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});

/* ── MESSAGE: trigger update dari app ───────────────────────────── */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
