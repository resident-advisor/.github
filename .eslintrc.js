module.exports = {
  extends: ['@resident-advisor'],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    'no-console': 'off',
  },
  ignorePatterns: ['**/*.test.js', 'node_modules/**'],
}
