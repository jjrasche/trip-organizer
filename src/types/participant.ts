import { Timestamp } from 'firebase/firestore';

/**
 * Role-based access control for trip participants
 *
 * Owner: Full control, can delete trip
 * Editor: Can edit everything and manage participants, cannot delete trip
 * Viewer: Read-only access
 */
export type ParticipantRole = 'owner' | 'editor' | 'viewer';

/**
 * Participant data stored in trip's participants array
 * Contains denormalized user data for quick access
 */
export interface Participant {
  userId: string;
  phoneNumber: string;         // Denormalized from user for display/contact
  displayName: string;         // Denormalized from user for display
  role: ParticipantRole;
  joinedAt: Timestamp;
}

/**
 * Input for adding a participant to a trip
 */
export type AddParticipantInput = Pick<Participant, 'userId' | 'phoneNumber' | 'displayName' | 'role'>;
