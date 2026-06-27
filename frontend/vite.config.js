import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Offline mode: precache the built app shell so Wandr loads without a
    // network, and keep the Google Fonts stylesheet in a runtime cache so the
    // UI still renders its serif offline. The service worker only runs in a
    // production build (`npm run build && npm run preview`), not in `npm run dev`.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa.svg"],
      manifest: {
        name: "Wandr — AI Travel Guide",
        short_name: "Wandr",
        description: "Plan a city trip with AI, then browse it offline.",
        theme_color: "#0a8e84",
        background_color: "#f5f3ee",
        display: "standalone",
        icons: [
          { src: "pwa.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
