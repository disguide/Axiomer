import { defineConfig } from "vitest/config";
import path from "node:path";

// Separate from vite.config.ts so tests aren't affected by `root: "client"`.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "client/src/**/*.{test,spec}.ts",
      "packages/*/src/**/*.{test,spec}.ts",
    ],
  },
});
