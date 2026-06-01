const globals = require('globals')

module.exports = [
  {
    ignores: ['**/*.test.js', 'node_modules/**'],
  },
  {
    files: ['.github/scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
    },
  },
]
