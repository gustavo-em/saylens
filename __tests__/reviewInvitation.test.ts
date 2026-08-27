import {
  EMPTY_REVIEW_INVITATION,
  recordDeclined,
  recordInvitationShown,
  recordPronunciationSuccess,
  recordRated,
  sanitizeReviewInvitation,
  shouldInviteReview,
} from '../src/features/learning/domain/ReviewInvitation';

const NOW = 1_700_000_000_000;
const A_WEEK = 7 * 24 * 60 * 60 * 1000;

function afterSuccesses(count: number) {
  let state = EMPTY_REVIEW_INVITATION;
  for (let index = 0; index < count; index += 1) {
    state = recordPronunciationSuccess(state);
  }

  return state;
}

describe('review invitation', () => {
  it('says nothing until the app has helped a few times', () => {
    expect(shouldInviteReview(afterSuccesses(4), NOW)).toBe(false);
    expect(shouldInviteReview(afterSuccesses(5), NOW)).toBe(true);
  });

  it('waits a week before asking a second time', () => {
    const asked = recordInvitationShown(afterSuccesses(5), NOW);

    expect(shouldInviteReview(asked, NOW + A_WEEK - 1)).toBe(false);
    expect(shouldInviteReview(asked, NOW + A_WEEK)).toBe(true);
  });

  it('never asks again once the learner has rated', () => {
    const rated = recordRated(afterSuccesses(20));

    expect(shouldInviteReview(rated, NOW + A_WEEK * 10)).toBe(false);
  });

  it('never asks again once the learner has said no', () => {
    const declined = recordDeclined(afterSuccesses(20));

    expect(shouldInviteReview(declined, NOW + A_WEEK * 10)).toBe(false);
  });

  it('starts over when the stored state is malformed', () => {
    expect(sanitizeReviewInvitation('nonsense')).toEqual(
      EMPTY_REVIEW_INVITATION,
    );
    expect(sanitizeReviewInvitation({ successes: -3 }).successes).toBe(0);
    expect(sanitizeReviewInvitation({ hasRated: 'yes' }).hasRated).toBe(false);
  });

  it('keeps what a valid stored state says', () => {
    const stored = {
      successes: 7,
      lastAskedAtMs: NOW,
      hasRated: false,
      hasDeclined: false,
    };

    expect(sanitizeReviewInvitation(stored)).toEqual(stored);
  });
});
