# AI-Driven TDD Workflow

**Purpose:** Step-by-step process for AI to autonomously implement features using declarative tests

---

## The 8-Step Process

### Step 1: Human Describes Feature

**Human provides:**
- Feature description
- Acceptance criteria
- Expected behavior

**Example:**
```
Feature: Mark activities as confirmed or tentative

Users should be able to mark each activity with a status:
- "confirmed" (green badge)
- "tentative" (yellow badge)
- "cancelled" (red badge, crossed out)

Acceptance criteria:
- Click activity to see status dropdown
- Select status updates immediately
- Status persists in database
- Badge shows on activity card
```

---

### Step 2: AI Writes Test Data

**AI adds test case object to `tests/test-cases.data.js`:**

```javascript
{
  name: "Mark activity as confirmed",
  action: "setActivityStatus",
  data: {
    tripTitle: "Paris 2025",
    activityTitle: "Eiffel Tower Visit",
    status: "confirmed"
  },
  verify: {
    ui: "Activity shows 'confirmed' green badge",
    db: {
      collection: "trips",
      where: { field: "title", op: "==", value: "Paris 2025" },
      assert: {
        activityHasField: {
          title: "Eiffel Tower Visit",
          field: "status",
          value: "confirmed"
        }
      }
    }
  }
}
```

**AI responds to human:**
```
I've written a test case for this feature. Here's what it will verify:

1. UI shows a green "confirmed" badge on the activity
2. Database saves status field with value "confirmed"

Does this correctly capture the requirement?
```

---

### Step 3: Human Reviews Test

**Human responds:**
```
Yes, but also add tests for:
- Tentative status (yellow badge)
- Cancelled status (red badge, activity crossed out)
```

**AI adds more test cases:**
```javascript
{
  name: "Mark activity as tentative",
  action: "setActivityStatus",
  data: { ..., status: "tentative" },
  verify: { ui: "Activity shows 'tentative' yellow badge", ... }
},
{
  name: "Mark activity as cancelled",
  action: "setActivityStatus",
  data: { ..., status: "cancelled" },
  verify: {
    ui: "Activity shows 'cancelled' red badge and is crossed out",
    ...
  }
}
```

---

### Step 4: AI Runs Tests (RED - Action Not Found)

**AI runs:**
```bash
npm run test:declarative
```

**Output:**
```
❌ FAILED: Mark activity as confirmed
   Error: Unknown action: setActivityStatus
```

**AI responds:**
```
Test failed as expected - the action doesn't exist yet.
Adding action handler to test runner...
```

---

### Step 5: AI Adds Action Handler

**AI updates `tests/declarative-test-runner.js`:**

```javascript
const actionMap = {
  // ... existing actions ...

  setActivityStatus: async () => {
    await this.app.dashboard.navigate();
    await this.app.dashboard.viewTrip(data.tripTitle);
    await this.app.tripDetail.clickActivity(data.activityTitle);
    await this.app.activityMenu.selectStatus(data.status);
  },
};
```

---

### Step 6: AI Runs Tests (RED - Feature Not Implemented)

**AI runs tests again:**

**Output:**
```
❌ FAILED: Mark activity as confirmed
   Error: Method not found: clickActivity
```

**AI responds:**
```
Action handler added. Test fails because feature isn't implemented yet.
Now implementing the feature...
```

---

### Step 7: AI Implements Feature

**AI makes changes:**

1. **Updates TypeScript types:**
```typescript
// src/types/activity.ts
export type ActivityStatus = 'confirmed' | 'tentative' | 'cancelled';

export interface Activity {
  // ... existing fields ...
  status?: ActivityStatus;
}
```

2. **Adds Screen Object methods:**
```javascript
// scripts/test-framework/ScreenObjects.js
class TripDetailScreen {
  async clickActivity(title) {
    await this.page.locator(`[data-testid="activity-card"]:has-text("${title}")`).click();
  }
}

class ActivityMenuScreen {
  async selectStatus(status) {
    await this.page.locator('[data-testid="status-dropdown"]').click();
    await this.page.locator(`[data-testid="status-${status}"]`).click();
  }
}
```

3. **Updates Activity component:**
```typescript
// src/components/ActivityCard.tsx
<div className="activity-status">
  <select
    data-testid="status-dropdown"
    value={activity.status || 'confirmed'}
    onChange={(e) => updateActivityStatus(activity.id, e.target.value)}
  >
    <option value="confirmed" data-testid="status-confirmed">✓ Confirmed</option>
    <option value="tentative" data-testid="status-tentative">? Tentative</option>
    <option value="cancelled" data-testid="status-cancelled">✗ Cancelled</option>
  </select>

  {activity.status === 'confirmed' && <span className="badge badge-green">Confirmed</span>}
  {activity.status === 'tentative' && <span className="badge badge-yellow">Tentative</span>}
  {activity.status === 'cancelled' && <span className="badge badge-red">Cancelled</span>}
</div>
```

