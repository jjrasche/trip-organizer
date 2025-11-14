# Trip Organizer - Firestore Data Schema

## Architecture Decision: Firestore vs Self-Managed

**Decision: Use Firestore (Google's managed NoSQL database)**

**Rationale:**
- **Cost**: $5-10/month for first 1K users vs $40-80/month for self-managed PostgreSQL + Redis
- **Real-time sync**: Built-in (onSnapshot) vs 2-4 weeks to build with WebSockets
- **Offline support**: Built-in via IndexedDB vs 2-3 weeks to build manually
- **Time to market**: 1-2 weeks vs 2-3 months development
- **DevOps**: Zero maintenance vs 5-10 hours/month monitoring/scaling
- **Developer cost**: Firestore saves $20K-30K in opportunity cost vs building real-time + offline

**When to reconsider:**
- 10K+ active users (Firestore costs approach self-managed)
- Need complex SQL queries/joins across trips
- Spending >$200/month on Firestore

**Break-even analysis:** Self-managed would need 20-30 years to pay for itself when factoring in development time.

---

## Collections Overview

- `users` - User profiles and authentication data (phone number-based)
- `trips` - Trip documents (self-contained with nested data)

## Schema Definitions

### Users Collection: `users/{userId}`

```typescript
{
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
```

**Indexes needed:**
- `phoneNumber` (for user lookup, authentication)
- `email` (optional, for email-based lookup)

---

### Trips Collection: `trips/{tripId}`

```typescript
{
  tripId: string;              // Firestore document ID
  title: string;               // "Europe Adventure 2025"
  description?: string;
  // NOTE: No destination field - trips can span multiple locations
  // Location info is per-activity in the activities array

  // Dates
  startDate: Timestamp;
  endDate: Timestamp;

  // Participants with roles
  participants: Array<{
    userId: string;
    phoneNumber: string;       // Denormalized for display/contact
    displayName: string;       // Denormalized for display
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: Timestamp;
  }>;

  // Nested days and activities
  days: Array<{
    dayId: string;             // Unique ID for this day
    date: Timestamp;           // The actual date
    title?: string;            // "Day 1: Arrival" (optional)

    activities: Array<{
      activityId: string;      // Unique ID for this activity
      title: string;           // "Visit Eiffel Tower"
      description?: string;
      type: 'flight' | 'hotel' | 'restaurant' | 'attraction' | 'transport' | 'other';

      // Time
      startTime?: Timestamp;
      endTime?: Timestamp;

      // Location
      location?: {
        name: string;
        address?: string;
        coordinates?: {
          lat: number;
          lng: number;
        };
      };

      // Cost tracking
      cost?: {
        amount: number;
        currency: string;        // "USD", "EUR", etc.
        paidBy?: string;         // userId who paid
        splitBetween?: string[]; // Array of userIds
      };

      // Metadata
      createdBy: string;         // userId
      createdAt: Timestamp;
      updatedBy: string;         // userId
      updatedAt: Timestamp;

      // Notes and attachments
      notes?: string;
      attachments?: Array<{
        url: string;
        fileName: string;
        fileType: string;
      }>;
    }>;
  }>;

  // Trip metadata
  coverImageUrl?: string;
  createdBy: string;           // userId of owner
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Settings
  settings?: {
    currency: string;          // Default currency for the trip
    timezone: string;          // Timezone for the destination
    isPublic: boolean;         // Can be viewed via share link
    shareToken?: string;       // Token for public sharing
  };
}
```

**Indexes needed:**
- `participants.userId` (array-contains for "my trips" query)
- `startDate` (for sorting trips chronologically)
- `createdBy` (for filtering by owner)

---

## Common Queries

### User Queries
```typescript
// Get user profile
db.collection('users').doc(userId).get()

// Get all trips for a user
db.collection('trips')
  .where('participants', 'array-contains', { userId })
  .orderBy('startDate', 'desc')
  .get()
```

### Trip Queries
```typescript
// Get a specific trip
db.collection('trips').doc(tripId).get()

// Real-time subscription to trip changes
db.collection('trips').doc(tripId).onSnapshot(snapshot => {
  // Update UI with latest trip data
})

// Get upcoming trips for a user
db.collection('trips')
  .where('participants.userId', 'array-contains', userId)
  .where('startDate', '>', new Date())
  .orderBy('startDate', 'asc')
  .get()
```

---

## Role-Based Access

### Owner
- Full control over trip
- **Can delete trip** (only role with this permission)
- Can add/remove participants
- Can change participant roles
- Can edit all trip data (title, description, dates, days, activities)

### Editor
- Can edit trip details (title, description, dates)
- Can add/edit/delete days and activities
- Can add notes and attachments
- **Can add/remove participants** (added based on feedback)
- **Can change participant roles** (added based on feedback)
- **Cannot delete trip** (only Owner can delete)

### Viewer
- Read-only access to all trip data
- Cannot modify anything
- Cannot manage participants

---

## Real-time Collaboration

Firestore's real-time listeners automatically handle:
- Live updates when any participant modifies the trip
- Offline support (changes sync when back online via IndexedDB)
- Conflict resolution (last-write-wins)

**Offline support in browsers:**
- Firestore SDK caches data in IndexedDB automatically
- Works in both browser and PWA (Progressive Web App)
- Pending writes queued and synced when connection restored
- No additional code needed for basic offline functionality

For presence awareness (who's currently viewing), we'd add:
```typescript
// Separate collection for ephemeral presence data
presence/{tripId}/users/{userId}
{
  userId: string;
  phoneNumber: string;
  displayName: string;
  lastSeen: Timestamp;
  currentlyViewing: boolean;
}
```

---

## Data Size Considerations

Firestore document size limit: 1 MB per document

For a typical trip:
- 10 days × 5 activities = 50 activities
- Each activity ≈ 1-2 KB
- Total trip document ≈ 50-100 KB

This structure easily fits within Firestore limits. If trips grow very large (100+ activities), we could split activities into a subcollection.

---

## Denormalization Strategy

**What is denormalization?**
Storing the same data in multiple places to optimize reads at the cost of more complex writes.

**Example in our schema:**
- User's `displayName` is stored in `users/{userId}` (source of truth)
- User's `displayName` is ALSO stored in each trip's `participants` array (denormalized)
- User's `phoneNumber` is ALSO stored in each trip's `participants` array (denormalized)

**Why denormalize?**
- Faster reads: Can display trip with participant names without extra queries
- Self-contained trips: All data needed to render a trip is in one document
- Real-time sync: One `onSnapshot()` gets everything

**Trade-off:**
When a user updates their display name, you must:
1. Update `users/{userId}` document
2. Find all trips where this user is a participant
3. Update the denormalized `displayName` in each trip's `participants` array

```typescript
// Example: Updating a user's display name
async function updateUserDisplayName(userId, newDisplayName) {
  // 1. Update user document (source of truth)
  await db.collection('users').doc(userId).update({
    displayName: newDisplayName,
    updatedAt: serverTimestamp()
  });

  // 2. Find all trips where this user is a participant
  const tripsSnapshot = await db.collection('trips')
    .where('participants', 'array-contains', { userId })
    .get();

  // 3. Update denormalized displayName in each trip's participants array
  const batch = db.batch();
  tripsSnapshot.forEach(doc => {
    const trip = doc.data();
    const updatedParticipants = trip.participants.map(p =>
      p.userId === userId
        ? { ...p, displayName: newDisplayName }
        : p
    );
    batch.update(doc.ref, { participants: updatedParticipants });
  });

  await batch.commit();
}
```

**Cost analysis:**
- More writes (1 user document + N trip documents)
- Faster reads (self-contained trips, no joins needed)
- For collaborative apps with frequent reads, denormalization is worth it

---

## Alternative: Activities as Subcollection

If trips get too large, we can move activities to a subcollection:

```
trips/{tripId}/activities/{activityId}
```

But for MVP, keeping everything nested in the trip document is simpler and faster for real-time sync.

---

## Authentication: Phone Number-Based

**Primary authentication method: Phone number (SMS verification)**

**Why phone numbers?**
- Organization-first: Trip coordination requires real-time communication
- SMS notifications: Can send event updates and questions via text
- Contact-friendly: Participants can call/text each other directly
- Unique identifier: Phone numbers are globally unique

**Implementation with Firebase Auth:**
```typescript
// Firebase Auth supports phone number authentication
firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier)
  .then(confirmationResult => {
    // SMS sent, prompt user for verification code
    return confirmationResult.confirm(verificationCode);
  })
  .then(userCredential => {
    // User signed in, userId = userCredential.user.uid
  });
```

**Email as optional field:**
- Can be added later for notifications
- Not required for authentication or identification
