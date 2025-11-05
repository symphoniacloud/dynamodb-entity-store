import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import { defineConfig } from 'eslint/config'

export default defineConfig(eslint.configs.recommended, tseslint.configs.recommended, prettier, {
  files: ['**/*.{js,ts}']
})
