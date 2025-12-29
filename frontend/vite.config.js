import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-qr-scan-html',
      configureServer(server) {
        // Serve qr-scan.html directly without Vite processing
        // This prevents Vite from trying to resolve ES module imports in the HTML
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url === '/qr-scan.html' || req.url.startsWith('/qr-scan.html?'))) {
            const htmlPath = path.resolve(server.config.root, 'public', 'qr-scan.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');
            res.setHeader('Content-Type', 'text/html');
            res.statusCode = 200;
            res.end(html);
            return;
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/s3-proxy': {
        target: 'https://phygital-zone.s3.amazonaws.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/s3-proxy/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add CORS headers
            proxyReq.setHeader('Access-Control-Allow-Origin', '*');
            proxyReq.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            proxyReq.setHeader('Access-Control-Allow-Headers', '*');
          });
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    minify: 'esbuild', // Use esbuild for faster, more reliable builds
    target: 'es2015', // Ensure compatibility with older browsers
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'framer-motion'],
          utils: ['axios', 'qrcode']
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Copy public files including service worker and manifest
    copyPublicDir: true
  },
  define: {
    'process.env': process.env
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'qr-code-styling'],
    exclude: ['mindar-image-three', 'GLTFLoader', 'RoomEnvironment']
  }
})
