const CACHE_NAME = 'mahjong-score-v3';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './icon.png',
  './manifest.json'
];

// 安装 Service Worker 并缓存资源
self.addEventListener('install', event => {
  self.skipWaiting(); // 强制立即接管控制权
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 捕获请求并返回缓存（支持离线）
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存命中则返回，否则发起网络请求
        return response || fetch(event.request);
      })
  );
});

// 激活时清除旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    self.clients.claim().then(() => {
      return caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      });
    })
  );
});
