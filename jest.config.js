module.exports = {
  moduleNameMapper: {
    '\\.(svg)$': '<rootDir>/__mocks__/svgMock.js',
  },
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['./jest-setup.js'],
};
