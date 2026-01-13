
// 基础的 Service Worker，用于启用 PWA 安装功能
const CACHE_NAME = 'usana-inv-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 必须包含 fetch 事件监听，浏览器才会认为这是可安装的 App
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
