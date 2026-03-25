import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  appDirectory: "src",
  presets: [vercelPreset()],
  ssr: true,
  // 全ルートを初期 HTML に含める（lazy discovery を無効化）
  // これにより、オフライン時のナビゲーションで /__manifest を
  // fetch する必要がなくなり、"Failed to fetch" エラーが解消される
  routeDiscovery: { mode: "initial" },
} satisfies Config;
