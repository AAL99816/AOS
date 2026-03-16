'use strict';

const CACHE = 'aos-v4';

const SHELL = [
  '/',
  '/index.html',
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
  '/Renderer/media.js',
  '/Renderer/review.js',
  '/Renderer/settings.js',
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
  /* Cache-first for app shell */
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
