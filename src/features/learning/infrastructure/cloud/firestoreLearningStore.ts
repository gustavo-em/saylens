import { getApp } from '@react-native-firebase/app';
import {
  deleteDoc,
  doc,
  getDoc,
  getDocFromCache,
  initializeFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';

import type { CloudLearningStore } from '../../application/ports/CloudLearningStore';

/**
 * Firestore with its local copy asked for by name.
 *
 * The native SDKs keep a cache and queue writes by default, which is what lets
 * a signed-in learner keep working with no signal and have it land later. It is
 * asked for here rather than relied on, so an SDK that changes its default
 * cannot quietly make the app offline-hostile. Repeated calls return the same
 * instance.
 */
function database() {
  return initializeFirestore(getApp(), { persistence: true });
}

function userDocument(userId: string) {
  return doc(database(), 'users', userId);
}

export const firestoreLearningStore: CloudLearningStore = {
  async load(userId) {
    const document = userDocument(userId);

    try {
      const snapshot = await getDoc(document);
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      // Offline, the server read fails. The cache is what this device last saw
      // of the account, which is a far better base to merge onto than nothing:
      // merging onto nothing is how a plane trip erases an account's words.
      if ((error as { code?: string })?.code !== 'firestore/unavailable') {
        throw error;
      }

      const cached = await getDocFromCache(document);
      return cached.exists() ? cached.data() : null;
    }
  },

  async save(userId, data) {
    await setDoc(userDocument(userId), {
      ...data,
      serverUpdatedAt: serverTimestamp(),
    });
  },

  async delete(userId) {
    await deleteDoc(userDocument(userId));
  },
};
