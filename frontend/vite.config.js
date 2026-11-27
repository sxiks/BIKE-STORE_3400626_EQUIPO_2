import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Node 25+ trae su propio localStorage global. Desde Vitest 4 el entorno jsdom lo reemplaza
    // por el de jsdom, así que ya no hace falta pasar --no-experimental-webstorage.
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js'
  }
});
