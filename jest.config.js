module.exports = {
  testEnvironment: 'jsdom',
  modulePathIgnorePatterns: [
    '<rootDir>/.agents/',
    '<rootDir>/.claude/',
    '<rootDir>/superpowers/',
    '<rootDir>/chrome-devtools-mcp/'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/.agents/',
    '<rootDir>/.claude/',
    '<rootDir>/superpowers/',
    '<rootDir>/chrome-devtools-mcp/'
  ]
};
