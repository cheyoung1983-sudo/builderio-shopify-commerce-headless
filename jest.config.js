module.exports = {
  testEnvironment: 'jsdom',
  modulePathIgnorePatterns: [
    '<rootDir>/.agents/',
    '<rootDir>/.claude/',
    '<rootDir>/.next/'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/.agents/',
    '<rootDir>/.claude/',
    '<rootDir>/.next/'
  ]
};
