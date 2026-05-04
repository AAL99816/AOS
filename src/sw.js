'use strict';

const CACHE = 'aos-v57';

const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/Renderer/i18n.js',
  '/Renderer/web-api.js',
  '/Renderer/utils.js',
  '/Renderer/state.js',
  '/Renderer/auth.js',
  '/Renderer/sync.js',
  '/Renderer/updater.js',
  '/Renderer/exercises.js',
  '/Renderer/habits.js',
  '/Renderer/fitness.js',
  '/Renderer/projects.js',
  '/Renderer/mediaSearch.js',
  '/Renderer/media.js',
  '/Renderer/review.js',
  '/Renderer/modals.js',
  '/Renderer/settings.js',
  '/Renderer/features.js',
  '/Renderer/food.js',
  '/Renderer/today.js',
  '/Renderer/modules.js',
  '/Renderer/notes.js',
  '/Renderer/community.js',
  '/Renderer/app.js',
];

const APP_CODE_DESTINATIONS = new Set(['script', 'style', 'manifest', 'worker']);
const APP_CODE_EXTENSIONS = ['.js', '.css', '.json', '.webmanifest'];

function shellCacheKey(url) {
  return url === '/' ? '/index.html' : url;
}

async function precacheShell() {
  const cache = await caches.open(CACHE);
  await Promise.all(SHELL.map(async url => {
    const res = await fetch(new Request(url, { cache: 'reload' }));
    if (res && res.ok) await cache.put(shellCacheKey(url), res.clone());
  }));
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) await cache.put(fallbackUrl || request, res.clone());
    return res;
  } catch (_) {
    const cached = (fallbackUrl && await cache.match(fallbackUrl)) || await cache.match(request);
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request).then(res => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => undefined);
  return cached || await fresh || Response.error();
}

self.addEventListener('install', e => {
  e.waitUntil(precacheShell());
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
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.hostname !== self.location.hostname) return;
  if (url.pathname === '/config.js') return;

  if (e.request.mode === 'navigate') {
    e.respondWith(networkFirst(e.request, '/index.html'));
    return;
  }

  const isAppCode = APP_CODE_DESTINATIONS.has(e.request.destination) ||
    APP_CODE_EXTENSIONS.some(ext => url.pathname.endsWith(ext));

  e.respondWith(isAppCode ? networkFirst(e.request) : staleWhileRevalidate(e.request));
});
