import { NativeModules, Platform } from 'react-native';

import type { AppReviewPrompter } from '../../application/ports/AppReviewPrompter';

interface NativeAppReview {
  requestReview(): Promise<boolean>;
}

function nativeModule(): NativeAppReview | null {
  const module = (NativeModules as Record<string, unknown>).SayLensAppReview;

  return (module as NativeAppReview | undefined) ?? null;
}

export const systemAppReviewPrompter: AppReviewPrompter = {
  async requestReview() {
    const module = nativeModule();

    // Android's in-app review needs Play services that this build does not
    // carry yet, so there the prompt is simply not offered rather than being
    // faked with a link to the store.
    if (module == null || Platform.OS !== 'ios') return false;

    try {
      return await module.requestReview();
    } catch {
      return false;
    }
  },
};
