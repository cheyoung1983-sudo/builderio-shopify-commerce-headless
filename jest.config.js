module.exports = {
  testEnvironment: 'jsdom',
  modulePathIgnorePatterns: [
    '<rootDir>/.agents/',
    '<rootDir>/.claude/'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/.agents/',
    '<rootDir>/.claude/'
  ]
};
