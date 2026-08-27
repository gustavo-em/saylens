export interface ReviewInvitationState {
  /** Successful pronunciations since the app was installed. */
  successes: number;
  /** When the learner was last asked, so nobody is asked twice in a week. */
  lastAskedAtMs: number;
  /** Set once the learner has been sent to the store, which ends the asking. */
  hasRated: boolean;
  /** Set when the learner asks not to be bothered again. */
  hasDeclined: boolean;
}

export const EMPTY_REVIEW_INVITATION: ReviewInvitationState = {
  successes: 0,
  lastAskedAtMs: 0,
  hasRated: false,
  hasDeclined: false,
};

/**
 * How much has to go right before the app asks what a learner thinks of it.
 *
 * Asking after the first success is asking a stranger; asking after the fifth
 * is asking someone the app has already helped five times. And once asked,
 * a week has to pass before it is asked again — the fastest way to earn one
 * star is to interrupt somebody twice.
 */
const SUCCESSES_BEFORE_ASKING = 5;
const ASK_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function recordPronunciationSuccess(
  state: ReviewInvitationState,
): ReviewInvitationState {
  return { ...state, successes: state.successes + 1 };
}

export function shouldInviteReview(
  state: ReviewInvitationState,
  nowMs: number,
): boolean {
  if (state.hasRated || state.hasDeclined) return false;
  if (state.successes < SUCCESSES_BEFORE_ASKING) return false;

  return nowMs - state.lastAskedAtMs >= ASK_AGAIN_AFTER_MS;
}

export function recordInvitationShown(
  state: ReviewInvitationState,
  nowMs: number,
): ReviewInvitationState {
  return { ...state, lastAskedAtMs: nowMs };
}

export function recordRated(
  state: ReviewInvitationState,
): ReviewInvitationState {
  return { ...state, hasRated: true };
}

export function recordDeclined(
  state: ReviewInvitationState,
): ReviewInvitationState {
  return { ...state, hasDeclined: true };
}

/** Stored state is untrusted input, so anything malformed starts over. */
export function sanitizeReviewInvitation(
  stored: unknown,
): ReviewInvitationState {
  if (stored == null || typeof stored !== 'object') {
    return EMPTY_REVIEW_INVITATION;
  }

  const value = stored as Partial<ReviewInvitationState>;

  return {
    successes:
      typeof value.successes === 'number' && value.successes >= 0
        ? Math.floor(value.successes)
        : 0,
    lastAskedAtMs:
      typeof value.lastAskedAtMs === 'number' && value.lastAskedAtMs >= 0
        ? value.lastAskedAtMs
        : 0,
    hasRated: value.hasRated === true,
    hasDeclined: value.hasDeclined === true,
  };
}
