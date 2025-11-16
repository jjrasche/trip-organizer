# Testing Architecture & Framework Design

**Status:** 🚧 Architecture Design
**Created:** 2025-11-16
**Purpose:** Define a comprehensive two-layer testing strategy with shared utilities for regression testing

---

## Executive Summary

This document establishes a **two-layer testing architecture** for the Trip Organizer application:

1. **Layer 1: Action-Oriented Testing** (Unit/Integration)
   - Tests individual functions, services, and business logic
   - Fast execution (milliseconds per test)
   - No UI dependencies
   - Inputs → Outputs/Side Effects

2. **Layer 2: Workflow Testing** (End-to-End)
   - Tests complete user workflows through the UI
   - Slower execution (seconds per test)
   - Full browser automation
   - User Actions → UI/Database Verification

Both layers share common utilities for assertions, data creation, and verification, creating a unified regression testing framework.

---

## Table of Contents

1. [Testing Principles](#testing-principles)
2. [Architecture Overview](#architecture-overview)
3. [Layer 1: Action-Oriented Testing](#layer-1-action-oriented-testing)
4. [Layer 2: Workflow Testing](#layer-2-workflow-testing)
5. [Shared Test Utilities](#shared-test-utilities)
6. [Test Data Management](#test-data-management)
7. [Making Services Testable](#making-services-testable)
8. [Implementation Plan](#implementation-plan)
9. [Examples](#examples)

---

## Testing Principles

### Core Philosophy

1. **Fast Feedback Loop**
   - Unit tests run in <5 seconds total
   - E2E tests run in <30 seconds per workflow
   - Developers run unit tests on every change

2. **Regression Safety**
   - Every bug gets a test
   - Every feature gets tests at both layers
   - Breaking changes caught before commit

3. **Maintainability**
   - DRY principle: shared utilities
   - Clear naming conventions
   - Self-documenting test structure

4. **Reality-Based**
   - Unit tests can use real Firebase (with test data)
   - E2E tests use real browser + real database
   - No complex mocking unless necessary

### Test Pyramid

```
         /\
        /  \  E2E Tests (10-20 tests)
       /────\  ↑ Slow, comprehensive workflows
      /      \
     /────────\ Integration Tests (50-100 tests)
    /          \ ↑ Service-level, some Firebase
   /────────────\
  /              \ Unit Tests (200+ tests)
 /________________\ ↑ Fast, pure functions
```

**Our Ratio:** 70% Unit | 20% Integration | 10% E2E

---

## Architecture Overview

### Directory Structure

```
trip-organizer/
├── src/
│   ├── services/          # Business logic (testable)
│   ├── components/        # React components
│   └── utils/             # Pure functions
│
├── tests/
│   ├── unit/              # Layer 1: Fast, isolated tests
│   │   ├── services/
│   │   │   ├── auth.service.test.ts
│   │   │   ├── user.service.test.ts
│   │   │   ├── trip.service.test.ts
│   │   │   └── ai.service.test.ts
│   │   ├── utils/
│   │   └── components/    # React Testing Library
│   │
│   ├── integration/       # Layer 1: Service + Firebase
│   │   ├── trip-crud.test.ts
│   │   ├── user-auth.test.ts
│   │   └── real-time.test.ts
│   │
│   ├── e2e/              # Layer 2: Full workflows
│   │   ├── workflows/
│   │   │   ├── create-trip.e2e.ts
│   │   │   ├── plan-itinerary.e2e.ts
│   │   │   └── ai-chat.e2e.ts
│   │   ├── regression/    # Bug reproduction tests
│   │   └── smoke/         # Critical path tests
│   │
│   └── shared/           # Shared utilities (both layers)
│       ├── factories/     # Test data creation
│       │   ├── user.factory.ts
│       │   ├── trip.factory.ts
│       │   └── activity.factory.ts
│       ├── assertions/    # Custom assertions
│       │   ├── database.assertions.ts
│       │   ├── ui.assertions.ts
│       │   └── service.assertions.ts
│       ├── fixtures/      # Static test data
│       │   ├── users.json
│       │   └── trips.json
│       ├── helpers/       # Test utilities
│       │   ├── firebase.helpers.ts
│       │   ├── time.helpers.ts
│       │   └── cleanup.helpers.ts
│       └── setup/         # Test environment setup
│           ├── vitest.setup.ts
│           └── playwright.setup.ts
│
└── scripts/
    └── test-framework/    # E2E framework (existing)
```

### Technology Stack

| Layer | Framework | Purpose |
|-------|-----------|---------|
| **Unit Tests** | [Vitest](https://vitest.dev/) | Fast, Jest-compatible, built for Vite |
| **Component Tests** | React Testing Library | Test React components in isolation |
| **E2E Tests** | Playwright | Browser automation (existing) |
| **Assertions** | Chai + Custom | Expressive, chainable assertions |
| **Test Data** | Factories | Type-safe, reusable test data |

### Why Vitest?

- ✅ **Native Vite integration** - Works with your existing build
- ✅ **Jest-compatible API** - Familiar syntax
- ✅ **Fast** - Runs tests in parallel with HMR
- ✅ **TypeScript-first** - No configuration needed
- ✅ **Watch mode** - Instant feedback during development

---

## Layer 1: Action-Oriented Testing

### Purpose

Test **individual actions and business logic** without UI dependencies.

### Characteristics

- **Fast:** <100ms per test
- **Focused:** One function/method per test
- **Isolated:** Minimal dependencies
- **Deterministic:** Same inputs = same outputs

### Test Structure

```typescript
// tests/unit/services/trip.service.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTrip, updateTrip, deleteTrip } from '@/services/trip.service';
import { createTestTrip } from '@/tests/shared/factories/trip.factory';
import { cleanupTestData } from '@/tests/shared/helpers/cleanup.helpers';

describe('TripService - CRUD Operations', () => {
  let testUserId: string;

  beforeEach(() => {
    testUserId = 'test-user-123';
  });

  afterEach(async () => {
    await cleanupTestData(['trips']);
  });

  describe('createTrip()', () => {
    it('should create trip with valid data', async () => {
      // ARRANGE
      const tripData = createTestTrip({
        title: 'Paris Vacation',
        createdBy: testUserId,
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-07'),
      });

      // ACT
      const result = await createTrip(tripData);

      // ASSERT
      expect(result).toBeDefined();
      expect(result.id).toMatch(/^[a-zA-Z0-9]{20}$/); // Firestore ID format
      expect(result.title).toBe('Paris Vacation');
      expect(result.days).toHaveLength(7);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].userId).toBe(testUserId);
    });

    it('should throw error when end date before start date', async () => {
      // ARRANGE
      const invalidTrip = createTestTrip({
        startDate: new Date('2025-07-07'),
        endDate: new Date('2025-07-01'), // Invalid!
      });

      // ACT & ASSERT
      await expect(createTrip(invalidTrip)).rejects.toThrow(
        'End date must be after start date'
      );
    });

    it('should initialize days array based on date range', async () => {
      // ARRANGE
      const tripData = createTestTrip({
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-03'), // 3 days
      });

      // ACT
      const result = await createTrip(tripData);

      // ASSERT
      expect(result.days).toHaveLength(3);
      expect(result.days[0].date.toISOString()).toContain('2025-07-01');
      expect(result.days[1].date.toISOString()).toContain('2025-07-02');
      expect(result.days[2].date.toISOString()).toContain('2025-07-03');
    });
  });

  describe('updateTrip()', () => {
    it('should update trip title and description', async () => {
      // ARRANGE
      const trip = await createTrip(createTestTrip({ createdBy: testUserId }));
      const updates = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      // ACT
      await updateTrip(trip.id, updates);

      // ASSERT
      const updated = await getTrip(trip.id);
      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Updated Description');
      expect(updated.updatedAt).not.toEqual(trip.updatedAt);
    });

    it('should not allow updating createdBy field', async () => {
      // ARRANGE
      const trip = await createTrip(createTestTrip({ createdBy: testUserId }));

      // ACT & ASSERT
      await expect(
        updateTrip(trip.id, { createdBy: 'hacker-user-id' })
      ).rejects.toThrow('Cannot modify createdBy field');
    });
  });

  describe('deleteTrip()', () => {
    it('should delete trip and return true', async () => {
      // ARRANGE
      const trip = await createTrip(createTestTrip({ createdBy: testUserId }));

      // ACT
      const result = await deleteTrip(trip.id);

      // ASSERT
      expect(result).toBe(true);
      await expect(getTrip(trip.id)).rejects.toThrow('Trip not found');
    });

    it('should remove trip ID from user tripIds array', async () => {
      // ARRANGE
      const trip = await createTrip(createTestTrip({ createdBy: testUserId }));

      // ACT
      await deleteTrip(trip.id);

      // ASSERT
      const user = await getUser(testUserId);
      expect(user.tripIds).not.toContain(trip.id);
    });
  });
});
```

### Key Patterns

1. **AAA Pattern:** Arrange → Act → Assert
2. **Descriptive Names:** `should [expected behavior] when [condition]`
3. **One Assertion Focus:** Each test verifies one thing
4. **Factory Functions:** Use factories for test data
5. **Cleanup:** Always clean up test data

---

## Layer 2: Workflow Testing

### Purpose

Test **complete user workflows** from UI interaction to database state.

### Characteristics

- **Comprehensive:** Tests entire features
- **Realistic:** Uses real browser + real data
- **Scenario-Based:** Follows user stories
- **BDD-Style:** Given/When/Then structure

### Test Structure

```typescript
// tests/e2e/workflows/create-trip.e2e.ts
import { test, expect } from '@playwright/test';
import { Application } from '@/scripts/test-framework/ScreenObjects';
import { givenUserExistsInDatabase } from '@/tests/shared/helpers/bdd.helpers';
import { thenTripExistsInDatabase } from '@/tests/shared/assertions/database.assertions';
import { cleanupTestTrips } from '@/tests/shared/helpers/cleanup.helpers';

test.describe('Create Trip Workflow', () => {
  let app: Application;
  let userId: string;

  test.beforeEach(async ({ page }) => {
    app = new Application(page);
    userId = 'test-user-415-301-8471';

    // GIVEN: User is authenticated and on dashboard
    await givenUserExistsInDatabase(userId);
    await app.dashboard.navigate();
    await app.dashboard.waitForLoad();
  });

  test.afterEach(async () => {
    await cleanupTestTrips(userId);
  });

  test('User can create a trip with basic information', async () => {
    // GIVEN: User is on dashboard (from beforeEach)

    // WHEN: User creates a new trip
    await app.dashboard.clickCreateTrip();
    await app.createTripModal.createTrip({
      title: 'Summer Vacation 2025',
      description: 'Road trip across California',
      startDate: '2025-07-01',
      endDate: '2025-07-10',
    });

    // THEN: Trip appears in dashboard
    await expect(app.page.locator('text=Summer Vacation 2025')).toBeVisible();

    // AND: Trip is saved in database with correct data
    const trips = await getTripsByUser(userId);
    const newTrip = trips.find(t => t.title === 'Summer Vacation 2025');

    expect(newTrip).toBeDefined();
    expect(newTrip.days).toHaveLength(10);
    expect(newTrip.participants[0].userId).toBe(userId);
    expect(newTrip.participants[0].role).toBe('organizer');

    // AND: No console errors occurred
    const errors = await app.getConsoleErrors();
    expect(errors).toHaveLength(0);
  });

  test('User can create trip and immediately add activities', async () => {
    // GIVEN: User is on dashboard

    // WHEN: User creates trip
    await app.dashboard.clickCreateTrip();
    await app.createTripModal.createTrip({
      title: 'Weekend Getaway',
      startDate: '2025-06-14',
      endDate: '2025-06-16',
    });

    // AND: User navigates to trip detail
    await app.dashboard.viewTrip('Weekend Getaway');
    await app.tripDetail.waitForLoad();

    // AND: User adds activity to first day
    await app.tripDetail.addActivityToDay(0);
    await app.addActivityModal.addActivity({
      title: 'Dinner at Harbor View',
      type: 'restaurant',
      startTime: '19:00',
      endTime: '21:00',
      location: 'Harbor View Restaurant',
      cost: 120.00,
      currency: 'USD',
    });

    // THEN: Activity appears in trip detail
    await expect(app.page.locator('text=Dinner at Harbor View')).toBeVisible();

    // AND: Activity is saved in database
    const trips = await getTripsByUser(userId);
    const trip = trips.find(t => t.title === 'Weekend Getaway');

    expect(trip.days[0].activities).toHaveLength(1);
    expect(trip.days[0].activities[0].title).toBe('Dinner at Harbor View');
    expect(trip.days[0].activities[0].cost).toBe(120.00);
  });

  test('User cannot create trip with invalid dates', async () => {
    // GIVEN: User is on dashboard

    // WHEN: User tries to create trip with end date before start date
    await app.dashboard.clickCreateTrip();
    await app.createTripModal.fillForm({
      title: 'Invalid Trip',
      startDate: '2025-07-10',
      endDate: '2025-07-01', // Invalid!
    });
    await app.createTripModal.clickSubmit();

    // THEN: Error message appears
    await expect(app.page.locator('text=End date must be after start date')).toBeVisible();

    // AND: Modal stays open
    await expect(app.createTripModal.isOpen()).resolves.toBe(true);

    // AND: No trip is created in database
    const trips = await getTripsByUser(userId);
    expect(trips.find(t => t.title === 'Invalid Trip')).toBeUndefined();
  });
});
```

### Key Patterns

1. **BDD Structure:** Given/When/Then comments
2. **User-Centric Language:** "User can...", "User cannot..."
3. **Screen Objects:** Abstract DOM interactions
4. **Database Verification:** Always verify data layer
5. **Complete Workflows:** Test full user journeys

---

## Shared Test Utilities

### Test Data Factories

Create realistic, type-safe test data with sensible defaults.

```typescript
// tests/shared/factories/trip.factory.ts
import { Trip, TripInput } from '@/types/trip';
import { Timestamp } from 'firebase/firestore';

let tripCounter = 0;

export function createTestTrip(overrides: Partial<TripInput> = {}): TripInput {
  const id = ++tripCounter;
  const startDate = overrides.startDate || new Date('2025-07-01');
  const endDate = overrides.endDate || new Date('2025-07-07');

  return {
    title: `Test Trip ${id}`,
    description: 'Created by test factory',
    destination: 'Test Destination',
    startDate,
    endDate,
    createdBy: 'test-user-123',
    participants: [
      {
        userId: 'test-user-123',
        role: 'organizer',
        status: 'confirmed',
        joinedAt: Timestamp.now(),
      },
    ],
    days: generateDays(startDate, endDate),
    estimatedBudget: {
      amount: 1000,
      currency: 'USD',
    },
    ...overrides,
  };
}

export function createTestActivity(overrides: Partial<Activity> = {}): Activity {
  const id = ++tripCounter;

  return {
    id: `activity-${id}`,
    title: `Test Activity ${id}`,
    type: 'attraction',
    startTime: '10:00',
    endTime: '12:00',
    location: 'Test Location',
    description: 'Test activity description',
    cost: 50,
    currency: 'USD',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

function generateDays(start: Date, end: Date): Day[] {
  const days: Day[] = [];
  const current = new Date(start);

  while (current <= end) {
    days.push({
      date: Timestamp.fromDate(new Date(current)),
      activities: [],
    });
    current.setDate(current.getDate() + 1);
  }

  return days;
}
```

### Custom Assertions

Reusable assertions for both test layers.

```typescript
// tests/shared/assertions/database.assertions.ts
import { expect } from 'vitest';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export async function assertTripExistsInDatabase(
  tripId: string,
  expectedData: Partial<Trip> = {}
) {
  const db = getFirestore();
  const tripDoc = await getDoc(doc(db, 'trips', tripId));

  expect(tripDoc.exists(), `Trip ${tripId} should exist in database`).toBe(true);

  const trip = tripDoc.data() as Trip;

  if (expectedData.title) {
    expect(trip.title).toBe(expectedData.title);
  }

  if (expectedData.dayCount) {
    expect(trip.days).toHaveLength(expectedData.dayCount);
  }

  if (expectedData.participantCount) {
    expect(trip.participants).toHaveLength(expectedData.participantCount);
  }

  return trip;
}

export async function assertUserTripListContains(userId: string, tripId: string) {
  const db = getFirestore();
  const userDoc = await getDoc(doc(db, 'users', userId));

  expect(userDoc.exists(), `User ${userId} should exist`).toBe(true);

  const user = userDoc.data();
  expect(user.tripIds).toContain(tripId);
}

export async function assertActivityExistsInTrip(
  tripId: string,
  dayIndex: number,
  activityTitle: string
) {
  const trip = await assertTripExistsInDatabase(tripId);
  const activity = trip.days[dayIndex].activities.find(a => a.title === activityTitle);

  expect(activity, `Activity "${activityTitle}" should exist in day ${dayIndex}`).toBeDefined();
  return activity;
}
```

### Test Helpers

```typescript
// tests/shared/helpers/cleanup.helpers.ts
import { getFirestore, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

export async function cleanupTestData(collections: string[]) {
  const db = getFirestore();

  for (const collectionName of collections) {
    const q = query(
      collection(db, collectionName),
      where('__test', '==', true) // Only delete test data
    );

    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
  }
}

export async function cleanupTestTrips(userId: string) {
  const db = getFirestore();
  const q = query(
    collection(db, 'trips'),
    where('createdBy', '==', userId),
    where('__test', '==', true)
  );

  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
}
```

---

## Test Data Management

### Strategy

1. **Test Isolation:** Each test creates and cleans up its own data
2. **Shared Fixtures:** Common data in JSON files for E2E tests
3. **Factory Functions:** Generate data programmatically for unit tests
4. **Test Markers:** Flag test data with `__test: true` for easy cleanup

### Seed Data for E2E Tests

```typescript
// tests/shared/fixtures/seed-data.ts
import { createUser } from '@/services/user.service';
import { createTrip } from '@/services/trip.service';
import { createTestTrip } from '../factories/trip.factory';

export async function seedTestData() {
  // Create test user
  const user = await createUser({
    userId: 'test-user-415-301-8471',
    phoneNumber: '+14153018471',
    displayName: 'Test User',
    __test: true,
  });

  // Create sample trips
  const parisTrip = await createTrip(createTestTrip({
    title: 'Paris 2025',
    destination: 'Paris, France',
    createdBy: user.userId,
    __test: true,
  }));

  const tokyoTrip = await createTrip(createTestTrip({
    title: 'Tokyo Adventure',
    destination: 'Tokyo, Japan',
    createdBy: user.userId,
    __test: true,
  }));

  console.log('✅ Test data seeded');
  return { user, trips: [parisTrip, tokyoTrip] };
}
```

---

## Making Services Testable

### Current Problem

Services are tightly coupled to Firebase, making them hard to test in isolation.

```typescript
// ❌ HARD TO TEST
export async function createTrip(trip: TripInput) {
  const db = getFirestore(); // Hardcoded dependency!
  const docRef = await addDoc(collection(db, 'trips'), trip);
  return docRef.id;
}
```

### Solution: Dependency Injection

```typescript
// ✅ TESTABLE
export class TripService {
  constructor(private db: Firestore) {}

  async createTrip(trip: TripInput): Promise<Trip> {
    const docRef = await addDoc(collection(this.db, 'trips'), trip);
    return { id: docRef.id, ...trip };
  }
}

// Production usage
import { db } from '@/config/firebase';
export const tripService = new TripService(db);

// Test usage
import { getFirestore } from 'firebase/firestore';
const testDb = getFirestore(testApp);
const testTripService = new TripService(testDb);
```

### Alternative: Functional Approach

```typescript
// ✅ ALSO TESTABLE
export async function createTrip(
  trip: TripInput,
  db: Firestore = getFirestore() // Default parameter
): Promise<Trip> {
  const docRef = await addDoc(collection(db, 'trips'), trip);
  return { id: docRef.id, ...trip };
}

// Production usage (uses default)
await createTrip(tripData);

// Test usage (inject test DB)
await createTrip(tripData, testDb);
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

- [ ] Install Vitest + React Testing Library
- [ ] Set up test directories
- [ ] Create test factories for User, Trip, Activity
- [ ] Create shared assertions
- [ ] Create cleanup helpers
- [ ] Add test markers to existing data

### Phase 2: Unit Tests (Week 2)

- [ ] Refactor services for testability
- [ ] Write unit tests for `user.service.ts`
- [ ] Write unit tests for `trip.service.ts`
- [ ] Write unit tests for `auth.service.ts`
- [ ] Write unit tests for `ai.service.ts`
- [ ] Write component tests for 3-5 key components

### Phase 3: Integration Tests (Week 3)

- [ ] Write integration tests for trip CRUD
- [ ] Write integration tests for user auth flow
- [ ] Write integration tests for real-time features
- [ ] Add database cleanup to CI

### Phase 4: E2E Migration (Week 4)

- [ ] Migrate existing E2E tests to TypeScript
- [ ] Reorganize E2E tests into workflows
- [ ] Add regression test suite
- [ ] Document all test patterns

### Phase 5: CI/CD (Week 5)

- [ ] Set up GitHub Actions for tests
- [ ] Run unit tests on every PR
- [ ] Run E2E tests on main branch
- [ ] Add coverage reporting
- [ ] Create test status badges

---

## Examples

### Example 1: Unit Test (Pure Logic)

```typescript
// tests/unit/utils/date.utils.test.ts
import { describe, it, expect } from 'vitest';
import { generateDayRange, formatDateRange } from '@/utils/date.utils';

describe('Date Utils', () => {
  describe('generateDayRange()', () => {
    it('should generate array of dates between start and end', () => {
      const start = new Date('2025-07-01');
      const end = new Date('2025-07-03');

      const result = generateDayRange(start, end);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(new Date('2025-07-01'));
      expect(result[1]).toEqual(new Date('2025-07-02'));
      expect(result[2]).toEqual(new Date('2025-07-03'));
    });
  });
});
```

### Example 2: Integration Test (Service + Firebase)

```typescript
// tests/integration/trip-crud.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TripService } from '@/services/trip.service';
import { createTestTrip } from '@/tests/shared/factories/trip.factory';
import { getTestFirestore, cleanupTestData } from '@/tests/shared/helpers/firebase.helpers';

describe('Trip CRUD Integration', () => {
  let tripService: TripService;
  let testDb: Firestore;

  beforeEach(() => {
    testDb = getTestFirestore();
    tripService = new TripService(testDb);
  });

  afterEach(async () => {
    await cleanupTestData(['trips']);
  });

  it('should create trip and retrieve it', async () => {
    // Create
    const tripData = createTestTrip({ title: 'Integration Test Trip' });
    const created = await tripService.createTrip(tripData);

    // Retrieve
    const retrieved = await tripService.getTrip(created.id);

    // Verify
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.title).toBe('Integration Test Trip');
  });
});
```

### Example 3: E2E Test (Full Workflow)

```typescript
// tests/e2e/workflows/plan-itinerary.e2e.ts
import { test, expect } from '@playwright/test';
import { Application } from '@/scripts/test-framework/ScreenObjects';

test('User can plan daily itinerary', async ({ page }) => {
  const app = new Application(page);

  // Navigate to trip
  await app.dashboard.navigate();
  await app.dashboard.viewTrip('Paris 2025');

  // Add morning activity
  await app.tripDetail.addActivityToDay(0);
  await app.addActivityModal.addActivity({
    title: 'Eiffel Tower',
    type: 'attraction',
    startTime: '09:00',
    endTime: '11:00',
  });

  // Add lunch
  await app.tripDetail.addActivityToDay(0);
  await app.addActivityModal.addActivity({
    title: 'Le Jules Verne',
    type: 'restaurant',
    startTime: '12:00',
    endTime: '14:00',
  });

  // Verify itinerary order
  const activities = await app.tripDetail.getActivitiesForDay(0);
  expect(activities[0].title).toBe('Eiffel Tower');
  expect(activities[1].title).toBe('Le Jules Verne');
});
```

---

## Next Steps

1. **Review this document** with team
2. **Choose Phase 1 or Phase 2** to start
3. **Set up Vitest** following installation guide below
4. **Create first 5 unit tests** to establish patterns
5. **Iterate and refine** based on learnings

---

## Installation Guide

### Install Vitest

```bash
npm install --save-dev vitest @vitest/ui
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev happy-dom # Fast DOM implementation
```

### Add npm Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:unit": "vitest tests/unit",
    "test:integration": "vitest tests/integration"
  }
}
```

### Create Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/shared/setup/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

**Status:** 🚧 Ready for Implementation
**Next:** Choose a phase and start building!
