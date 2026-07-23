module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.js", "!src/middleware/logger.js"],
  testMatch: ["**/__tests__/**/*.js", "**/*.test.js"],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetModules: true,
};
