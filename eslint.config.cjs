const reactPlugin = require('eslint-plugin-react');

module.exports = {
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      }
    },
    globals: {
      // Browser globals
      window: 'readonly',
      document: 'readonly',
      console: 'readonly',
      localStorage: 'readonly',
      setTimeout: 'readonly',
      clearTimeout: 'readonly',
      Event: 'readonly',
      Blob: 'readonly',
      bootstrap: 'readonly',
      Shepherd: 'readonly',
      // App globals
      getUserName: 'readonly',
      getAssetTypeName: 'readonly',
      getLocationName: 'readonly',
      fetchUsers: 'readonly',
      preloadAssetUsers: 'readonly',
      getUserDetails: 'readonly',
      debugUserCacheStatus: 'readonly',
      clearFieldHighlighting: 'readonly',
      showNotification: 'readonly',
      switchTab: 'readonly'
    }
  },
  plugins: {
    react: reactPlugin
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'no-undef': 'error',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'no-control-regex': 'off'
  }
}; 