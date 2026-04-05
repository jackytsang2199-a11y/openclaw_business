import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { generateZhCN } from "./scripts/opencc-convert";
import { generateSitemap } from "./scripts/generate-sitemap";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: 'opencc-zh-cn',
      buildStart() {
        generateZhCN();
      },
      configureServer() {
        generateZhCN();
      },
    },
    {
      name: 'sitemap-generator',
      closeBundle() {
        generateSitemap(path.resolve(__dirname, 'dist'));
      },
      configureServer() {
        generateSitemap(path.resolve(__dirname, 'public'));
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
