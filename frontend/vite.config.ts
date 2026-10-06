import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// import.meta.url rather than __dirname: this config is ESM, and Vite's
// native config loader does not provide CommonJS globals.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(rootDir, "./src") },
  },
  server: {
    // During `npm run dev` the FastAPI backend stays on :8000; proxy the API
    // so the frontend can call relative /api paths in both dev and build.
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
  build: {
    // FastAPI serves this directory in production (see calcmate/server.py).
    outDir: "dist",
    emptyOutDir: true,
  },
});
