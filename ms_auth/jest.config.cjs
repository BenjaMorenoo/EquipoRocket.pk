/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',    // solo llama app.listen(), sin lógica
    '!src/config/db.js', // pg.Pool — mockeado en la frontera del test
    '!src/config/env.js' // solo lee process.env
  ],
  coverageThreshold: {
    global: {
      lines:      90,
      functions:  90,
      branches:   85,
      statements: 90
    }
  }
};
