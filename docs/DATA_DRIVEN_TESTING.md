# Data-Driven Testing Patterns

**Purpose:** Techniques for running the same test logic against multiple data sets
**Created:** 2025-11-16

---

## Table of Contents

1. [Unit Test Patterns (Vitest)](#unit-test-patterns-vitest)
2. [E2E Test Patterns (Playwright)](#e2e-test-patterns-playwright)
3. [Inline Data Tables](#inline-data-tables)
4. [External Data Sources](#external-data-sources)
5. [Property-Based Testing](#property-based-testing)
6. [Real-World Examples](#real-world-examples)

---

## Unit Test Patterns (Vitest)

### Pattern 1: `it.each()` - Table-Driven Tests

**Best For:** Testing same logic with different inputs/outputs

```typescript
// tests/unit/services/trip.service.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTripDuration } from '@/services/trip.service';

describe('calculateTripDuration()', () => {
  // ✅ INLINE DATA TABLE
  it.each([
    // [startDate, endDate, expectedDays, description]
    ['2025-07-01', '2025-07-01', 1, 'same day trip'],
    ['2025-07-01', '2025-07-03', 3, 'weekend trip'],
    ['2025-07-01', '2025-07-07', 7, 'week-long trip'],
    ['2025-01-01', '2025-12-31', 365, 'year-long trip'],
  ])(
    'should return %i days for trip from %s to %s (%s)',
    (start, end, expected, description) => {
      // ACT
      const result = calculateTripDuration(
        new Date(start),
        new Date(end)
      );

      // ASSERT
      expect(result).toBe(expected);
    }
  );
});
```

**Output:**
```
✓ should return 1 days for trip from 2025-07-01 to 2025-07-01 (same day trip)
✓ should return 3 days for trip from 2025-07-01 to 2025-07-03 (weekend trip)
✓ should return 7 days for trip from 2025-07-01 to 2025-07-07 (week-long trip)
✓ should return 365 days for trip from 2025-01-01 to 2025-12-31 (year-long trip)
```

---

### Pattern 2: `describe.each()` - Test Suite Per Data Set

**Best For:** Running multiple related tests with different configurations

```typescript
// tests/unit/services/activity.service.test.ts
import { describe, it, expect } from 'vitest';
import { validateActivity } from '@/services/activity.service';

describe('validateActivity()', () => {
  // ✅ INLINE DATA TABLE - Creates separate test suite for each activity type
  describe.each([
    {
      type: 'restaurant',
      requiredFields: ['location', 'startTime'],
      optionalFields: ['cost', 'cuisine'],
    },
    {
      type: 'attraction',
      requiredFields: ['location', 'startTime', 'endTime'],
      optionalFields: ['cost', 'ticketUrl'],
    },
    {
      type: 'flight',
      requiredFields: ['startTime', 'endTime', 'flightNumber'],
      optionalFields: ['airline', 'confirmationCode'],
    },
    {
      type: 'accommodation',
      requiredFields: ['location', 'checkIn', 'checkOut'],
      optionalFields: ['cost', 'confirmationCode'],
    },
  ])('$type activities', ({ type, requiredFields, optionalFields }) => {

    it('should accept valid activity with all required fields', () => {
      const activity = {
        type,
        title: `Test ${type}`,
        ...Object.fromEntries(requiredFields.map(f => [f, 'test-value'])),
      };

      const result = validateActivity(activity);
      expect(result.isValid).toBe(true);
    });

    it('should reject activity missing required fields', () => {
      requiredFields.forEach(field => {
        const activity = {
          type,
          title: `Test ${type}`,
          ...Object.fromEntries(
            requiredFields.filter(f => f !== field).map(f => [f, 'test-value'])
          ),
        };

        const result = validateActivity(activity);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Missing required field: ${field}`);
      });
    });

    it('should accept optional fields', () => {
      const activity = {
        type,
        title: `Test ${type}`,
        ...Object.fromEntries(requiredFields.map(f => [f, 'test-value'])),
        ...Object.fromEntries(optionalFields.map(f => [f, 'optional-value'])),
      };

      const result = validateActivity(activity);
      expect(result.isValid).toBe(true);
    });
  });
});
```

**Output:**
```
✓ restaurant activities
  ✓ should accept valid activity with all required fields
  ✓ should reject activity missing required fields
  ✓ should accept optional fields
