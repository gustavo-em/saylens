import { NativeModules } from 'react-native';

import type { PronunciationPlayer } from '../../application/ports/PronunciationPlayer';
import type { LearningLanguage } from '../../domain/LearningLanguage';

interface NativePronunciationModule {
  speak(text: string, languageTag: string, rate: number): Promise<void>;
  stop(): Promise<void>;
}

const speechLocales: Record<LearningLanguage, string> = {
  'pt-BR': 'pt-BR',
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  es: 'es-ES',
};

const PRONUNCIATION_RATE = 0.82;

function getNativePronunciationModule(): NativePronunciationModule {
  const module = NativeModules.SayLensPronunciation as
    | NativePronunciationModule
    | undefined;

  if (module == null) {
    throw new Error('The system pronunciation module is unavailable.');
  }

  return module;
}

export const systemPronunciationPlayer: PronunciationPlayer = {
  async speak(word, language) {
    await getNativePronunciationModule().speak(
      word,
      speechLocales[language],
      PRONUNCIATION_RATE,
    );
  },
  async stop() {
    await getNativePronunciationModule().stop();
  },
};
