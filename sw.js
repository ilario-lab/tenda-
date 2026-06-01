const CACHE = 'tenda-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Le richieste all'API Gemini non vanno mai in cache
  if (url.pathname.includes('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Strategia: cache-first per file statici, network-first per il resto
  if (
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/' ||
    url.pathname.endsWith('/')
  ) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        }).catch(() => cached || new Response('Offline', { status: 503 }));
      })
    );
  } else {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then(c => c || new Response('Offline', { status: 503 }))
      )
    );
  }
});
