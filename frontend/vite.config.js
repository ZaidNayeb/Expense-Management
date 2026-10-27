import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Proxy API calls to Express so the browser sees one origin (no CORS, SameSite=Lax cookies).
      proxy: {
        '/api': { target: env.VITE_API_PROXY_TARGET || 'http://localhost:4000', changeOrigin: false },
      },
    },
  };
});
