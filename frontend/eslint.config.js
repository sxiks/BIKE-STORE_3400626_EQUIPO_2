// ESLint del frontend (auditoría H-11): detecta errores antes de correr las pruebas, como variables
// sin usar o sin declarar, identificadores duplicados y hooks de React mal usados. Sin reglas de estilo.
// Uso: npm run lint (falla también con avisos).
//
// De eslint-plugin-react-hooks se usan las dos reglas clásicas. Su configuración "recommended" (v7) agrega
// reglas pensadas para el React Compiler, que el proyecto no usa: marcan como error patrones válidos que
// aparecen en 16 lugares (setState al empezar una carga dentro de un efecto, la referencia con el valor
// más reciente). Adoptarlas exige reescribir esas cargas; queda como decisión aparte (ver ROADMAP).
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Quitar propiedades con { quitada, ...resto } es intencional (fixtures de las pruebas).
      'no-unused-vars': ['error', { ignoreRestSiblings: true }]
    }
  }
]);
