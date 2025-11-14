import { Timestamp } from 'firebase/firestore';

/**
 * Presence entity - for real-time collaboration awareness
 * Stored in presence/{tripId}/users/{userId} subcollection
 * Ephemeral data showing who's currently viewing a trip
 */
export interface Presence {
  userId: string;
  phoneNumber: string;
  displayName: string;
  lastSeen: Timestamp;
  currentlyViewing: boolean;
}
