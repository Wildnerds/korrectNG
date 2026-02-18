/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/services/gateway',
    '<rootDir>/services/users',
    '<rootDir>/services/artisan',
    '<rootDir>/services/transaction',
    '<rootDir>/services/messaging',
    '<rootDir>/services/platform',
  ],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