4. **Updates service:**
```typescript
// src/services/trip.service.ts
export async function updateActivityStatus(
  tripId: string,
  dayIndex: number,
  activityId: string,
  status: ActivityStatus
): Promise<void> {
  const tripRef = doc(db, 'trips', tripId);
  const trip = await getDoc(tripRef);

  const updatedDays = trip.data().days;
  const activity = updatedDays[dayIndex].activities.find(a => a.id === activityId);
  activity.status = status;

  await updateDoc(tripRef, { days: updatedDays });
}
```

---

### Step 8: AI Runs Tests (GREEN)

**AI runs tests:**

**Output:**
```
✅ PASSED: Mark activity as confirmed
✅ PASSED: Mark activity as tentative
✅ PASSED: Mark activity as cancelled
```

**AI responds:**
```
✅ All tests passing!

Feature implemented:
- Activity status dropdown added
- UI shows correct badge colors
- Status persists to database
- All three statuses (confirmed, tentative, cancelled) working

Ready for you to review the UX.
```

---

### Step 9: Human Validates UX

**Human loads app and checks:**
- Does the dropdown look good?
- Are the colors right?
- Does it feel intuitive?

**Human responds:**
```
Looks great! Can you make the badges a bit larger and add icons?
```

**AI makes UX tweaks (tests stay the same, still pass)**

---

## Key Principles

### For AI

1. **Always write tests first** - Before any implementation
2. **Ask human to review test** - Make sure it captures intent
3. **Run tests after each step** - Show the red → green progression
4. **Report test results** - Human should see what passed/failed
5. **Tests are the contract** - If tests pass, feature is done

### For Human

1. **Describe behavior, not implementation** - AI figures out how
2. **Review test cases** - Make sure they test the right thing
3. **Validate UX only** - Don't debug failing tests (AI does that)
4. **Add regression tests** - When bugs appear, describe expected behavior

---

## Example: Full Conversation

**Human:**
```
Add ability to duplicate a trip
```

**AI:**
```
I'll write a test for this feature:

{
  name: "Duplicate existing trip",
  action: "duplicateTrip",
  data: { tripId: "trip-paris-2025" },
  verify: {
    ui: "Dashboard shows 'Paris 2025 (Copy)'",
    db: {
      collection: "trips",
      where: { field: "title", op: "==", value: "Paris 2025 (Copy)" },
      assert: {
        dayCount: 7,  // Same as original
        participantCount: 1  // Just the duplicator
      }
    }
  }
}

Does this correctly capture what you want?
```

**Human:**
```
Yes, but the duplicate should also copy all activities
```

**AI:**
```
Updated test to verify activities are copied:

verify: {
  db: {
    assert: {
      dayCount: 7,
      participantCount: 1,
      hasActivity: "Eiffel Tower Visit",  // From original
      hasActivity: "Louvre Museum"  // From original
    }
  }
}

Running test... [RED]
Implementing feature...
Running test... [GREEN]

✅ Feature complete. Ready for UX review.
```

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────┐
│ 1. Human: "Add feature X"                      │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│ 2. AI: Writes test data object                 │
│    "Does this test capture the requirement?"   │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│ 3. Human: Reviews test                         │
│    "Yes" or "Add test for Y too"               │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│ 4. AI: Runs test → ❌ RED                      │
│    (Action doesn't exist)                      │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│ 5. AI: Adds action handler                     │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│ 6. AI: Runs test → ❌ RED                      │
│    (Feature not implemented)                   │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│ 7. AI: Implements feature                      │
│    - Types, services, components, UI           │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│ 8. AI: Runs test → ✅ GREEN                    │
│    "Feature complete, ready for UX review"     │
└──────────────────┬──────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────┐
│ 9. Human: Validates UX                         │
│    Request tweaks if needed                    │
└─────────────────────────────────────────────────┘
```

---

## What to Test First?

Now that the framework exists, let's discuss what to test. Some options:

### Critical Workflows
- Create trip → Add activities → View itinerary
- Edit trip details
- Delete activities
- Share trip with participants

### Edge Cases
- Invalid date ranges
- Empty required fields
- Concurrent edits

### Regression Cases
- Known bugs that were fixed
- Features that broke before

**What feature should we write tests for first?**
