'use strict';

const CACHE = 'aos-v30';

const SHELL = [
  '/manifest.json',
  '/icons/icon.svg',
  '/Renderer/i18n.js',
  '/Renderer/web-api.js',
  '/Renderer/utils.js',
  '/Renderer/state.js',
  '/Renderer/auth.js',
  '/Renderer/sync.js',
  '/Renderer/updater.js',
  '/Renderer/habits.js',
  '/Renderer/fitness.js',
  '/Renderer/goals.js',
  '/Renderer/projects.js',
  '/Renderer/mediaSearch.js',
  '/Renderer/media.js',
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
     This ensures the browser always gets fresh HTML and can detect
     a new sw.js version without needing a hard refresh.
     Falls back to cached index.html if offline. */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  /* JS / CSS / assets — cache-first for fast loads */
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
