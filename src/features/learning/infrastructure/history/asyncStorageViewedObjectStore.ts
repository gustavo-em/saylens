import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ViewedObjectStore } from '../../application/ports/ViewedObjectStore';

const STORAGE_KEY = 'saylens.viewed-objects.v1';

export const asyncStorageViewedObjectStore: ViewedObjectStore = {
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
  async save(history) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  },
};
