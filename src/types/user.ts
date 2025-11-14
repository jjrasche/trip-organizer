import { Timestamp } from 'firebase/firestore';

/**
 * User entity - stored in users/{userId} collection
 * Phone number is the primary identifier for authentication
 */
export interface User {
  userId: string;              // Firestore document ID (matches auth UID)
  phoneNumber: string;         // PRIMARY: E.164 format (+1234567890)
  displayName: string;
  avatarUrl?: string;
  email?: string;              // Optional, for notifications
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Denormalized for quick access
  tripIds: string[];           // Array of trip IDs this user is part of
}

/**
 * Partial user data for creating new users
 */
export type CreateUserInput = Pick<User, 'phoneNumber' | 'displayName'> & {
  avatarUrl?: string;
  email?: string;
};

/**
 * Partial user data for updates
 */
export type UpdateUserInput = Partial<Pick<User, 'displayName' | 'avatarUrl' | 'email'>>;
