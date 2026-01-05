/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_PREFIX = 'rakujot-cache';
const CACHE_VERSION = 'v1';
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;

// キャッシュ対象のアセット
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
];

// インストール処理
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to cache static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// アクティベーション処理（古いキャッシュを削除）
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// フェッチ処理（キャッシュ戦略）
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // APIリクエストはネットワーク優先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // その他はキャッシュ優先
  event.respondWith(cacheFirst(request));
});

// キャッシュ優先戦略
async function cacheFirst(request: Request): Promise<Response> {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (!response || response.status !== 200 || response.type !== 'basic') {
      return response;
    }

    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    console.error('cacheFirst error:', error);
    throw error;
  }
}

// ネットワーク優先戦略
async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

export {};
