# Declarative Test Framework - Technical Reference

> **For the complete AI-driven TDD workflow with examples, see [docs/AI_TDD_WORKFLOW.md](../docs/AI_TDD_WORKFLOW.md)**

## Quick Start

```bash
# Run all tests
npm run test:declarative

# Test files
tests/test-cases.data.js          # Add test cases here (pure data)
tests/declarative-test-runner.js  # Test runner (don't modify often)
```

## Concept

Tests are **pure data objects**. AI writes data, not code:

```javascript
{
  name: "Create a trip",
  action: "createTrip",
  data: { title: "Paris", startDate: "2025-07-01", endDate: "2025-07-07" },
  verify: {
    ui: "Dashboard shows 'Paris'",
    db: { collection: "trips", assert: { dayCount: 7 } }
  }
}
```

Runner interprets this → executes UI actions → verifies results → reports pass/fail.

---

## Test Case Structure

```javascript
{
  // Required fields
  name: "Human-readable description",
  action: "actionType",           // What to do
  data: { /* action-specific */ }, // Input data
  verify: {
    ui: "Expected UI state",      // What user sees
    db: { /* DB assertions */ }   // What's in database
  },

  // Optional fields
  expectError: true,  // Test should fail with error
  skip: false,        // Skip this test
  only: false,        // Run only this test
}
```

---

## Available Actions

| Action | Data Fields | Description |
|--------|-------------|-------------|
| `createTrip` | `title`, `startDate`, `endDate`, `description` | Create new trip |
| `addActivity` | `tripTitle`, `dayIndex`, `activity` | Add activity to specific day |
| `editTrip` | `tripId`, `updates` | Update trip fields |
| `editActivity` | `tripTitle`, `activityTitle`, `updates` | Update activity |
| `deleteTrip` | `tripId` | Delete entire trip |
| `deleteActivity` | `tripTitle`, `activityTitle` | Remove activity from trip |

**To add new actions:** Edit `declarative-test-runner.js` and add to `actionMap`.

---

## Database Assertions

### By Document ID
```javascript
{
  collection: "trips",
  id: "trip-123",
  assert: { title: "Paris 2025" }
}
```

### By Query
```javascript
{
  collection: "trips",
  where: { field: "title", op: "==", value: "Paris 2025" },
  assert: { dayCount: 7 }
}
```

### Special Assertions
```javascript
assert: {
  dayCount: 7,                    // Verify number of days
  participantCount: 3,            // Verify number of participants
  hasActivity: "Activity Name",   // Activity exists in trip
  notHasActivity: "Name",         // Activity does NOT exist
  notExists: true,                // Document does NOT exist
}
```

---

## Adding a New Test

1. Open `tests/test-cases.data.js`
2. Add object to appropriate array (or create new array)
3. Export the array
4. If action doesn't exist, add to `declarative-test-runner.js`
5. Run: `npm run test:declarative`

That's it. No test code to write.

---

## Example Test Cases

```javascript
// tests/test-cases.data.js
export const TRIP_TESTS = [
  {
    name: "Create weekend trip",
    action: "createTrip",
    data: {
      title: "Weekend Getaway",
      startDate: "2025-06-14",
      endDate: "2025-06-16"
    },
    verify: {
      ui: "Dashboard shows 'Weekend Getaway'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Weekend Getaway" },
        assert: { dayCount: 3 }
      }
    }
  },

  {
    name: "Delete trip",
    action: "deleteTrip",
    data: { tripId: "trip-123" },
    verify: {
      ui: "Trip 'Paris 2025' is not visible",
      db: {
        collection: "trips",
        id: "trip-123",
        assert: { notExists: true }
      }
    }
  }
];
```

---

## For AI Agents

When implementing a feature:

1. **Write test data first** (add object to `test-cases.data.js`)
2. **Run test** → should fail (RED)
3. **Implement feature** (add action handler + UI + service)
4. **Run test** → should pass (GREEN)
5. **Report results** to human

See [docs/AI_TDD_WORKFLOW.md](../docs/AI_TDD_WORKFLOW.md) for complete process.
