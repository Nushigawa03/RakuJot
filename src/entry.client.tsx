import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { performSync } from "./features/sync/syncService";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
});

// 認証を確認してユーザー DB に切り替え、初回同期する（未ログイン・オフラインならローカルのみ）
performSync().catch(console.error);

// vite-plugin-pwa の自動登録は SSR では動かないため手動で登録する（dev: /dev-sw.js?dev-sw, prod: /sw.js）
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(import.meta.env.DEV ? "/dev-sw.js?dev-sw" : "/sw.js", { type: import.meta.env.DEV ? "module" : "classic", scope: "/" })
      .catch((error) => console.warn("[SW] Service Worker registration failed:", error));
  });
}
