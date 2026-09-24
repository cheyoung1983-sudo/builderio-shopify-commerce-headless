module.exports = {
  testEnvironment: 'jsdom',
  modulePathIgnorePatterns: [
    '<rootDir>/.agents/',
    '<rootDir>/.claude/',
    '<rootDir>/.next/',
    '<rootDir>/.worktrees/',
    '<rootDir>/superpowers/'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/.agents/',
    '<rootDir>/.claude/',
    '<rootDir>/.next/',
    '<rootDir>/.worktrees/',
    '<rootDir>/superpowers/'
  ]
};
