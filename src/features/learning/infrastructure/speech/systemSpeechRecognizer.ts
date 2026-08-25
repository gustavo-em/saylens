import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

import type { SpeechRecognizer } from '../../application/ports/SpeechRecognizer';
import type { LearningLanguage } from '../../domain/LearningLanguage';

interface NativeSpeechModule {
  isAvailable(): Promise<boolean>;
  hasPermission(): Promise<boolean>;
  listen(languageTag: string): Promise<string[]>;
  cancel(): Promise<void>;
}

const recognitionLocales: Record<LearningLanguage, string> = {
  'pt-BR': 'pt-BR',
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  es: 'es-ES',
};

function nativeModule(): NativeSpeechModule {
  const module = NativeModules.SayLensSpeechRecognition as
    | NativeSpeechModule
    | undefined;

  if (module == null) {
    throw new Error('The speech recognition module is unavailable.');
  }

  return module;
}

export const systemSpeechRecognizer: SpeechRecognizer = {
  isAvailable() {
    return nativeModule().isAvailable();
  },
  async hasPermission() {
    if (await nativeModule().hasPermission()) return true;
    if (Platform.OS !== 'android') return false;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  },
  listen(language) {
    return nativeModule().listen(recognitionLocales[language]);
  },
  cancel() {
    return nativeModule().cancel();
  },
};
