module.exports = {
  // Run tests in a Node environment
  testEnvironment: 'node',

  // Match test files in both `tests` and `scripts/**/__tests__`
  testMatch: [
    '**/tests/**/*.test.js',
    '**/scripts/**/__tests__/**/*.test.js',
    '**/scripts/**/*.spec.js' // Optional: also match .spec.js
  ],

  // Enable code coverage collection
  collectCoverage: true,

  // Output coverage reports here
  coverageDirectory: 'coverage',

  // Collect coverage only from script files, excluding config/mocks/test files
  collectCoverageFrom: [
    'scripts/**/*.js',
    '!scripts/**/jest.config.js',
    '!scripts/**/node_modules/**',
    '!scripts/**/__mocks__/**',
    '!scripts/**/__tests__/**'
  ],

  // Global thresholds for coverage
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
