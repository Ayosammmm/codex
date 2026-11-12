import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Le backend est servi via le proxy de Vite : pas de CORS, URLs relatives (/api, /uploads)
  const backend = env.VITE_BACKEND_URL || 'http://localhost:5000';

  return {
    plugins: [react()],
    css: {
      modules: {
        // Classes lisibles en dev (Composant_classe_hash), courtes en production
        generateScopedName: mode === 'production' ? '[hash:base64:6]' : '[name]_[local]_[hash:base64:4]',
      },
    },
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: {
      host: true,
      port: 5174,
      proxy: {
        '/api': backend,
        '/uploads': backend,
      },
    },
  };
});
