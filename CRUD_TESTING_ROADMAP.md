# CRUD Operations Testing & Implementation Roadmap

**Date:** 2025-11-14
**Status:** Test Scenarios Complete, Implementation Needed

---

## Overview

Comprehensive E2E test suite for **CRUD operations** (Create, Read, Update, Delete) + AI interactions has been created. The tests serve as both **specifications** and **verification** for the features that need to be implemented.

---

## Test Results Summary

### ✅ READ Operations - WORKING
- View dashboard
- View trips
- View trip details
- View activities
- Real-time data sync

### ⚠️  CREATE Operations - NOT IMPLEMENTED
- Create new trip (button exists, no form)
- Add activity to trip (button exists, no form)

### ⚠️  UPDATE Operations - NOT IMPLEMENTED
- Edit trip details
- Edit activity details

### ⚠️  DELETE Operations - NOT IMPLEMENTED
- Delete activity
- Delete trip

### ⚠️  AI Interactions - PARTIALLY WORKING
- AI chat button visible ✅
- Can open chat panel ✅
- Can send messages ✅
- AI responses (requires Firebase AI Logic setup)

---

## Running CRUD Tests

```bash
# Start dev server
npm run dev

# Run CRUD test suite
npm run test:crud
```

### Expected Output:
```
╔════════════════════════════════════════════════╗
║   CRUD Operations E2E Test Suite              ║
╚════════════════════════════════════════════════╝

CRUD 1: Create New Trip ..................... ⚠️  SKIPPED
CRUD 2: Add Activity to Trip ................ ⚠️  SKIPPED
CRUD 3: Edit Activity ....................... ⚠️  SKIPPED
CRUD 4: Delete Activity ..................... ⚠️  SKIPPED
CRUD 5: AI Chat Interaction ................. ✅ PASSED
```

---

## Implementation Roadmap

### Priority 1: CREATE Operations

#### 1. Create Trip Modal

**File:** `src/pages/Dashboard.tsx`

**Specification (from test):**
```gherkin
GIVEN: User is on dashboard
WHEN: User clicks "Create Trip" button
THEN: Modal appears with form fields:
  - Trip title (text input, required)
  - Description (textarea, optional)
  - Start date (date picker, required)
  - End date (date picker, required)
  - Submit button
WHEN: User fills form and submits
THEN: Trip created in database
AND: Trip appears on dashboard immediately
AND: User navigated to trip detail page
```

**Implementation Checklist:**
```typescript
// Dashboard.tsx

// 1. Add state for modal
const [showCreateModal, setShowCreateModal] = useState(false);
const [newTripData, setNewTripData] = useState({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
});

// 2. Create modal component
<CreateTripModal
  open={showCreateModal}
  onClose={() => setShowCreateModal(false)}
  onSubmit={handleCreateTrip}
/>

// 3. Handle form submission
const handleCreateTrip = async (tripData) => {
  try {
    const newTrip = await createTrip({
      title: tripData.title,
      description: tripData.description,
      startDate: Timestamp.fromDate(new Date(tripData.startDate)),
      endDate: Timestamp.fromDate(new Date(tripData.endDate)),
      createdBy: userId,
      participants: [{
        userId,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
        role: 'owner',
        joinedAt: Timestamp.now(),
      }],
      days: [],
    });

    // Navigate to new trip
    onViewTrip(newTrip.tripId);
  } catch (error) {
    console.error('Error creating trip:', error);
    // Show error message
  }
};

// 4. Wire up Create Trip button
<button
  onClick={() => setShowCreateModal(true)}
  className="btn-primary"
>
  + Create Trip
</button>
```

**Service Function Needed:**
```typescript
// src/services/trip.service.ts

export async function createTrip(tripData: Partial<Trip>): Promise<Trip> {
  const tripId = nanoid();

  const trip: Trip = {
    tripId,
    title: tripData.title,
    description: tripData.description || '',
    startDate: tripData.startDate,
    endDate: tripData.endDate,
    participants: tripData.participants || [],
    days: [],
    createdBy: tripData.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    settings: {
      currency: 'USD',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isPublic: false,
    },
  };

  await setDoc(doc(db, 'trips', tripId), trip);

  // Update user's tripIds
  await updateDoc(doc(db, 'users', tripData.createdBy), {
    tripIds: arrayUnion(tripId),
  });

  return trip;
}
```

---

#### 2. Add Activity Modal

**File:** `src/pages/TripDetail.tsx`

**Specification (from test):**
```gherkin
GIVEN: User is viewing trip with days
WHEN: User clicks "+ Add Activity" button for a day
THEN: Modal appears with form fields:
  - Activity title (text input, required)
  - Activity type (select: flight, hotel, restaurant, attraction, transport, other)
  - Start time (time picker, optional)
  - End time (time picker, optional)
  - Location name (text input, optional)
  - Location address (text input, optional)
  - Description (textarea, optional)
  - Cost amount (number input, optional)
  - Cost currency (select, optional)
  - Submit button
WHEN: User fills form and submits
THEN: Activity added to day in database
AND: Activity appears in UI immediately
```

