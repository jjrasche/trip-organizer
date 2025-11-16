/**
 * DECLARATIVE TEST FRAMEWORK
 *
 * Tests are pure data objects. This runner interprets them and executes UI actions.
 *
 * Run: node tests/declarative-test-runner.example.js
 */

import { chromium } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Application } from '../scripts/test-framework/ScreenObjects.js';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// TEST DATA - This is all AI needs to generate
// ============================================================================

const TEST_CASES = [
  {
    name: "Create a new trip",
    action: "createTrip",
    data: {
      title: "Declarative Test Trip",
      description: "Created by declarative test",
      startDate: "2025-08-01",
      endDate: "2025-08-07",
    },
    verify: {
      ui: "Dashboard shows trip with title 'Declarative Test Trip'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Declarative Test Trip" },
        assert: { dayCount: 7, participantCount: 1 }
      }
    }
  },

  {
    name: "Add activity to first day",
    action: "addActivity",
    data: {
      tripTitle: "Paris 2025",
      dayIndex: 0,
      activity: {
        title: "Declarative Activity",
        type: "restaurant",
        startTime: "19:00",
        endTime: "21:00",
        location: "Test Restaurant",
        cost: 75.50,
        currency: "USD",
      }
    },
    verify: {
      ui: "Activity card shows 'Declarative Activity' with time '19:00'",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Paris 2025" },
        assert: { hasActivity: "Declarative Activity" }
      }
    }
  },

  {
    name: "Edit existing trip",
    action: "editTrip",
    data: {
      tripId: "trip-paris-2025",
      updates: {
        title: "Paris 2025 - Edited Declaratively",
        description: "Updated by declarative test"
      }
    },
    verify: {
      ui: "Trip card shows 'Paris 2025 - Edited Declaratively'",
      db: {
        collection: "trips",
        id: "trip-paris-2025",
        assert: {
          title: "Paris 2025 - Edited Declaratively",
          description: "Updated by declarative test"
        }
      }
    }
  },

  {
    name: "Delete activity",
    action: "deleteActivity",
    data: {
      tripTitle: "Paris 2025",
      activityTitle: "Declarative Activity"
    },
    verify: {
      ui: "Activity 'Declarative Activity' is not visible",
      db: {
        collection: "trips",
        where: { field: "title", op: "==", value: "Paris 2025" },
        assert: { notHasActivity: "Declarative Activity" }
      }
    }
  }
];

// ============================================================================
// TEST RUNNER - Interprets test data and executes
// ============================================================================

class DeclarativeTestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.app = null;
    this.db = null;

    // Firebase setup
    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
    };

    const fbApp = initializeApp(firebaseConfig);
    this.db = getFirestore(fbApp);
  }

  async setup() {
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();
    this.app = new Application(this.page);

    // Navigate to app
    await this.page.goto('http://localhost:3001');
    await this.page.waitForTimeout(3000);
  }

  async teardown() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  /**
   * Execute an action based on its type
   */
  async executeAction(action, data) {
    const actionMap = {
      createTrip: async () => {
        await this.app.dashboard.navigate();
        await this.app.dashboard.waitForLoad();
        await this.app.dashboard.clickCreateTrip();
        await this.app.createTripModal.createTrip(data);
      },

      addActivity: async () => {
        await this.app.dashboard.navigate();
        await this.app.dashboard.waitForLoad();
        await this.app.dashboard.viewTrip(data.tripTitle);
        await this.app.tripDetail.waitForLoad();
        await this.app.tripDetail.addActivityToDay(data.dayIndex);
        await this.app.addActivityModal.addActivity(data.activity);
      },

      editTrip: async () => {
        await this.app.dashboard.navigate();
        await this.app.dashboard.waitForLoad();
        await this.app.dashboard.editTrip(data.tripId);
        await this.app.editTripModal.updateTrip(data.updates);
      },

      deleteActivity: async () => {
        await this.app.dashboard.navigate();
        await this.app.dashboard.waitForLoad();
        await this.app.dashboard.viewTrip(data.tripTitle);
        await this.app.tripDetail.waitForLoad();
        await this.app.tripDetail.deleteActivity(data.activityTitle);
        await this.app.confirmDialog.confirm();
      },

      // Add more actions as needed...
    };

    const executor = actionMap[action];
    if (!executor) {
      throw new Error(`Unknown action: ${action}`);
    }

    await executor();
  }

  /**
   * Verify UI state
   */
  async verifyUI(expectation) {
    // Simple text-based verification for now
    // Could be extended to support more complex matchers

    if (expectation.includes("shows")) {
      const text = expectation.match(/'([^']+)'/)?.[1];
      if (text) {
        const isVisible = await this.page.locator(`text=${text}`).isVisible();
        if (!isVisible) {
          throw new Error(`UI verification failed: ${expectation}`);
        }
      }
    } else if (expectation.includes("not visible")) {
      const text = expectation.match(/'([^']+)'/)?.[1];
      if (text) {
        const isVisible = await this.page.locator(`text=${text}`).isVisible();
        if (isVisible) {
          throw new Error(`UI verification failed: ${expectation}`);
        }
      }
    }
  }

  /**
   * Verify database state
   */
  async verifyDatabase(dbCheck) {
    let docData;

    // Get document by ID or query
    if (dbCheck.id) {
      const docRef = doc(this.db, dbCheck.collection, dbCheck.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Document not found: ${dbCheck.collection}/${dbCheck.id}`);
      }
      docData = docSnap.data();
    } else if (dbCheck.where) {
      const q = query(
        collection(this.db, dbCheck.collection),
        where(dbCheck.where.field, dbCheck.where.op, dbCheck.where.value)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        throw new Error(`No documents found matching query`);
      }
      docData = snapshot.docs[0].data();
    }

    // Assert fields
    if (dbCheck.assert) {
      for (const [key, value] of Object.entries(dbCheck.assert)) {
        // Special assertions
        if (key === 'dayCount') {
          if (docData.days.length !== value) {
            throw new Error(`Expected ${value} days, got ${docData.days.length}`);
          }
        } else if (key === 'participantCount') {
          if (docData.participants.length !== value) {
            throw new Error(`Expected ${value} participants, got ${docData.participants.length}`);
          }
        } else if (key === 'hasActivity') {
          const found = docData.days.some(day =>
            day.activities?.some(a => a.title === value)
          );
          if (!found) {
            throw new Error(`Activity '${value}' not found in trip`);
          }
        } else if (key === 'notHasActivity') {
          const found = docData.days.some(day =>
            day.activities?.some(a => a.title === value)
          );
          if (found) {
            throw new Error(`Activity '${value}' should not exist but was found`);
          }
        } else {
          // Direct field comparison
          if (docData[key] !== value) {
            throw new Error(`Expected ${key} to be '${value}', got '${docData[key]}'`);
          }
        }
      }
    }
  }

  /**
   * Run a single test case
   */
  async runTest(testCase) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  ${testCase.name}`);
    console.log(`${'─'.repeat(60)}`);

    try {
      // Execute action
      console.log(`  Action: ${testCase.action}`);
      await this.executeAction(testCase.action, testCase.data);
      await this.page.waitForTimeout(1000); // Wait for updates

      // Verify UI
      if (testCase.verify.ui) {
        console.log(`  Verifying UI: ${testCase.verify.ui}`);
        await this.verifyUI(testCase.verify.ui);
        console.log(`  ✓ UI verified`);
      }

      // Verify Database
      if (testCase.verify.db) {
        console.log(`  Verifying database...`);
        await this.verifyDatabase(testCase.verify.db);
        console.log(`  ✓ Database verified`);
      }

      console.log(`✅ PASSED: ${testCase.name}`);
      return { passed: true };
    } catch (error) {
      console.log(`❌ FAILED: ${testCase.name}`);
      console.log(`   Error: ${error.message}`);
      return { passed: false, error: error.message };
    }
  }

  /**
   * Run all test cases
   */
  async runAll(testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  DECLARATIVE TEST SUITE`);
    console.log(`${'='.repeat(60)}\n`);

    const results = {
      passed: 0,
      failed: 0,
      errors: []
    };

    for (const testCase of testCases) {
      const result = await this.runTest(testCase);

      if (result.passed) {
        results.passed++;
      } else {
        results.failed++;
        results.errors.push({
          test: testCase.name,
          error: result.error
        });
      }

      // Reset to dashboard between tests
      await this.app.dashboard.navigate();
      await this.page.waitForTimeout(1000);
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  RESULTS`);
    console.log(`${'='.repeat(60)}\n`);
    console.log(`   ✅ Passed:  ${results.passed}`);
    console.log(`   ❌ Failed:  ${results.failed}`);
    console.log(`   📊 Total:   ${testCases.length}\n`);

    if (results.errors.length > 0) {
      console.log(`   Failed Tests:`);
      results.errors.forEach(({ test, error }) => {
        console.log(`      ❌ ${test}`);
        console.log(`         ${error}\n`);
      });
    }

    return results;
  }
}

// ============================================================================
// RUN TESTS
// ============================================================================

async function main() {
  const runner = new DeclarativeTestRunner();

  try {
    await runner.setup();
    const results = await runner.runAll(TEST_CASES);
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await runner.teardown();
  }
}

main();
