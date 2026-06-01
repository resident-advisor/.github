module.exports = {
  extends: ['@resident-advisor'],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    project: './tsconfig.json',
  },
  ignorePatterns: ['**/*.test.js', 'node_modules/**'],
}
