/**
 * Service Worker — IKL SPPG
 * Versi : 2026.1.0
 * Strategi: Cache-First untuk aset app
 *
 * Yang di-cache SW  : index.html, manifest.json, icons (seluruh app shell)
 * Yang TIDAK di-cache: IndexedDB (data inspeksi) — dikelola app langsung
 *
 * PERHATIAN: Setiap kali sw.js diperbarui, WAJIB ubah CACHE_NAME
 * agar browser mendeteksi perubahan dan menghapus cache lama.
 */

const CACHE_NAME = 'ikl-sppg-v2026.1.0';

// App Shell — semua file yang dibutuhkan agar app berjalan offline
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
];

/* ── INSTALL: cache seluruh app shell ────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // addAll gagal jika salah satu resource tidak ditemukan
        // Gunakan individual add dengan fallback agar tidak block install
        return Promise.allSettled(
          APP_SHELL.map(url => cache.add(url).catch(err => {
            console.warn('[SW] Gagal cache:', url, err.message);
          }))
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: hapus cache versi lama ───────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.warn('[SW] Menghapus cache lama:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH: Cache-First, fallback ke network ─────────────────── */
self.addEventListener('fetch', event => {
  // Hanya handle GET request dari origin yang sama
  const url = new URL(event.request.url);
  if(event.request.method !== 'GET') return;
  if(url.origin !== self.location.origin) return;

  // Jangan cache API calls atau request dengan query string non-trivial
  // (kecuali ?t= dari update checker yang harus selalu ke network)
  if(url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Cache hit → serve dari cache langsung
      if(cached) return cached;

      // Cache miss → fetch dari network dan simpan
      return fetch(event.request)
        .then(response => {
          // Hanya cache response yang valid (status 200, same-origin)
          if(!response || response.status !== 200 || response.type !== 'basic'){
            return response;
          }
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, toCache));
          return response;
        })
        .catch(() => {
          // Network gagal DAN tidak ada cache
          // Fallback ke index.html untuk navigasi
          if(event.request.mode === 'navigate'){
            return caches.match('/index.html');
          }
          // Resource lain: return empty response daripada crash
          return new Response('', { status: 408, statusText: 'Offline' });
        });
    })
  );
});

/* ── MESSAGE: trigger update manual dari app ──────────────────── */
self.addEventListener('message', event => {
  if(event.data === 'SKIP_WAITING') self.skipWaiting();
});
