import { Timestamp } from 'firebase/firestore';
import { Activity } from './activity';

/**
 * Day entity - represents a single day in a trip
 * Nested in trip's days array, contains activities
 */
export interface Day {
  dayId: string;               // Unique ID for this day
  date: Timestamp;             // The actual date
  title?: string;              // "Day 1: Arrival" (optional)
  activities: Activity[];
}

/**
 * Input for creating a new day
 */
export type CreateDayInput = {
  date: Timestamp;
  title?: string;
};
