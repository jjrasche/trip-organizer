# Test Framework - Screen Object Pattern

A reusable, maintainable test harness using the Page Object Model (POM) pattern.

## Key Benefits

✅ **Readable** - Tests read like user stories
✅ **Maintainable** - UI changes only update screen objects, not tests
✅ **Reusable** - Screen methods used across multiple tests
✅ **Type-safe** - Clear API for interacting with screens

## Architecture

```
scripts/
├── test-framework/
│   ├── ScreenObjects.js    # Reusable screen interaction methods
│   ├── TestRunner.js       # Test execution and assertions
│   └── README.md           # This file
└── tests/
    └── crud.test.js        # Example test suite
```

## Quick Start

### 1. Run Example Tests

```bash
npm run test:harness
```

### 2. Write a New Test

```javascript
import { TestSuite } from '../test-framework/TestRunner.js';

const suite = new TestSuite('My Feature Tests');

suite.addTest('Should do something', async (runner) => {
  const { app } = runner;

  // Navigate to dashboard
  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();

  // Interact with the application
  await app.dashboard.clickCreateTrip();
  await app.createTripModal.createTrip({
    title: 'Test Trip',
    startDate: '2025-07-01',
    endDate: '2025-07-07',
  });

  // Verify results
  await runner.verifyConsoleErrors(0);
  const exists = await app.page.locator('text=Test Trip').isVisible();
  if (!exists) throw new Error('Trip not created');
});

suite.run();
```

## Screen Objects Reference

### DashboardScreen

Navigate and interact with the trip list:

```javascript
await app.dashboard.navigate()              // Go to dashboard
await app.dashboard.waitForLoad()           // Wait for page load
await app.dashboard.clickCreateTrip()       // Open create modal
await app.dashboard.viewTrip('trip-id')     // View trip details
await app.dashboard.editTrip('trip-id')     // Edit trip
await app.dashboard.deleteTrip('trip-id')   // Delete trip
const count = await app.dashboard.getTripCount()
```

### TripDetailScreen

View and manage trip activities:

```javascript
await app.tripDetail.waitForLoad()
await app.tripDetail.goBack()
const title = await app.tripDetail.getTripTitle()
await app.tripDetail.addActivityToDay(0)   // Add to first day
await app.tripDetail.editActivity('Activity Name')
await app.tripDetail.deleteActivity('Activity Name')
const exists = await app.tripDetail.verifyActivityExists('Name')
```

### Modals

Fill and submit forms:

```javascript
// Create Trip
await app.createTripModal.createTrip({
  title: 'Trip Name',
  description: 'Description',
  startDate: '2025-07-01',
  endDate: '2025-07-07',
})

// Edit Trip
await app.editTripModal.updateTrip({
  title: 'New Title',
})

// Add Activity
await app.addActivityModal.addActivity({
  title: 'Activity',
  type: 'restaurant',
  startTime: '18:00',
  location: 'Restaurant Name',
  cost: 75.50,
})

// Edit Activity
await app.editActivityModal.updateActivity({
  title: 'Updated Title',
  cost: 100.00,
})
```

### Verification Helpers

```javascript
// Console errors
await runner.verifyConsoleErrors(0)  // Expect 0 errors
await runner.verifyConsoleErrors(2)  // Expect 2 errors

// Database state
await runner.verifyDatabase(
  'trips',              // collection
  'trip-id',            // document ID
  'title',              // field path (supports 'user.name')
  'Expected Value',     // expected value
  'equals'              // assertion: equals|greaterThan|lessThan|contains
)

// Screenshots
await runner.screenshot('step-name')
```

## Comparison: Old vs New

### Old Approach (Selector-based)
```json
{
  "action": "click",
  "selector": "[data-trip-id='trip-paris-2025'] button:has-text('Edit')",
  "description": "Click Edit button on Paris trip"
},
{
  "action": "wait",
  "selector": "[data-testid='edit-trip-modal']",
  "timeout": 3000
},
{
  "action": "fill",
  "selector": "input[name='title']",
  "value": "Paris Adventure 2025 - UPDATED"
}
```

**Problems:**
- ❌ Brittle - selector changes break tests
- ❌ Hard to read - what are we testing?
- ❌ No reuse - duplicate selectors everywhere
- ❌ Hard to maintain - UI change = update 20 tests

### New Approach (Screen Objects)
```javascript
await app.dashboard.editTrip('trip-paris-2025')
await app.editTripModal.updateTrip({
  title: 'Paris Adventure 2025 - UPDATED'
})
```

**Benefits:**
- ✅ Resilient - selectors encapsulated in one place
- ✅ Readable - clear intent
- ✅ Reusable - same methods across all tests
- ✅ Maintainable - UI change = update one screen object

## Advanced Usage

### Custom Assertions

```javascript
suite.addTest('Custom verification', async (runner) => {
  const { app } = runner;

  // Your test logic...

  // Custom database check
  const tripCount = await runner.verifyDatabase(
    'users',
    'user-id',
    'tripIds.length',
    5,
    'greaterThan'
  )

  console.log(`User has ${tripCount} trips`)
})
```

### Screenshots for Debugging

```javascript
await runner.screenshot('before-action')
await app.dashboard.clickCreateTrip()
await runner.screenshot('after-action')
```

### Multiple Screens in One Test

```javascript
// Create trip on dashboard
await app.dashboard.navigate()
await app.dashboard.clickCreateTrip()
await app.createTripModal.createTrip(tripData)

// Add activity in trip detail
await app.dashboard.viewTrip('trip-id')
await app.tripDetail.addActivityToDay(0)
await app.addActivityModal.addActivity(activityData)

// Verify on dashboard
await app.tripDetail.goBack()
const updated = await app.dashboard.verifyTripExists('trip-id')
```

## Best Practices

1. **Keep tests focused** - One feature per test
2. **Use descriptive test names** - "Should create trip when form is valid"
3. **Clean up after tests** - Delete created data if needed
4. **Don't rely on test order** - Each test should be independent
5. **Use screen objects** - Never use raw selectors in tests
6. **Verify both UI and DB** - Ensure data persists correctly

## Adding New Screen Objects

When adding a new screen or feature:

1. Add methods to appropriate screen object in `ScreenObjects.js`
2. Follow naming conventions:
   - `waitFor*()` - Wait for element
   - `click*()` - Click action
   - `get*()` - Retrieve data
   - `verify*()` - Assertions
   - `find*()` - Locate elements

3. Keep methods focused and reusable
4. Document complex interactions

Example:

```javascript
export class MyNewScreen {
  constructor(page) {
    this.page = page;
  }

  async waitForLoad() {
    await this.page.waitForSelector('[data-screen="my-screen"]')
  }

  async clickActionButton() {
    await this.page.click('button[data-action="my-action"]')
  }

  async verifyState(expected) {
    const actual = await this.page.textContent('.state-indicator')
    return actual === expected
  }
}
```

## Troubleshooting

**Test hangs waiting for element:**
- Check selector in screen object
- Increase timeout if needed
- Verify element actually appears in UI

**Console errors not caught:**
- Ensure `await runner.verifyConsoleErrors()` is called
- Check browser console during test

**Database verification fails:**
- Ensure Firestore rules allow read
- Check field path is correct (case-sensitive)
- Wait for async operations to complete

## Future Enhancements

- [ ] Parallel test execution
- [ ] Visual regression testing
- [ ] Performance metrics
- [ ] API mocking layer
- [ ] CI/CD integration
- [ ] Video recording on failures
