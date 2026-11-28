// ESLint del backend (auditoría H-11): detecta errores antes de correr las pruebas, como variables
// sin usar o sin declarar e identificadores duplicados. Reglas recomendadas, sin reglas de estilo.
// Uso: npm run lint (falla también con avisos).
const js = require('@eslint/js');
const globals = require('globals');
const { defineConfig, globalIgnores } = require('eslint/config');

module.exports = defineConfig([
  globalIgnores(['uploads', 'coverage']),
  {
    // El código de la API, los scripts y los helpers de las pruebas son CommonJS (require).
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: {
      'no-unused-vars': ['error', { ignoreRestSiblings: true }]
    }
  },
  {
    // Los archivos de prueba y la configuración de Vitest usan import (módulos ES).
    files: ['tests/**/*.test.js', 'tests/setup.js', '**/*.mjs'],
    languageOptions: { sourceType: 'module' }
  }
]);