✓ attraction activities
  ✓ should accept valid activity with all required fields
  ✓ should reject activity missing required fields
  ✓ should accept optional fields
... (and so on for flight, accommodation)
```

---

### Pattern 3: Object-Based Data Tables

**Best For:** Complex test scenarios with many parameters

```typescript
// tests/unit/services/trip-pricing.service.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTripCost } from '@/services/trip-pricing.service';

describe('calculateTripCost()', () => {
  const testCases = [
    {
      name: 'budget trip - single traveler',
      input: {
        accommodation: 50,
        food: 30,
        activities: 20,
        travelers: 1,
        days: 3,
      },
      expected: {
        total: 300,
        perPerson: 300,
        breakdown: { accommodation: 150, food: 90, activities: 60 },
      },
    },
    {
      name: 'luxury trip - couple',
      input: {
        accommodation: 300,
        food: 100,
        activities: 150,
        travelers: 2,
        days: 7,
      },
      expected: {
        total: 7700,
        perPerson: 3850,
        breakdown: { accommodation: 2100, food: 700, activities: 1050 },
      },
    },
    {
      name: 'family trip - 4 people',
      input: {
        accommodation: 200,
        food: 150,
        activities: 100,
        travelers: 4,
        days: 5,
      },
      expected: {
        total: 9000,
        perPerson: 2250,
        breakdown: { accommodation: 1000, food: 750, activities: 500 },
      },
    },
  ];

  // ✅ LOOP OVER DATA TABLE
  testCases.forEach(({ name, input, expected }) => {
    it(`should calculate correct cost for ${name}`, () => {
      // ACT
      const result = calculateTripCost(input);

      // ASSERT
      expect(result.total).toBe(expected.total);
      expect(result.perPerson).toBe(expected.perPerson);
      expect(result.breakdown).toEqual(expected.breakdown);
    });
  });
});
```

---

### Pattern 4: Matrix Testing (Combinatorial)

**Best For:** Testing all combinations of parameters

```typescript
// tests/unit/utils/activity-filter.test.ts
import { describe, it, expect } from 'vitest';
import { filterActivities } from '@/utils/activity-filter';

describe('filterActivities()', () => {
  const activityTypes = ['restaurant', 'attraction', 'flight', 'accommodation'];
  const priceRanges = ['budget', 'moderate', 'luxury'];
  const timeOfDay = ['morning', 'afternoon', 'evening', 'night'];

  // ✅ TEST ALL COMBINATIONS
  activityTypes.forEach(type => {
    priceRanges.forEach(price => {
      timeOfDay.forEach(time => {
        it(`should filter ${type} activities with ${price} price in ${time}`, () => {
          const activities = createTestActivities(); // Factory
          const result = filterActivities(activities, { type, price, time });

          result.forEach(activity => {
            expect(activity.type).toBe(type);
            expect(activity.priceRange).toBe(price);
            expect(activity.timeOfDay).toBe(time);
          });
        });
      });
    });
  });
});
```

---

## E2E Test Patterns (Playwright)

### Pattern 1: Playwright `test.each()`

**Best For:** Running same E2E workflow with different data

```typescript
// tests/e2e/workflows/create-trip.e2e.ts
import { test, expect } from '@playwright/test';
import { Application } from '@/scripts/test-framework/ScreenObjects';

test.describe('Create Trip with Different Durations', () => {
  // ✅ INLINE DATA TABLE FOR E2E
  const tripScenarios = [
    {
      title: 'Day Trip to SF',
      start: '2025-06-15',
      end: '2025-06-15',
      expectedDays: 1,
    },
    {
      title: 'Weekend Getaway',
      start: '2025-06-14',
      end: '2025-06-16',
      expectedDays: 3,
    },
    {
      title: 'Week in Hawaii',
      start: '2025-07-01',
      end: '2025-07-07',
      expectedDays: 7,
    },
    {
      title: 'Month-Long Europe Tour',
      start: '2025-08-01',
      end: '2025-08-31',
      expectedDays: 31,
    },
  ];

  for (const scenario of tripScenarios) {
    test(`should create ${scenario.title} (${scenario.expectedDays} days)`, async ({ page }) => {
      const app = new Application(page);

      // WHEN: User creates trip
      await app.dashboard.navigate();
      await app.dashboard.clickCreateTrip();
      await app.createTripModal.createTrip({
        title: scenario.title,
        startDate: scenario.start,
        endDate: scenario.end,
      });

      // THEN: Trip appears with correct day count
      await app.dashboard.viewTrip(scenario.title);
      const dayCount = await app.tripDetail.getDayCount();
      expect(dayCount).toBe(scenario.expectedDays);
    });
  }
});
```

---

### Pattern 2: Data-Driven CRUD Operations

**Best For:** Testing CRUD with various entity types

```typescript
// tests/e2e/workflows/manage-activities.e2e.ts
import { test, expect } from '@playwright/test';
import { Application } from '@/scripts/test-framework/ScreenObjects';

