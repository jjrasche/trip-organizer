import { Timestamp } from 'firebase/firestore';

/**
 * Activity types for categorization
 */
export type ActivityType =
  | 'flight'
  | 'hotel'
  | 'restaurant'
  | 'attraction'
  | 'transport'
  | 'other';

/**
 * Location information for activities
 */
export interface Location {
  name: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Cost tracking for activities
 */
export interface Cost {
  amount: number;
  currency: string;            // "USD", "EUR", etc.
  paidBy?: string;             // userId who paid
  splitBetween?: string[];     // Array of userIds to split cost
}

/**
 * File attachment for activities
 */
export interface Attachment {
  url: string;
  fileName: string;
  fileType: string;            // MIME type: "image/jpeg", "application/pdf"
}

/**
 * Activity entity - nested in trip's days array
 */
export interface Activity {
  activityId: string;          // Unique ID for this activity
  title: string;               // "Visit Eiffel Tower"
  description?: string;
  type: ActivityType;

  // Time
  startTime?: Timestamp;
  endTime?: Timestamp;

  // Location (this is where trip locations are stored)
  location?: Location;

  // Cost tracking
  cost?: Cost;

  // Metadata
  createdBy: string;           // userId
  createdAt: Timestamp;
  updatedBy: string;           // userId
  updatedAt: Timestamp;

  // Notes and attachments
  notes?: string;
  attachments?: Attachment[];
}

/**
 * Input for creating a new activity
 */
export type CreateActivityInput = Pick<Activity, 'title' | 'type'> & {
  description?: string;
  startTime?: Timestamp;
  endTime?: Timestamp;
  location?: Location;
  cost?: Cost;
  notes?: string;
};

/**
 * Input for updating an activity
 */
export type UpdateActivityInput = Partial<Omit<Activity, 'activityId' | 'createdBy' | 'createdAt'>>;
