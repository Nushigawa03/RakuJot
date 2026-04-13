/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// ─── プリキャッシュ ──────────────────────────────────
// vite-plugin-pwa が自動的にプリキャッシュマニフェストを注入する
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── React Router マニフェスト キャッシュ ──────────────
// React Router v7 SSR のルート探索で /__manifest をフェッチする。
// オフライン時にもナビゲーションが動作するよう、NetworkFirst でキャッシュ。
registerRoute(
  ({ url }) => url.pathname.startsWith('/__manifest'),
  new NetworkFirst({
    cacheName: 'rr-manifest-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24,   // 24h
      }),
    ],
  })
);

// ─── ナビゲーション (HTML) — ネットワーク優先 ─────────
// SSR アプリなのでナビゲーションもネットワーク優先にし、
// オフライン時にはキャッシュから返す。
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
);

// ─── JS / CSS アセット — StaleWhileRevalidate ────────
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'assets-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30,  // 30 days
      }),
    ],
  })
);

// ─── Google Fonts キャッシュ ──────────────────────────
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

// ─── API リクエスト — ネットワーク優先 ─────────────────
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5,
      }),
    ],
  })
);

// ─── Service Worker ライフサイクル ────────────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

// ─── メッセージハンドラー ─────────────────────────────
// ログアウト時にAPIキャッシュをクリアするため
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_API_CACHE') {
    caches.delete('api-cache').catch(() => {});
    caches.delete('pages-cache').catch(() => {});
    caches.delete('rr-manifest-cache').catch(() => {});
  }
});
