import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

const config = defineConfig({
  plugins: [
    // @ts-expect-error
    reactRouter({
      appDirectory: "src",
    }),
    tsconfigPaths(),
    VitePWA({
      manifest: {
        name: "RakuJot - メモ管理アプリ",
        short_name: "RakuJot",
        description: "AIを搭載した高速メモ管理アプリケーション",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait-primary",
        categories: ["productivity"],
        screenshots: [
          {
            src: "/logo-light.png",
            sizes: "540x720",
            type: "image/png",
            form_factor: "narrow",
          },
        ],
      },
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^\/api\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true,
        navigateFallback: "index.html",
        type: "module",
      },
    }),
  ],
  server: {
    port: 3000,
  },
  ssr: {
    noExternal: ["tailwindcss"],
  },
});

export default config;