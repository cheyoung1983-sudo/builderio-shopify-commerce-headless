import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules'

const eslintConfig = defineConfig([
  ...nextVitals,
  firebaseRulesPlugin.configs['flat/recommended'],
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
  ]),
])

export default eslintConfig
