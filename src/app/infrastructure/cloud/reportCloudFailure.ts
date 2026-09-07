/**
 * Says out loud that a write to the account failed.
 *
 * Cloud sync is never worth an interrupted screen, so every call site swallows
 * its error — which also means a project whose Firestore rules were never
 * published looks exactly like one that is working. This puts the reason in the
 * device log, where `adb logcat -s ReactNativeJS` or the Xcode console will
 * show it, without putting anything in front of the learner.
 */
export function reportCloudFailure(operation: string, error: unknown) {
  const reason =
    (error as { code?: string })?.code ??
    (error as { message?: string })?.message ??
    String(error);

  console.warn(`[lesingo] cloud ${operation} failed: ${reason}`);
}
