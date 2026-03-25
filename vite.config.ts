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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // SSR フレームワークでは auto 注入が動かないため手動登録
      injectRegister: false,
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
        icons: [
          {
            src: "/favicon.ico",
            sizes: "32x32",
            type: "image/x-icon",
          },
          {
            src: "/logo-light.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/logo-light.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/logo-dark.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/logo-dark.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/logo-light.png",
            sizes: "540x720",
            type: "image/png",
            form_factor: "narrow",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true,
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