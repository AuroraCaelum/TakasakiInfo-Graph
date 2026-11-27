import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// `base: "./"` keeps every asset and data URL relative, so the site works at any path
// (GitHub Pages serves it under /<repository>/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      // The map, and the API reference at /api/ (Swagger UI, its own bundle).
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        api: fileURLToPath(new URL("api/index.html", import.meta.url)),
      },
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
