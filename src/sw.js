'use strict';

const CACHE = 'aos-v49';

const SHELL = [
  '/manifest.json',
  '/icons/icon.svg',
  '/Renderer/i18n.js',
  '/Renderer/web-api.js',
  '/Renderer/utils.js',
  '/Renderer/state.js',
  '/Renderer/auth.js',
  '/Renderer/modules.js',
  '/Renderer/sync.js',
  '/Renderer/updater.js',
  '/Renderer/habits.js',
  '/Renderer/fitness.js',
  '/Renderer/exercises.js',

  '/Renderer/projects.js',
  '/Renderer/mediaSearch.js',
  '/Renderer/media.js',
  '/Renderer/notes.js',
  '/Renderer/review.js',
  '/Renderer/settings.js',
  '/Renderer/features.js',
  '/Renderer/food.js',
  '/Renderer/modals.js',
  '/Renderer/app.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Pass through: Supabase, Google Fonts, CDNs */
  if (url.hostname !== self.location.hostname) return;

  /* Navigation requests (HTML page loads) — always go to network.
     Falls back to cached index.html if offline. */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  /* JS / CSS / assets — stale-while-revalidate:
     Serve cached version immediately for speed, fetch fresh copy in
     background so the *next* load always gets updated code.
     Falls back to cache if offline. */
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          if (res && res.status === 200) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
