// sw.js — Tenda di Convegno
// Aggiornare CACHE_NAME ad ogni deploy per forzare il refresh

const CACHE_NAME = 'tenda-v5';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Versioni Bibbia (JSON locali)
  './bibles/NuovaRiveduta.json',
  './bibles/NuovaDiodati.json',
  './bibles/KJV.json',
  './bibles/NKJV.json',
  './bibles/AMP.json',
  './bibles/NR2020.json',
];

// ── Install: pre-cacha le risorse statiche ─────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: elimina cache vecchie ───────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first per risorse locali, network-first per API esterne ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Richieste verso API esterne → network-first, fallback cache
  const isExternal =
    url.hostname !== self.location.hostname &&
    url.hostname !== 'localhost';

  if (isExternal) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          // Salva in cache solo risposte valide
          if (resp && resp.status === 200 && resp.type !== 'opaque') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Risorse locali (HTML, JSON bibles, icone ecc.) → cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});
