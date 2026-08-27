/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/app/App';
import { startUsageReporting } from './src/features/learning/infrastructure/usage/firebaseUsageReporter';
import { name as appName } from './app.json';

// Reporting is switched on once, before the first screen asks to be counted.
startUsageReporting();

AppRegistry.registerComponent(appName, () => App);
