import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// base: "./" keeps asset paths relative so it works on any host or subfolder.
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      output: {
        // Keep the (optional) Supabase client in its own named chunk so it can
        // be excluded from the PWA precache — local-only installs never download it.
        manualChunks: (id) => (id.includes("@supabase") ? "supabase" : undefined),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["apple-touch-icon.png", "favicon.ico"],
      manifest: {
        name: "PanelPro",
        short_name: "PanelPro",
        description: "Squad, line-outs, live match tracking and reports for your club.",
        theme_color: "#18181b",
        background_color: "#18181b",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
        // The Supabase chunk is only needed when cloud sync is switched on; fetch
        // it on demand rather than precaching it onto every phone.
        globIgnores: ["**/supabase-*.js"]
      }
    })
  ]
});