**Implementation Checklist:**
```typescript
// TripDetail.tsx

// 1. Add state
const [showAddActivityModal, setShowAddActivityModal] = useState(false);
const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

// 2. Wire up Add Activity button
<button
  onClick={() => {
    setSelectedDayId(day.dayId);
    setShowAddActivityModal(true);
  }}
  className="text-sm text-primary-600"
>
  + Add Activity
</button>

// 3. Create modal
<AddActivityModal
  open={showAddActivityModal}
  dayId={selectedDayId}
  onClose={() => setShowAddActivityModal(false)}
  onSubmit={handleAddActivity}
/>

// 4. Handle submission
const handleAddActivity = async (activityData) => {
  try {
    await addActivityToTrip(tripId, selectedDayId, {
      activityId: nanoid(),
      title: activityData.title,
      type: activityData.type || 'other',
      startTime: activityData.startTime,
      endTime: activityData.endTime,
      location: activityData.location ? {
        name: activityData.location,
        address: activityData.address,
      } : undefined,
      description: activityData.description,
      cost: activityData.cost ? {
        amount: parseFloat(activityData.cost),
        currency: activityData.currency || 'USD',
      } : undefined,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedBy: userId,
      updatedAt: Timestamp.now(),
      attachments: [],
    });

    setShowAddActivityModal(false);
  } catch (error) {
    console.error('Error adding activity:', error);
  }
};
```

**Service Function Needed:**
```typescript
// src/services/trip.service.ts

export async function addActivityToTrip(
  tripId: string,
  dayId: string,
  activity: Activity
): Promise<void> {
  const tripRef = doc(db, 'trips', tripId);
  const tripDoc = await getDoc(tripRef);

  if (!tripDoc.exists()) {
    throw new Error('Trip not found');
  }

  const trip = tripDoc.data();
  const updatedDays = trip.days.map(day => {
    if (day.dayId === dayId) {
      return {
        ...day,
        activities: [...day.activities, activity],
      };
    }
    return day;
  });

  await updateDoc(tripRef, {
    days: updatedDays,
    updatedAt: serverTimestamp(),
  });
}
```

---

### Priority 2: UPDATE Operations

#### 3. Edit Activity Modal

**Specification:**
```gherkin
GIVEN: User is viewing trip detail
WHEN: User clicks on activity card
THEN: Edit modal opens with existing data populated
WHEN: User modifies fields
AND: User clicks Save
THEN: Activity updates in database
AND: UI reflects changes immediately
```

**Implementation:**
```typescript
// TripDetail.tsx

// 1. Make activity cards clickable
<div
  onClick={() => handleEditActivity(activity)}
  className="cursor-pointer hover:bg-gray-50"
>
  {/* Activity content */}
</div>

// 2. Handle edit
const [editingActivity, setEditingActivity] = useState(null);

const handleEditActivity = (activity) => {
  setEditingActivity(activity);
  // Populate form with existing data
};

// 3. Service function
export async function updateActivity(
  tripId: string,
  dayId: string,
  activityId: string,
  updates: Partial<Activity>
): Promise<void> {
  const tripRef = doc(db, 'trips', tripId);
  const tripDoc = await getDoc(tripRef);

  const trip = tripDoc.data();
  const updatedDays = trip.days.map(day => {
    if (day.dayId === dayId) {
      return {
        ...day,
        activities: day.activities.map(act => {
          if (act.activityId === activityId) {
            return { ...act, ...updates, updatedAt: serverTimestamp() };
          }
          return act;
        }),
      };
    }
    return day;
  });

  await updateDoc(tripRef, {
    days: updatedDays,
    updatedAt: serverTimestamp(),
  });
}
```

---

### Priority 3: DELETE Operations

#### 4. Delete Activity

**Specification:**
```gherkin
GIVEN: User is viewing trip detail
WHEN: User clicks trash/delete icon on activity
THEN: Confirmation dialog appears
  - Message: "Delete [Activity Name]?"
  - "Cancel" button
  - "Delete" button (red/danger style)
WHEN: User clicks Delete
THEN: Activity removed from database
AND: Activity disappears from UI
AND: Success message shown
```