test.describe('Manage Different Activity Types', () => {
  const activityTypes = [
    {
      type: 'restaurant',
      data: {
        title: 'The French Laundry',
        location: 'Yountville, CA',
        startTime: '19:00',
        endTime: '22:00',
        cost: 350,
      },
    },
    {
      type: 'attraction',
      data: {
        title: 'Golden Gate Bridge',
        location: 'San Francisco, CA',
        startTime: '10:00',
        endTime: '12:00',
        cost: 0,
      },
    },
    {
      type: 'flight',
      data: {
        title: 'SFO to LAX',
        flightNumber: 'UA1234',
        startTime: '08:00',
        endTime: '09:30',
        cost: 250,
      },
    },
  ];

  for (const { type, data } of activityTypes) {
    test(`should create, edit, and delete ${type} activity`, async ({ page }) => {
      const app = new Application(page);

      await app.dashboard.navigate();
      await app.dashboard.viewTrip('Weekend Getaway');

      // CREATE
      await app.tripDetail.addActivityToDay(0);
      await app.addActivityModal.addActivity({ ...data, type });
      await expect(page.locator(`text=${data.title}`)).toBeVisible();

      // EDIT
      await app.tripDetail.editActivity(data.title);
      await app.editActivityModal.updateActivity({ title: `${data.title} - Updated` });
      await expect(page.locator(`text=${data.title} - Updated`)).toBeVisible();

      // DELETE
      await app.tripDetail.deleteActivity(`${data.title} - Updated`);
      await app.confirmDialog.confirm();
      await expect(page.locator(`text=${data.title}`)).not.toBeVisible();
    });
  }
});
```

---

## Inline Data Tables

### Pattern: Readable Table Format

```typescript
// tests/unit/utils/date-formatter.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from '@/utils/date-formatter';

describe('formatDate()', () => {
  // ✅ VISUAL TABLE FORMAT - Easy to read and maintain
  it.each`
    input                | format         | expected
    ${'2025-07-01'}      | ${'short'}     | ${'Jul 1'}
    ${'2025-07-01'}      | ${'medium'}    | ${'Jul 1, 2025'}
    ${'2025-07-01'}      | ${'long'}      | ${'July 1, 2025'}
    ${'2025-07-01'}      | ${'full'}      | ${'Monday, July 1, 2025'}
    ${'2025-12-25'}      | ${'short'}     | ${'Dec 25'}
    ${'2025-01-01'}      | ${'medium'}    | ${'Jan 1, 2025'}
  `('should format $input as "$expected" in $format format', ({ input, format, expected }) => {
    const result = formatDate(new Date(input), format);
    expect(result).toBe(expected);
  });
});
```

---

## External Data Sources

### Pattern 1: JSON Fixture Files

**Best For:** Large data sets, shared across tests

```typescript
// tests/shared/fixtures/trip-validation-cases.json
[
  {
    "name": "valid basic trip",
    "input": {
      "title": "Paris Vacation",
      "startDate": "2025-07-01",
      "endDate": "2025-07-07"
    },
    "expected": { "isValid": true, "errors": [] }
  },
  {
    "name": "missing title",
    "input": {
      "title": "",
      "startDate": "2025-07-01",
      "endDate": "2025-07-07"
    },
    "expected": {
      "isValid": false,
      "errors": ["Title is required"]
    }
  },
  {
    "name": "end before start",
    "input": {
      "title": "Invalid Trip",
      "startDate": "2025-07-07",
      "endDate": "2025-07-01"
    },
    "expected": {
      "isValid": false,
      "errors": ["End date must be after start date"]
    }
  }
]
```

```typescript
// tests/unit/services/trip-validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateTrip } from '@/services/trip-validation.service';
import validationCases from '@/tests/shared/fixtures/trip-validation-cases.json';

