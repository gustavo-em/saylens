module.exports = {
  moduleNameMapper: {
    '\\.(svg)$': '<rootDir>/__mocks__/svgMock.js',
  },
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['./jest-setup.js'],
  // The native folders carry vendored dependencies with test suites of their
  // own — CocoaPods checkouts, Gradle caches — written against toolchains this
  // project does not configure. Running them says nothing about this app, and
  // jest prunes their snapshots as obsolete while it is in there.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
};
