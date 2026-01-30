const CACHE_NAME = 'usana-inv-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // 优先从网络获取，失败时回退到缓存
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request) || caches.match('/');
    })
  );
});