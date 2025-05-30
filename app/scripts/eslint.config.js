module.exports = [
  {
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
  }
]; 