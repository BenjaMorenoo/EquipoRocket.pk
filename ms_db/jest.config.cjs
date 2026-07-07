/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text', 'lcov'],
  collectCoverageFrom: [
    'server.js',
  ],
  coverageThreshold: {
    global: { lines: 70, functions: 80, branches: 60, statements: 70 }
  },
  // server.js calls app.listen() at module level — forceExit closes the handle
  forceExit: true,
};
