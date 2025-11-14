/**
 * Trip Organizer - Type Definitions
 *
 * Core entities for the trip organizer application.
 * These types match the Firestore schema defined in SCHEMA.md
 */

// User types
export type { User, CreateUserInput, UpdateUserInput } from './user';

// Participant types
export type { Participant, ParticipantRole, AddParticipantInput } from './participant';

// Activity types
export type {
  Activity,
  ActivityType,
  Location,
  Cost,
  Attachment,
  CreateActivityInput,
  UpdateActivityInput,
} from './activity';

// Day types
export type { Day, CreateDayInput } from './day';

// Trip types
export type {
  Trip,
  TripSettings,
  CreateTripInput,
  UpdateTripInput,
} from './trip';

// Presence types
export type { Presence } from './presence';
