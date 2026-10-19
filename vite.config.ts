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
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
