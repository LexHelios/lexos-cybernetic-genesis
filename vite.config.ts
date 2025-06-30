
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: {
      host: 'localhost',
      port: 8080
    },
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
      '/openapi.json': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:9000',
        ws: true,
        changeOrigin: true,
      },
      '/ws/monitoring': {
        target: 'ws://localhost:9000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    // Temporarily disable componentTagger to avoid CSP issues
    // mode === 'development' &&
    // componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
