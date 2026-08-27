import type { ReviewInvitationState } from '../../domain/ReviewInvitation';

export interface ReviewInvitationStore {
  load(): Promise<ReviewInvitationState | null>;
  save(state: ReviewInvitationState): Promise<void>;
}
