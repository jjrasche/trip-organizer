# Services Layer Documentation

Complete business logic layer for Trip Organizer application.

## Overview

The services layer provides a clean API for all Firestore operations, handling:
- Authentication (phone number-based)
- User management
- Trip CRUD operations
- Real-time subscriptions
- Presence tracking

## Services

### Authentication Service (`auth.service.ts`)

Phone number authentication with Firebase Auth.

**Key Functions:**

```typescript
// Initialize reCAPTCHA verifier
initRecaptchaVerifier(containerId: string): RecaptchaVerifier

// Send SMS verification code
sendVerificationCode(phoneNumber: string, appVerifier: ApplicationVerifier): Promise<ConfirmationResult>

// Verify SMS code and sign in
verifyCode(confirmationResult: ConfirmationResult, verificationCode: string): Promise<UserCredential>

// Sign out
signOut(): Promise<void>

// Get current user
getCurrentUser(): FirebaseUser | null

// Subscribe to auth state changes
onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void

// Get ID token for API authentication
getIdToken(): Promise<string | null>
```

**Usage Example:**

```typescript
import { initRecaptchaVerifier, sendVerificationCode, verifyCode } from '@/services';

// 1. Initialize reCAPTCHA
const appVerifier = initRecaptchaVerifier('recaptcha-container');

// 2. Send SMS code
const confirmationResult = await sendVerificationCode('+15551234567', appVerifier);

// 3. User enters code from SMS
const userCredential = await verifyCode(confirmationResult, '123456');

// 4. User is now signed in
console.log('Signed in as:', userCredential.user.uid);
```

---

### User Service (`user.service.ts`)

User profile management in Firestore.

**Key Functions:**

```typescript
// Create new user profile
createUser(userId: string, userData: CreateUserInput): Promise<User>

// Get user by ID
getUser(userId: string): Promise<User | null>

// Update user profile
updateUser(userId: string, updates: UpdateUserInput): Promise<void>

// Add trip to user's tripIds
addTripToUser(userId: string, tripId: string): Promise<void>

// Remove trip from user's tripIds
removeTripFromUser(userId: string, tripId: string): Promise<void>

// Update display name (handles denormalization)
updateUserDisplayName(userId: string, newDisplayName: string): Promise<void>
```

**Usage Example:**

```typescript
import { createUser, getUser, updateUser } from '@/services';

// Create user after phone auth
const user = await createUser('user123', {
  phoneNumber: '+15551234567',
  displayName: 'John Doe',
});

// Update profile
await updateUser('user123', {
  displayName: 'John Smith',
  avatarUrl: 'https://example.com/avatar.jpg',
});
```

---

### Trip Service (`trip.service.ts`)

Complete trip management with CRUD operations and real-time sync.

**Key Functions:**

```typescript
// Create trip
createTrip(userId: string, userPhone: string, userDisplayName: string, tripData: CreateTripInput): Promise<Trip>

// Get trip
getTrip(tripId: string): Promise<Trip | null>

// Get user's trips
getUserTrips(userId: string): Promise<Trip[]>

// Get upcoming trips
getUpcomingTrips(userId: string): Promise<Trip[]>

// Update trip
updateTrip(tripId: string, updates: UpdateTripInput): Promise<void>

// Delete trip (Owner only)
deleteTrip(tripId: string): Promise<void>

// Participant management
addParticipant(tripId: string, participantData: AddParticipantInput): Promise<void>
removeParticipant(tripId: string, userId: string): Promise<void>
updateParticipantRole(tripId: string, userId: string, newRole: 'owner' | 'editor' | 'viewer'): Promise<void>
updateParticipantData(userId: string, updates: { phoneNumber?: string; displayName?: string }): Promise<void>

// Day management
addDay(tripId: string, dayData: CreateDayInput): Promise<void>
removeDay(tripId: string, dayId: string): Promise<void>

// Activity management
addActivity(tripId: string, dayId: string, userId: string, activityData: CreateActivityInput): Promise<void>
updateActivity(tripId: string, dayId: string, activityId: string, userId: string, updates: UpdateActivityInput): Promise<void>
removeActivity(tripId: string, dayId: string, activityId: string): Promise<void>

// Real-time subscription
subscribeToTrip(tripId: string, callback: (trip: Trip | null) => void): Unsubscribe
```

**Usage Example:**

