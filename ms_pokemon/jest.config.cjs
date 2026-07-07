/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/app.js',
    '!src/config/db.js',
    '!src/config/env.js',
    '!src/routes/**'
  ],
  coverageThreshold: {
    global: { lines: 90, functions: 90, branches: 85, statements: 90 }
  }
};
