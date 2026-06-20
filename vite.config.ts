import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || ''),
    'process.env.VITE_TMDB_API_KEY': JSON.stringify(process.env.VITE_TMDB_API_KEY || ''),
    'process.env.VITE_TMDB_BASE_URL': JSON.stringify(process.env.VITE_TMDB_BASE_URL || '')
  },
  server: {
    port: 3001,
    open: true,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'recharts']
        }
      }
    }
  }
});