import { Timestamp } from 'firebase/firestore';
import { Participant } from './participant';
import { Day } from './day';

/**
 * Trip settings
 */
export interface TripSettings {
  currency: string;            // Default currency for the trip
  timezone: string;            // Timezone for the destination
  isPublic: boolean;           // Can be viewed via share link
  shareToken?: string;         // Token for public sharing (readonly access)
}

/**
 * Trip entity - main collection: trips/{tripId}
 * Self-contained document with nested days and activities
 * No destination field - trips can span multiple locations
 */
export interface Trip {
  tripId: string;              // Firestore document ID
  title: string;               // "Europe Adventure 2025"
  description?: string;

  // Dates
  startDate: Timestamp;
  endDate: Timestamp;

  // Participants with roles (denormalized user data)
  participants: Participant[];

  // Nested days and activities
  days: Day[];

  // Trip metadata
  coverImageUrl?: string;
  createdBy: string;           // userId of owner
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Settings
  settings?: TripSettings;
}

/**
 * Input for creating a new trip
 */
export type CreateTripInput = Pick<Trip, 'title' | 'startDate' | 'endDate'> & {
  description?: string;
  coverImageUrl?: string;
  settings?: Partial<TripSettings>;
};

/**
 * Input for updating a trip
 */
export type UpdateTripInput = Partial<Pick<Trip, 'title' | 'description' | 'startDate' | 'endDate' | 'coverImageUrl' | 'settings'>>;
