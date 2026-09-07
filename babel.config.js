const fs = require('fs');
const path = require('path');

function readEnvironment() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
      .map(line => {
        const separator = line.indexOf('=');
        if (separator < 0) return [line, ''];
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const environment = readEnvironment();
const diagnosticsEnabled =
  (process.env.LESINGO_SHOW_DIAGNOSTICS ??
    environment.LESINGO_SHOW_DIAGNOSTICS) === 'true';
const appVersion =
  process.env.VERSION_NAME ?? environment.VERSION_NAME ?? '1.0';

function inlineLesingoBuildFlags({ types }) {
  return {
    visitor: {
      ReferencedIdentifier(identifierPath) {
        if (identifierPath.node.name === '__LESINGO_DIAGNOSTICS__') {
          identifierPath.replaceWith(types.booleanLiteral(diagnosticsEnabled));
        } else if (identifierPath.node.name === '__LESINGO_VERSION__') {
          identifierPath.replaceWith(types.stringLiteral(appVersion));
        }
      },
    },
  };
}

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [inlineLesingoBuildFlags, 'react-native-worklets/plugin'],
};
