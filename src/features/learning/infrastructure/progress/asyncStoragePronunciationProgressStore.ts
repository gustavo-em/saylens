import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PronunciationProgressStore } from '../../application/ports/PronunciationProgressStore';

const STORAGE_KEY = 'saylens.pronunciation.v1';

export const asyncStoragePronunciationProgressStore: PronunciationProgressStore =
  {
    async load() {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored == null) return null;

      try {
        return JSON.parse(stored);
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return null;
      }
    },
    async save(progress) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    },
  };
