export default {
  root: true,
  env: {
    browser: true,
    es2022: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-undef': 'error'
  },
  globals: {
    fdk: 'readonly',
    window: 'readonly',
    document: 'readonly'
  }
}; 