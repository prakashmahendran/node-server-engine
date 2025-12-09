import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { files: ['src/**/*.{js,mjs,cjs,ts}', 'test/**/*.{js,mjs,cjs,ts}'] },
  { 
    languageOptions: { 
      globals: { ...globals.node },
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module'
      }
    } 
  },
  pluginJs.configs.recommended,
  { ignores: ['**/*.test.ts', '**/*.d.ts', 'dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }]
    }
  }
];
