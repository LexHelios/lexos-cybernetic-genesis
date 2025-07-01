
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:9000',
        ws: true,
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-slot', '@radix-ui/react-toast'],
        }
      }
    }
  },
  preview: {
    port: 8080,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:9000',
        ws: true,
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
