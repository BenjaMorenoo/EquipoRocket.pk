/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text', 'lcov'],
  collectCoverageFrom: [
    'app.js'
  ],
  coverageThreshold: {
    global: { lines: 80, functions: 80, branches: 70, statements: 80 }
  }
};
