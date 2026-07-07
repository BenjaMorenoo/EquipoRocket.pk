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
    global: { lines: 88, functions: 88, branches: 77, statements: 88 }
  }
};