**Implementation:**
```typescript
// TripDetail.tsx

// 1. Add delete button to activity
<button
  onClick={(e) => {
    e.stopPropagation();
    setActivityToDelete(activity);
    setShowDeleteConfirm(true);
  }}
  className="text-red-600 hover:text-red-800"
>
  🗑️
</button>

// 2. Confirmation dialog
<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete Activity?"
  message={`Are you sure you want to delete "${activityToDelete?.title}"?`}
  onConfirm={handleDeleteActivity}
  onCancel={() => setShowDeleteConfirm(false)}
/>

// 3. Delete handler
const handleDeleteActivity = async () => {
  try {
    await deleteActivity(tripId, dayId, activityToDelete.activityId);
    setShowDeleteConfirm(false);
    // Show success toast
  } catch (error) {
    console.error('Error deleting activity:', error);
  }
};

// 4. Service function
export async function deleteActivity(
  tripId: string,
  dayId: string,
  activityId: string
): Promise<void> {
  const tripRef = doc(db, 'trips', tripId);
  const tripDoc = await getDoc(tripRef);

  const trip = tripDoc.data();
  const updatedDays = trip.days.map(day => {
    if (day.dayId === dayId) {
      return {
        ...day,
        activities: day.activities.filter(
          act => act.activityId !== activityId
        ),
      };
    }
    return day;
  });

  await updateDoc(tripRef, {
    days: updatedDays,
    updatedAt: serverTimestamp(),
  });
}
```

---

## Test-Driven Development Workflow

### Step 1: Run Test
```bash
npm run test:crud
```

### Step 2: Implement Feature
Choose one skipped test and implement the feature to make it pass.

### Step 3: Re-run Test
```bash
npm run test:crud
```

### Step 4: Verify
- Test should change from "SKIPPED" to "PASSED"
- Database should reflect changes
- Screenshots should show working functionality

### Step 5: Repeat
Move to next skipped test.

---

## Component Structure Recommendations

### Modal Components

Create reusable modal components:

```
src/components/
├── modals/
│   ├── BaseModal.tsx          # Reusable modal wrapper
│   ├── CreateTripModal.tsx    # Create trip form
│   ├── AddActivityModal.tsx   # Add activity form
│   ├── EditActivityModal.tsx  # Edit activity form
│   └── ConfirmDialog.tsx      # Delete confirmation
```

### Form Components

Create reusable form inputs:

```
src/components/
├── forms/
│   ├── TripForm.tsx           # Trip fields
│   ├── ActivityForm.tsx       # Activity fields
│   ├── DateRangePicker.tsx    # Date selection
│   └── TimeRangePicker.tsx    # Time selection
```

---

## Service Functions Summary

All needed in `src/services/trip.service.ts`:

```typescript
// CREATE
export async function createTrip(tripData: Partial<Trip>): Promise<Trip>
export async function addActivityToTrip(tripId, dayId, activity): Promise<void>
export async function addDayToTrip(tripId, day): Promise<void>

// READ (already implemented)
export async function getTrip(tripId): Promise<Trip>
export async function getUserTrips(userId): Promise<Trip[]>

// UPDATE
export async function updateTrip(tripId, updates): Promise<void>
export async function updateActivity(tripId, dayId, activityId, updates): Promise<void>
export async function updateDay(tripId, dayId, updates): Promise<void>

// DELETE
export async function deleteActivity(tripId, dayId, activityId): Promise<void>
export async function deleteDay(tripId, dayId): Promise<void>
export async function deleteTrip(tripId): Promise<void>
```

---

## AI Chat Implementation Notes

### Current Status
- ✅ AI chat button visible (when `isAIConfigured()` returns true)
- ✅ Chat panel opens/closes
- ✅ Can send messages
- ⚠️ AI responses require Firebase AI Logic setup

### Setup Required

1. Enable Firebase AI Logic in Firebase Console
2. Add Gemini API access
3. Configure in `src/services/ai.service.ts`

### Test Scenario
```gherkin
GIVEN: AI is configured
AND: User is viewing trip
WHEN: User opens AI chat
AND: User types "What activities do we have for Day 1?"
AND: User clicks Send
THEN: Loading indicator appears
AND: AI responds within 5 seconds
AND: Response mentions activities from Day 1
```

---

## Next Steps

### Immediate Actions:
1. ✅ Review test scenarios
2. ⬜ Implement Create Trip Modal
3. ⬜ Implement Add Activity Modal
4. ⬜ Implement Edit Activity functionality
5. ⬜ Implement Delete Activity functionality
6. ⬜ Run tests to verify all CRUD operations work

### After CRUD Complete:
1. Add form validation
2. Add error handling and user feedback
3. Add loading states
4. Add success/error toasts
5. Add optimistic UI updates
6. Configure Firebase AI Logic

---

## Success Criteria

### When all tests pass:
```
╔════════════════════════════════════════════════╗
║   CRUD Test Results Summary                    ║
╚════════════════════════════════════════════════╝

✅ Passed: 5
❌ Failed: 0
⚠️  Skipped: 0

✅ Passed Tests:
   1. CRUD 1: Create New Trip
   2. CRUD 2: Add Activity to Trip
   3. CRUD 3: Edit Activity
   4. CRUD 4: Delete Activity
   5. CRUD 5: AI Chat Interaction
```

---

**Status:** Tests ready, waiting for implementation
**Priority:** Create operations first (highest user value)
**Estimated effort:** 8-12 hours for full CRUD implementation
