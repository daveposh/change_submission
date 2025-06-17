module.exports = [
  {
    files: ['app/scripts/**/*.js'],
    ignorePatterns: ['app/assets/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        Date: 'readonly',
        JSON: 'readonly',
        Object: 'readonly',
        Array: 'readonly',
        parseInt: 'readonly',
        isNaN: 'readonly',
        Promise: 'readonly',
        String: 'readonly',
        Math: 'readonly',
        getUserName: 'readonly',
        fetchUsers: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'no-undef': 'error'
    }
  },
  {
    files: ['app/scripts/vendor/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script'
    },
    rules: {
      'no-var': 'off',
      'no-empty-function': 'off',
      'prefer-const': 'off',
      'no-unused-vars': 'off'
    }
  }
]; 