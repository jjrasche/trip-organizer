# Declarative Test Framework

> **For the complete AI-driven TDD workflow, see [docs/AI_TDD_WORKFLOW.md](../docs/AI_TDD_WORKFLOW.md)**

## Concept

Tests are **pure data**. You (human or AI) don't write test code - you write test *data objects*.

A test runner interprets the data and:
1. Executes UI actions via Screen Objects
2. Verifies results in UI and database
3. Reports pass/fail

## For AI Development

### When AI implements a feature:

**Step 1: Human describes feature**
```
Add ability to mark activities as "confirmed" or "tentative"
```

**Step 2: AI adds test case data**
```javascript
// AI adds to test-cases.data.js
{
  name: "Mark activity as confirmed",
  action: "markActivityConfirmed",
  data: {
    tripTitle: "Paris 2025",
    activityTitle: "Eiffel Tower",
  },
  verify: {
    ui: "Activity shows 'Confirmed' badge",
    db: {
      collection: "trips",
      where: { field: "title", op: "==", value: "Paris 2025" },
      assert: {
        activityHasField: {
          title: "Eiffel Tower",
          field: "status",
          value: "confirmed"
        }
      }
    }
  }
}
```

**Step 3: AI runs test (fails)**
```bash
❌ FAILED: Mark activity as confirmed
   Error: Unknown action: markActivityConfirmed
```

**Step 4: AI adds action handler to runner**
```javascript
// In declarative-test-runner.js
markActivityConfirmed: async () => {
  await this.app.dashboard.viewTrip(data.tripTitle);
  await this.app.tripDetail.markActivityConfirmed(data.activityTitle);
}
```

**Step 5: AI runs test (still fails - feature not implemented)**
```bash
❌ FAILED: Mark activity as confirmed
   Error: Method not found: markActivityConfirmed
```

**Step 6: AI implements feature**
- Adds UI button
- Updates database schema
- Adds Screen Object method

**Step 7: AI runs test (passes)**
```bash
✅ PASSED: Mark activity as confirmed
```

## File Structure

```
tests/
├── README.md                          # This file
├── test-cases.data.js                 # ALL test cases (just data)
└── declarative-test-runner.example.js # Test runner (interpreter)
```

## Running Tests

```bash
# Run example
node tests/declarative-test-runner.example.js

# Run with specific test suite (when implemented)
npm run test:declarative -- --suite=TRIP_CREATION_TESTS
```

## Test Case Structure

```javascript
{
  // Required
  name: "Human-readable description",
  action: "actionType",  // createTrip, addActivity, etc.
  data: { /* action-specific data */ },
  verify: {
    ui: "What should be visible",
    db: { /* database assertions */ }
  },

  // Optional
  expectError: true,  // If this test should fail
  skip: false,        // Skip this test
  only: false,        // Run only this test
}
```

## Available Actions

| Action | Data Fields | Example |
|--------|-------------|---------|
| `createTrip` | title, startDate, endDate, description | Create new trip |
| `addActivity` | tripTitle, dayIndex, activity | Add activity to day |
| `editTrip` | tripId, updates | Update trip fields |
| `editActivity` | tripTitle, activityTitle, updates | Update activity |
| `deleteTrip` | tripId | Delete entire trip |
| `deleteActivity` | tripTitle, activityTitle | Remove activity |

*Add more actions as needed - just extend the actionMap in runner*

## Database Assertions

```javascript
// By document ID
{
  collection: "trips",
  id: "trip-123",
  assert: { title: "Paris 2025" }
}

// By query
{
  collection: "trips",
  where: { field: "title", op: "==", value: "Paris 2025" },
  assert: { dayCount: 7 }
}

// Special assertions
assert: {
  dayCount: 7,              // Number of days
  participantCount: 3,      // Number of participants
  hasActivity: "Title",     // Activity exists
  notHasActivity: "Title",  // Activity doesn't exist
  notExists: true,          // Document doesn't exist
}
```

## Adding New Tests (AI Instructions)

To add a new test:
1. Open `test-cases.data.js`
2. Add a new object to the appropriate array
3. If action doesn't exist, add it to `declarative-test-runner.js` actionMap
4. Run tests
5. Implement feature until test passes

**That's it.** No test code to write.

## Benefits

✅ **Tests are data** - Easy for AI to generate
✅ **Self-documenting** - Test name explains what it does
✅ **Maintainable** - UI changes don't break tests (Screen Objects abstract the DOM)
✅ **Composable** - Chain actions together
✅ **Debuggable** - Clear action → verify flow
✅ **Regression-safe** - Add test for every bug

## Example: Full TDD Cycle

```javascript
// 1. Human: "Add feature to duplicate a trip"

// 2. AI adds test data
{
  name: "Duplicate existing trip",
  action: "duplicateTrip",
  data: { tripId: "trip-paris-2025" },
  verify: {
    ui: "Dashboard shows 'Paris 2025 (Copy)'",
    db: {
      collection: "trips",
      where: { field: "title", op: "==", value: "Paris 2025 (Copy)" },
      assert: { dayCount: 7 } // Same as original
    }
  }
}

// 3. AI runs test → FAILS (action doesn't exist)

// 4. AI adds action handler
duplicateTrip: async () => {
  await this.app.dashboard.navigate();
  await this.app.dashboard.duplicateTrip(data.tripId);
}

// 5. AI runs test → FAILS (method doesn't exist)

// 6. AI implements duplicateTrip() in Screen Objects + service

// 7. AI runs test → PASSES ✅

// 8. Human validates UX looks good

// Done!
```

---

**Key Insight:** The test data IS the specification. AI doesn't need to understand your codebase deeply - it just needs to make the test pass.
