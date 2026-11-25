import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    // Todas las pruebas comparten una sola base de datos: un archivo a la vez.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000
  }
});