describe('validateTrip()', () => {
  // ✅ LOAD DATA FROM EXTERNAL FILE
  validationCases.forEach(({ name, input, expected }) => {
    it(`should handle: ${name}`, () => {
      const result = validateTrip(input);
      expect(result).toEqual(expected);
    });
  });
});
```

---

### Pattern 2: CSV Data Files

**Best For:** Spreadsheet-style test data

```typescript
// tests/shared/fixtures/activity-costs.csv
// type,location,avgCost,currency,description
// restaurant,Paris,75,EUR,Average dinner cost
// restaurant,Tokyo,50,USD,Average dinner cost
// attraction,Paris,15,EUR,Museum entry
// attraction,Tokyo,10,USD,Temple entry
// accommodation,Paris,150,EUR,Hotel per night
// accommodation,Tokyo,100,USD,Hotel per night

// tests/unit/utils/cost-estimator.test.ts
import { describe, it, expect } from 'vitest';
import { estimateCost } from '@/utils/cost-estimator';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

describe('estimateCost()', () => {
  // ✅ LOAD CSV DATA
  const csvPath = 'tests/shared/fixtures/activity-costs.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const testCases = parse(csvContent, { columns: true, skip_empty_lines: true });

  testCases.forEach(({ type, location, avgCost, currency, description }) => {
    it(`should estimate ${type} cost in ${location} as ${avgCost} ${currency}`, () => {
      const result = estimateCost(type, location);

      expect(result.amount).toBe(parseFloat(avgCost));
      expect(result.currency).toBe(currency);
    });
  });
});
```

---

## Property-Based Testing

### Pattern: Generate Test Data Automatically

**Best For:** Testing with random/edge case data

```typescript
// tests/unit/utils/trip-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { fc, test } from '@fast-check/vitest'; // Property-based testing library
import { calculateTripDuration } from '@/utils/trip-calculator';

describe('calculateTripDuration() - Property-Based', () => {
  // ✅ GENERATE RANDOM TEST DATA
  test.prop({
    start: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    daysToAdd: fc.integer({ min: 0, max: 365 }),
  })('duration should always be positive', ({ start, daysToAdd }) => {
    const end = new Date(start);
    end.setDate(end.getDate() + daysToAdd);

    const duration = calculateTripDuration(start, end);

    expect(duration).toBeGreaterThanOrEqual(0);
  });

  test.prop({
    start: fc.date(),
    end: fc.date(),
  })('should handle any date combination without crashing', ({ start, end }) => {
    // Should not throw error
    expect(() => calculateTripDuration(start, end)).not.toThrow();
  });
});
```

---

## Real-World Examples

### Example 1: Authentication Error Scenarios

```typescript
// tests/unit/services/auth.service.test.ts
import { describe, it, expect } from 'vitest';
import { verifyPhoneNumber } from '@/services/auth.service';

describe('verifyPhoneNumber()', () => {
  // ✅ INLINE TABLE OF ERROR CASES
  it.each([
    ['', 'Phone number is required'],
    ['123', 'Phone number must be at least 10 digits'],
    ['abc-def-ghij', 'Phone number must contain only digits'],
    ['123-456-7890-1234', 'Phone number must be at most 15 digits'],
    ['555-1234', 'Phone number must include country code'],
  ])('should reject "%s" with error: %s', (phone, expectedError) => {
    expect(() => verifyPhoneNumber(phone)).toThrow(expectedError);
  });

  // ✅ INLINE TABLE OF VALID CASES
  it.each([
    ['+1-415-301-8471', '+14153018471'],
    ['(415) 301-8471', '+14153018471'],
    ['415.301.8471', '+14153018471'],
    ['+14153018471', '+14153018471'],
  ])('should normalize "%s" to "%s"', (input, expected) => {
    const result = verifyPhoneNumber(input);
    expect(result).toBe(expected);
  });
});
```

---

### Example 2: Currency Conversion Matrix

```typescript
// tests/unit/utils/currency-converter.test.ts
import { describe, it, expect } from 'vitest';
import { convertCurrency } from '@/utils/currency-converter';

