import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'saylens.last-open.v1';

/**
 * When the app was last opened, which is the only thing kept to answer whether
 * a learner came back the next day.
 */
export const asyncStorageVisitStore = {
  async load(): Promise<number | null> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored == null) return null;

    const parsed = Number(stored);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  },
  async save(atMs: number): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, String(atMs));
  },
};
