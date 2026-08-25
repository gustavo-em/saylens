import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LearnerProgressStore } from '../../application/ports/LearnerProgressStore';

const STORAGE_KEY = 'saylens.progress.v1';

export const asyncStorageLearnerProgressStore: LearnerProgressStore = {
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