```typescript
import { createTrip, addDay, addActivity, subscribeToTrip } from '@/services';
import { Timestamp } from 'firebase/firestore';

// Create trip
const trip = await createTrip('user123', '+15551234567', 'John Doe', {
  title: 'Europe Adventure 2025',
  startDate: Timestamp.fromDate(new Date('2025-06-01')),
  endDate: Timestamp.fromDate(new Date('2025-06-10')),
  description: 'Summer trip across Europe',
});

// Add a day
await addDay(trip.tripId, {
  date: Timestamp.fromDate(new Date('2025-06-01')),
  title: 'Day 1: Arrival in Paris',
});

// Add activity to day
await addActivity(trip.tripId, 'day-id-123', 'user123', {
  title: 'Visit Eiffel Tower',
  type: 'attraction',
  startTime: Timestamp.fromDate(new Date('2025-06-01T14:00:00')),
  location: {
    name: 'Eiffel Tower',
    address: 'Champ de Mars, Paris',
    coordinates: { lat: 48.8584, lng: 2.2945 },
  },
});

// Subscribe to real-time updates
const unsubscribe = subscribeToTrip(trip.tripId, (updatedTrip) => {
  console.log('Trip updated:', updatedTrip);
});

// Later: unsubscribe
unsubscribe();
```

---

### Presence Service (`presence.service.ts`)

Real-time presence tracking for collaborative editing.

**Key Functions:**

```typescript
// Set user as currently viewing
setPresence(tripId: string, userId: string, phoneNumber: string, displayName: string): Promise<void>

// Update presence timestamp
updatePresence(tripId: string, userId: string): Promise<void>

// Remove presence
removePresence(tripId: string, userId: string): Promise<void>

// Subscribe to presence updates
subscribeToPresence(tripId: string, callback: (presences: Presence[]) => void): Unsubscribe

// Start automatic heartbeat (updates every 30s)
startPresenceHeartbeat(tripId: string, userId: string): () => void
```

**Usage Example:**

```typescript
import { setPresence, subscribeToPresence, startPresenceHeartbeat } from '@/services';

// When user opens a trip
await setPresence('trip-123', 'user-456', '+15551234567', 'John Doe');

// Start heartbeat to keep presence alive
const stopHeartbeat = startPresenceHeartbeat('trip-123', 'user-456');

// Subscribe to see who else is viewing
const unsubscribe = subscribeToPresence('trip-123', (presences) => {
  console.log('Currently viewing:', presences.map(p => p.displayName));
});

// When user leaves
stopHeartbeat(); // Also removes presence
unsubscribe();
```

---

## Error Handling

All service functions throw descriptive errors:

```typescript
try {
  await createTrip(userId, phone, name, tripData);
} catch (error) {
  console.error(error.message); // "Failed to create trip: <reason>"
}
```

---

## Denormalization Strategy

The services layer handles denormalization automatically:

### User Display Name Updates

When a user updates their display name:

1. `updateUserDisplayName()` updates the user document
2. `updateParticipantData()` finds all trips where user is a participant
3. Updates denormalized `displayName` in all trip documents using batched writes

### Trip Participant Management

When adding/removing participants:

1. Trip document's `participants` array is updated
2. User document's `tripIds` array is updated
3. Both operations must succeed (use transactions in production)

---

## Real-time Subscriptions

Services provide real-time listeners using Firestore's `onSnapshot`:

```typescript
// Trip updates
const unsubscribe = subscribeToTrip(tripId, (trip) => {
  // Automatically called when trip changes
  updateUI(trip);
});

// Presence updates
const unsubscribe = subscribeToPresence(tripId, (presences) => {
  // Automatically called when presence changes
  showActiveUsers(presences);
});

// Always unsubscribe when done
unsubscribe();
```

---

## TypeScript Types

All services are fully typed using our entity definitions:

```typescript
import type {
  User,
  Trip,
  CreateTripInput,
  UpdateTripInput,
  Participant,
  Activity,
  // ... etc
} from '@types';
```

---

## Next Steps

1. **Create UI components** - Build React/Vue components using these services
2. **Add Cloud Functions** - For complex operations (email notifications, scheduled tasks)
3. **Add validation** - Input validation before Firestore operations
4. **Add caching** - Cache frequently accessed data
5. **Add optimistic updates** - Update UI before Firestore confirms

---

## Performance Considerations

### Batch Operations

For multiple writes, use Firestore batches:

```typescript
import { writeBatch } from 'firebase/firestore';

const batch = writeBatch(db);
// Add operations to batch
await batch.commit();
```

### Pagination

For large lists, implement pagination:

```typescript
import { query, limit, startAfter } from 'firebase/firestore';

const q = query(
  collection(db, 'trips'),
  orderBy('startDate'),
  limit(10)
);
```

### Offline Support

Firestore automatically handles offline:

```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db);
```

Already enabled in `src/config/firebase.ts` for development.
