import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  base: '/',
  plugins: [react(), commonjs()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom']
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'chart-vendor': ['recharts'],
          'utils-vendor': ['date-fns', 'nanoid']
        }
      }
    }
  },
  define: {
    'process.env': {},
    'process.version': '"v16.0.0"',
    'process.platform': '"browser"',
    'process': {
      stdout: {
        isTTY: false
      }
    },
    global: 'globalThis',
  }
});