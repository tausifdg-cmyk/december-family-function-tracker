'use strict';
importScripts('./exercise-library.js');
const BUILD = '__BUILD__';
const CACHE_PREFIX = 'mybody20-';
const STATIC_CACHE = `${CACHE_PREFIX}static-${BUILD}`;
const PAGE_CACHE = `${CACHE_PREFIX}pages-${BUILD}`;
const ESSENTIAL_SHELL = ['./', './index.html', './manifest.json', './production.css', './coach.css', './phase2.css', './workout-redesign.css', './today-redesign.css', './phase3.css', './phase4.css', './phase5.css', './food-data.js', './supabase-cloud.js', './auth-onboarding.js', './cloud-auto-connect.js', './login-forgot-password.js', './admin-ui.js', './profile-dropdown.js', './admin-dashboard.css', './core-storage.js', './coach-engine.js', './coach-guard.js', './coach-ui.js', './phase2.js', './workout-redesign.js', './today-redesign.js', './phase3.js', './phase4.js', './phase5.js', './exercise-library.js', './app-production.js', './health-sync.js', './navigation-fix.js', './build-live.js', './icons/icon-192.png', './apple-touch-icon.png'];
const EXERCISE_MEDIA = [...new Set(self.MyBodyExerciseLibrary.exercises.flatMap((exercise) => [exercise.media?.src, exercise.media?.poster, exercise.media?.fallback].filter(Boolean)).map((asset) => `./${asset}`))];
const OPTIONAL_ASSETS = ['./latest.html', './assets/workout-hero.webp'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then(async (cache) => {
    await cache.addAll([...ESSENTIAL_SHELL, ...EXERCISE_MEDIA]);
    await Promise.allSettled(OPTIONAL_ASSETS.map((asset) => cache.add(asset)));
  }).then(() => self.skipWaiting()));
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
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || './';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    const existing = wins.find((win) => 'focus' in win);
    if (existing) return existing.focus();
    return clients.openWindow ? clients.openWindow(target) : null;
  }));
});
self.addEventListener('message', (event) => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