describe('convertCurrency()', () => {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
  const testAmounts = [0, 1, 100, 1000];

  // ✅ TEST ALL CURRENCY PAIRS
  currencies.forEach(from => {
    currencies.forEach(to => {
      describe(`${from} → ${to}`, () => {
        testAmounts.forEach(amount => {
          it(`should convert ${amount} ${from} to ${to}`, async () => {
            const result = await convertCurrency(amount, from, to);

            // Basic sanity checks
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeFinite();
            expect(typeof result).toBe('number');

            // If same currency, amount should match
            if (from === to) {
              expect(result).toBe(amount);
            }
          });
        });
      });
    });
  });
});
```

---

### Example 3: E2E Form Validation

```typescript
// tests/e2e/workflows/form-validation.e2e.ts
import { test, expect } from '@playwright/test';
import { Application } from '@/scripts/test-framework/ScreenObjects';

test.describe('Create Trip Form Validation', () => {
  const invalidInputs = [
    {
      field: 'title',
      value: '',
      error: 'Trip title is required',
    },
    {
      field: 'title',
      value: 'ab',
      error: 'Title must be at least 3 characters',
    },
    {
      field: 'startDate',
      value: '',
      error: 'Start date is required',
    },
    {
      field: 'endDate',
      value: '2025-01-01',
      startDate: '2025-12-31',
      error: 'End date must be after start date',
    },
  ];

  for (const scenario of invalidInputs) {
    test(`should show error when ${scenario.field} is "${scenario.value}"`, async ({ page }) => {
      const app = new Application(page);

      await app.dashboard.navigate();
      await app.dashboard.clickCreateTrip();

      // Fill form with invalid data
      if (scenario.startDate) {
        await app.createTripModal.fillField('startDate', scenario.startDate);
      }
      await app.createTripModal.fillField(scenario.field, scenario.value);
      await app.createTripModal.clickSubmit();

      // Verify error message
      await expect(page.locator(`text=${scenario.error}`)).toBeVisible();
    });
  }
});
```

---

## Best Practices

### ✅ DO

1. **Keep data inline for simple cases** - Easy to read and maintain
2. **Use external files for large data sets** - Easier to update in bulk
3. **Name test cases descriptively** - Makes failures easy to understand
4. **Use template literals** for test names - Auto-generates descriptive output
5. **Combine with factories** - Mix generated + hardcoded data

### ❌ DON'T

1. **Don't duplicate logic in test data** - Use factories/functions to generate patterns
2. **Don't hard-code magic numbers** - Name your constants
3. **Don't mix concerns** - Keep validation tests separate from business logic tests
4. **Don't make tables too wide** - Split into multiple test suites if needed

---

## Quick Reference

### Vitest

```typescript
// Simple array
it.each([1, 2, 3])('test with %i', (num) => { /* ... */ });

// Array of arrays
it.each([
  [input1, expected1],
  [input2, expected2],
])('test %s expects %s', (input, expected) => { /* ... */ });

// Tagged template (table format)
it.each`
  input    | expected
  ${1}     | ${2}
  ${2}     | ${4}
`('test $input expects $expected', ({ input, expected }) => { /* ... */ });

// Describe.each
describe.each([
  { name: 'case1', value: 1 },
  { name: 'case2', value: 2 },
])('$name', ({ value }) => {
  it('should work', () => { /* ... */ });
});
```

### Playwright

```typescript
// For loop
for (const data of testData) {
  test(`test ${data.name}`, async ({ page }) => { /* ... */ });
}

// forEach (runs sequentially)
testData.forEach(data => {
  test(`test ${data.name}`, async ({ page }) => { /* ... */ });
});
```

---

## Installation

```bash
# Property-based testing (optional)
npm install --save-dev @fast-check/vitest

# CSV parsing (optional)
npm install --save-dev csv-parse
```

---

**Next Steps:**
1. Choose a pattern that fits your use case
2. Create your first data-driven test
3. Refactor existing tests to use tables
4. Build up a library of reusable test data

**See Also:**
- [TESTING_ARCHITECTURE.md](./TESTING_ARCHITECTURE.md) - Overall testing strategy
- [Vitest API Docs](https://vitest.dev/api/) - Full Vitest reference
- [Playwright Test Docs](https://playwright.dev/docs/test-parameterize) - Parameterized tests
