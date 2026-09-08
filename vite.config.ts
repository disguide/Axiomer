import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: "client",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  server: { proxy: { '/api': 'http://127.0.0.1:4174' } },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
  },
});
