import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Node 25+ trae su propio localStorage global (Web Storage) y, sin --localstorage-file,
    // queda inservible y tapa el de jsdom: todas las pruebas fallan en localStorage.clear().
    // Se desactiva solo en los procesos de prueba. La opción existe desde Node 22.4,
    // así que funciona igual en las versiones soportadas (22.12+, 24 LTS, 25).
    poolOptions: {
      forks: { execArgv: ['--no-experimental-webstorage'] }
    }
  }
});
