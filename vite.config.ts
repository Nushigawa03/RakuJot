import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
  plugins: [
    reactRouter({
      appDirectory: "src",
    }),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
  },
  ssr: {
    noExternal: ["tailwindcss"],
  },
});

export default config;