'use strict';
const BUILD = '__BUILD__';
const CACHE_PREFIX = 'mybody20-';
const STATIC_CACHE = `${CACHE_PREFIX}static-${BUILD}`;
const PAGE_CACHE = `${CACHE_PREFIX}pages-${BUILD}`;
const APP_SHELL = ['./', './index.html', './latest.html', './manifest.json', './style.css', './production.css', './assets/workout-hero.webp', './assets/exercises/dumbbell-bench-press-480.webp', './assets/exercises/dumbbell-bench-press-720.webp', './assets/exercises/dumbbell-bench-press.gif', './assets/exercises/lat-pulldown-480.webp', './assets/exercises/lat-pulldown-720.webp', './assets/exercises/lat-pulldown.gif', './assets/exercises/barbell-squat-480.webp', './assets/exercises/barbell-squat-720.webp', './assets/exercises/barbell-squat.gif', './assets/exercises/dumbbell-curl-480.webp', './assets/exercises/dumbbell-curl-720.webp', './assets/exercises/dumbbell-curl.gif', './food-data.js', './auth-onboarding.js', './core-storage.js', './app-production.js', './navigation-fix.js', './build-live.js', './icons/icon-192.png', './apple-touch-icon.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && ![STATIC_CACHE, PAGE_CACHE].includes(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (_) {
    return (await cache.match(request)) || (await caches.match('./index.html')) || Response.error();
  }
}
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/build.json')) {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => new Response(JSON.stringify({ build: BUILD }), { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  if (request.mode === 'navigate') { event.respondWith(networkFirst(request)); return; }
  event.respondWith(staleWhileRevalidate(request));
});
self.addEventListener('message', (event) => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
