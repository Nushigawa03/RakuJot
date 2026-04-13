import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { setLoggedIn, initialSync, initSyncListeners } from "./features/sync/syncService";
import { setCurrentUserId } from "./features/sync/localDb";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
});

// ─── Service Worker 手動登録 ─────────────────────────
// vite-plugin-pwa の injectRegister は SSR では動作しないため手動で登録
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      // vite-plugin-pwa は dev では /dev-sw.js?dev-sw、prod では /sw.js を生成
      const swUrl = import.meta.env.DEV ? "/dev-sw.js?dev-sw" : "/sw.js";
      const registration = await navigator.serviceWorker.register(swUrl, {
        type: import.meta.env.DEV ? "module" : "classic",
        scope: "/",
      });

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated") {
              console.log("[SW] New service worker activated");
            }
          });
        }
      });

      console.log("[SW] Service Worker registered:", swUrl);
    } catch (error) {
      console.warn("[SW] Service Worker registration failed:", error);
    }

    // ─── 認証確認後に初期同期 ─────────────────────────
    initSyncListeners();

    try {
      if (navigator.onLine) {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user?.id) {
            // ログイン済み → ユーザーDBに切り替え＆同期
            await setLoggedIn(data.user.id);
            await initialSync();
            return;
          }
        }
      }
    } catch {
      // ネットワークエラー → オフラインとして扱う
    }

    // 未ログインまたはオフライン → 匿名DBで動作
    setCurrentUserId(null);
    await initialSync();
  });
}
