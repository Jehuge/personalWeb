import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // 供 dev server 代理使用，避免 Vite 直接把 /api 请求返回自身的 index.html
  const backendTarget = env.VITE_BACKEND_URL
    || env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '')
    || 'http://127.0.0.1:8000';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [
      react(),
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240, // 10kb
        deleteOriginFile: false
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
        deleteOriginFile: false
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['framer-motion', 'lucide-react', 'styled-components'],
            'vendor-mermaid': ['mermaid'],
            'vendor-utils': ['@google/genai', 'd3', 'ut2']
          }
        }
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
