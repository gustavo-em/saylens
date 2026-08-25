import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FavoriteWordStore } from '../../application/ports/FavoriteWordStore';

const STORAGE_KEY = 'saylens.favorites.v1';

export const asyncStorageFavoriteWordStore: FavoriteWordStore = {
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
  async save(favorites) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  },
};
