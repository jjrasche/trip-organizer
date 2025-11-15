/**
 * CRUD Operations E2E Test Suite
 * Tests Create, Read, Update, Delete operations with database verification
 */
import { chromium } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

// Import BDD helpers
import {
  TEST_CONFIG,
  givenUserExistsInDatabase,
  givenUserHasTrips,
  whenUserNavigatesToApp,
  thenDashboardShowsTripCards,
  takeScreenshot,
  setupConsoleErrorTracking,
  printBDDSection,
  printTestResult,
} from './test-helpers/bdd-helpers.js';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Create screenshots directory
try {
  mkdirSync('e2e-screenshots', { recursive: true });
} catch (e) {}

// Test results tracker
const results = {
  passed: [],
  failed: [],
  errors: [],
  skipped: [],
};

function recordResult(testName, status, error = null) {
  if (status === 'passed') {
    results.passed.push(testName);
  } else if (status === 'failed') {
    results.failed.push(testName);
    if (error) {
      results.errors.push({ test: testName, error: error.message });
    }
  } else if (status === 'skipped') {
    results.skipped.push(testName);
  }
}

// ============================================================================
// CRUD SCENARIO 1: CREATE - Add New Trip
// ============================================================================

async function scenario_CreateNewTrip(page, db) {
  const testName = 'CRUD 1: Create New Trip';
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║ ' + testName.padEnd(38) + ' ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // GIVEN
    printBDDSection('GIVEN', 'User is on dashboard');
    const initialTrips = await givenUserHasTrips(db, TEST_CONFIG.userId);
    const initialTripCount = initialTrips.length;
    console.log(`   Initial trip count: ${initialTripCount}`);

    // WHEN
    printBDDSection('WHEN', 'User clicks "Create Trip" button');
    const createButton = page.locator('button:has-text("Create Trip")');
    const buttonExists = await createButton.count() > 0;

    if (!buttonExists) {
      throw new Error('Create Trip button not found on dashboard');
    }

    await createButton.click();
    console.log('   ✓ Clicked Create Trip button');
    await page.waitForTimeout(1000);

    // Check if modal/form appeared
    printBDDSection('WHEN', 'User fills in trip details');

    // Try to find create trip form elements
    const titleInput = page.locator('input[placeholder*="trip" i], input[name="title"], input[id="trip-title"]');
    const titleInputExists = await titleInput.count() > 0;

    if (!titleInputExists) {
      await takeScreenshot(page, 'crud-01-create-trip-NO-FORM', 'No form appeared');
      recordResult(testName, 'skipped');
      console.log('   ⚠️  CREATE FORM NOT IMPLEMENTED YET');
      console.log('   📝 Expected: Modal/form with trip title, dates, description');
      console.log('   📝 Implementation needed in Dashboard.tsx');
      return 'skipped';
    }

    // Fill in the form (if it exists)
    const newTripData = {
      title: 'Test Trip - ' + Date.now(),
      description: 'E2E test trip created automatically',
      startDate: '2025-12-01',
      endDate: '2025-12-07',
    };

    await titleInput.fill(newTripData.title);
    console.log(`   ✓ Filled title: ${newTripData.title}`);

    // Look for other form fields
    const descInput = page.locator('textarea[placeholder*="description" i], textarea[name="description"]');
    if (await descInput.count() > 0) {
      await descInput.fill(newTripData.description);
      console.log(`   ✓ Filled description`);
    }

    const startDateInput = page.locator('input[type="date"][name*="start" i]');
    if (await startDateInput.count() > 0) {
      await startDateInput.fill(newTripData.startDate);
      console.log(`   ✓ Filled start date`);
    }

    const endDateInput = page.locator('input[type="date"][name*="end" i]');
    if (await endDateInput.count() > 0) {
      await endDateInput.fill(newTripData.endDate);
      console.log(`   ✓ Filled end date`);
    }

    printBDDSection('WHEN', 'User submits the form');
    const submitButton = page.locator('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');
    await submitButton.first().click();
    console.log('   ✓ Clicked submit button');

    // Wait for trip to be created
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'crud-01-create-trip-AFTER', 'After creating trip');

    // THEN - UI Assertions
    printBDDSection('THEN', 'New trip appears on dashboard');
    const finalTrips = await givenUserHasTrips(db, TEST_CONFIG.userId);
    const finalTripCount = finalTrips.length;

    if (finalTripCount !== initialTripCount + 1) {
      throw new Error(
        `Expected ${initialTripCount + 1} trips, found ${finalTripCount}`
      );
    }
    console.log(`   ✓ Trip count increased: ${initialTripCount} → ${finalTripCount}`);

    // THEN - Database Verification
    printBDDSection('THEN', 'Trip exists in database with correct data');
    const newTrip = finalTrips.find(t => t.title === newTripData.title);

    if (!newTrip) {
      throw new Error(`New trip "${newTripData.title}" not found in database`);
    }

    console.log(`   ✓ Trip "${newTrip.title}" created in Firestore`);
    console.log(`   ✓ Trip ID: ${newTrip.tripId}`);

    printTestResult(testName, true);
    recordResult(testName, 'passed');
    return 'passed';

  } catch (error) {
    await takeScreenshot(page, 'crud-01-create-trip-FAILED', 'Test failed');
    printTestResult(testName, false, error);
    recordResult(testName, 'failed', error);
    return 'failed';
  }
}

// ============================================================================
// CRUD SCENARIO 2: CREATE - Add Activity to Trip
// ============================================================================

async function scenario_AddActivityToTrip(page, db) {
  const testName = 'CRUD 2: Add Activity to Trip';
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║ ' + testName.padEnd(38) + ' ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // GIVEN
    printBDDSection('GIVEN', 'User is viewing a trip with days');
    const trips = await givenUserHasTrips(db, TEST_CONFIG.userId, 1);
    const testTrip = trips.find(t => t.days && t.days.length > 0);

    if (!testTrip) {
      throw new Error('No trip with days found for testing');
    }

    // Navigate to trip detail
    const tripCard = page.locator(`[data-trip-id="${testTrip.tripId}"]`);
    await tripCard.click();
    await page.waitForSelector('[data-testid="back-button"]');
    console.log(`   ✓ Opened trip: ${testTrip.title}`);

    const initialDayData = await getDoc(doc(db, 'trips', testTrip.tripId));
    const initialActivityCount = initialDayData.data().days[0].activities.length;
    console.log(`   Initial activities in Day 1: ${initialActivityCount}`);

    // WHEN
    printBDDSection('WHEN', 'User clicks "Add Activity" button');
    const addActivityButton = page.locator('button:has-text("Add Activity")').first();
    const buttonExists = await addActivityButton.count() > 0;

    if (!buttonExists) {
      await takeScreenshot(page, 'crud-02-add-activity-NO-BUTTON', 'Button not found');
      recordResult(testName, 'skipped');
      console.log('   ⚠️  ADD ACTIVITY FUNCTIONALITY NOT IMPLEMENTED YET');
      console.log('   📝 Expected: Button opens modal/form to add activity');
      console.log('   📝 Implementation needed in TripDetail.tsx');
      return 'skipped';
    }

    await addActivityButton.click();
    console.log('   ✓ Clicked Add Activity button');
    await page.waitForTimeout(1000);

    // Check if activity form appeared
    const activityTitleInput = page.locator('input[placeholder*="activity" i], input[name="activityTitle"]');
    const formExists = await activityTitleInput.count() > 0;

    if (!formExists) {
      await takeScreenshot(page, 'crud-02-add-activity-NO-FORM', 'Form did not appear');
      recordResult(testName, 'skipped');
      console.log('   ⚠️  ACTIVITY FORM NOT IMPLEMENTED YET');
      return 'skipped';
    }

    printBDDSection('WHEN', 'User fills activity details');
    const activityData = {
      title: 'E2E Test Activity - ' + Date.now(),
      type: 'attraction',
      startTime: '14:00',
      endTime: '16:00',
      location: 'Test Location',
      description: 'Automated test activity',
    };

    await activityTitleInput.fill(activityData.title);
    console.log(`   ✓ Filled activity title: ${activityData.title}`);

    // Fill other fields if they exist
    const locationInput = page.locator('input[name*="location" i]');
    if (await locationInput.count() > 0) {
      await locationInput.fill(activityData.location);
      console.log(`   ✓ Filled location`);
    }

    const startTimeInput = page.locator('input[type="time"][name*="start" i]');
    if (await startTimeInput.count() > 0) {
      await startTimeInput.fill(activityData.startTime);
      console.log(`   ✓ Filled start time`);
    }

    printBDDSection('WHEN', 'User submits activity');
    const submitButton = page.locator('button:has-text("Add"), button:has-text("Save")');
    await submitButton.first().click();
    console.log('   ✓ Submitted activity');

    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'crud-02-add-activity-AFTER', 'After adding activity');

    // THEN - Database Verification
    printBDDSection('THEN', 'Activity added to database');
    const updatedTripData = await getDoc(doc(db, 'trips', testTrip.tripId));
    const finalActivityCount = updatedTripData.data().days[0].activities.length;

    if (finalActivityCount !== initialActivityCount + 1) {
      throw new Error(
        `Expected ${initialActivityCount + 1} activities, found ${finalActivityCount}`
      );
    }

    const newActivity = updatedTripData.data().days[0].activities.find(
      a => a.title === activityData.title
    );

    if (!newActivity) {
      throw new Error(`Activity "${activityData.title}" not found in database`);
    }

    console.log(`   ✓ Activity added: "${newActivity.title}"`);
    console.log(`   ✓ Activity count: ${initialActivityCount} → ${finalActivityCount}`);

    printTestResult(testName, true);
    recordResult(testName, 'passed');
    return 'passed';

  } catch (error) {
    await takeScreenshot(page, 'crud-02-add-activity-FAILED', 'Test failed');
    printTestResult(testName, false, error);
    recordResult(testName, 'failed', error);
    return 'failed';
  }
}

// ============================================================================
// CRUD SCENARIO 3: UPDATE - Edit Activity
// ============================================================================

async function scenario_EditActivity(page, db) {
  const testName = 'CRUD 3: Edit Activity';
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║ ' + testName.padEnd(38) + ' ║');
  console.log('╚════════════════════════════════════════╝');

  recordResult(testName, 'skipped');
  console.log('\n⚠️  EDIT FUNCTIONALITY NOT IMPLEMENTED YET');
  console.log('📝 Expected behavior:');
  console.log('   - User clicks on activity card');
  console.log('   - Edit modal/form opens with existing data');
  console.log('   - User modifies fields (title, time, location)');
  console.log('   - User saves changes');
  console.log('   - Activity updates in database');
  console.log('   - UI reflects changes immediately');
  console.log('\n📝 Implementation needed:');
  console.log('   - TripDetail.tsx: Add onClick handler to activity cards');
  console.log('   - TripDetail.tsx: Create edit activity modal');
  console.log('   - trip.service.ts: Add updateActivity() function');

  return 'skipped';
}

// ============================================================================
// CRUD SCENARIO 4: DELETE - Remove Activity
// ============================================================================

async function scenario_DeleteActivity(page, db) {
  const testName = 'CRUD 4: Delete Activity';
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║ ' + testName.padEnd(38) + ' ║');
  console.log('╚════════════════════════════════════════╝');

  recordResult(testName, 'skipped');
  console.log('\n⚠️  DELETE FUNCTIONALITY NOT IMPLEMENTED YET');
  console.log('📝 Expected behavior:');
  console.log('   - User clicks delete/trash icon on activity');
  console.log('   - Confirmation modal appears');
  console.log('   - User confirms deletion');
  console.log('   - Activity removed from database');
  console.log('   - Activity disappears from UI');
  console.log('\n📝 Implementation needed:');
  console.log('   - TripDetail.tsx: Add delete button to activities');
  console.log('   - TripDetail.tsx: Add confirmation dialog');
  console.log('   - trip.service.ts: Add deleteActivity() function');

  return 'skipped';
}

// ============================================================================
// CRUD SCENARIO 5: AI Chat Interaction
// ============================================================================

async function scenario_AIChatInteraction(page, db) {
  const testName = 'CRUD 5: AI Chat Interaction';
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║ ' + testName.padEnd(38) + ' ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // GIVEN
    printBDDSection('GIVEN', 'User is viewing a trip');
    const trips = await givenUserHasTrips(db, TEST_CONFIG.userId, 1);
    const testTrip = trips[0];

    // Navigate to trip
    const tripCard = page.locator(`[data-trip-id="${testTrip.tripId}"]`);
    await tripCard.click();
    await page.waitForSelector('[data-testid="back-button"]');
    console.log(`   ✓ Opened trip: ${testTrip.title}`);

    // WHEN
    printBDDSection('WHEN', 'User opens AI chat');
    const aiButton = page.locator('button:has-text("🤖")');
    const aiExists = await aiButton.count() > 0;

    if (!aiExists) {
      await takeScreenshot(page, 'crud-05-ai-NO-BUTTON', 'AI button not found');
      recordResult(testName, 'skipped');
      console.log('   ⚠️  AI CHAT BUTTON NOT VISIBLE');
      console.log('   📝 Note: AI may not be configured (requires Firebase AI Logic)');
      return 'skipped';
    }

    await aiButton.click();
    console.log('   ✓ Clicked AI chat button');
    await page.waitForTimeout(1000);

    // Check if chat panel opened
    const chatPanel = page.locator('text=AI Assistant');
    const chatVisible = await chatPanel.isVisible();

    if (!chatVisible) {
      await takeScreenshot(page, 'crud-05-ai-NO-PANEL', 'Chat panel did not open');
      throw new Error('AI chat panel did not open');
    }
    console.log('   ✓ AI chat panel opened');

    printBDDSection('WHEN', 'User sends a message');
    const chatInput = page.locator('input[placeholder*="Ask" i]');
    const inputExists = await chatInput.count() > 0;

    if (!inputExists) {
      throw new Error('Chat input field not found');
    }

    const testMessage = 'What activities do we have planned for Day 1?';
    await chatInput.fill(testMessage);
    console.log(`   ✓ Typed message: "${testMessage}"`);

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    console.log('   ✓ Sent message');

    // THEN - Wait for AI response
    printBDDSection('THEN', 'AI responds to the message');

    // Wait for loading indicator to appear and disappear
    const loadingDots = page.locator('.animate-bounce');
    try {
      await loadingDots.first().waitFor({ state: 'visible', timeout: 3000 });
      console.log('   ✓ AI is processing...');
    } catch {
      console.log('   ⚠️  Loading indicator not found');
    }

    // Wait for response (up to 30 seconds for AI)
    await page.waitForTimeout(5000);
    await takeScreenshot(page, 'crud-05-ai-RESPONSE', 'After AI response');

    // Check if there are message bubbles
    const messages = page.locator('.rounded-lg.px-4.py-2');
    const messageCount = await messages.count();

    if (messageCount < 2) {
      throw new Error(`Expected at least 2 messages (user + AI), found ${messageCount}`);
    }

    console.log(`   ✓ Chat has ${messageCount} message(s)`);
    console.log('   ✓ AI interaction successful');

    printTestResult(testName, true);
    recordResult(testName, 'passed');
    return 'passed';

  } catch (error) {
    await takeScreenshot(page, 'crud-05-ai-FAILED', 'Test failed');
    printTestResult(testName, false, error);
    recordResult(testName, 'failed', error);
    return 'failed';
  }
}

// ============================================================================
// Main Test Suite Runner
// ============================================================================

async function runCRUDTestSuite() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   CRUD Operations E2E Test Suite              ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\nTesting: Create, Read, Update, Delete + AI Chat\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const consoleTracker = setupConsoleErrorTracking(page);

  // Navigate to app
  await whenUserNavigatesToApp(page);
  await takeScreenshot(page, 'crud-00-dashboard', 'Starting dashboard');

  // Run CRUD scenarios
  await scenario_CreateNewTrip(page, db);
  await scenario_AddActivityToTrip(page, db);
  await scenario_EditActivity(page, db);
  await scenario_DeleteActivity(page, db);
  await scenario_AIChatInteraction(page, db);

  // Final screenshot
  await takeScreenshot(page, 'crud-99-final', 'End of CRUD tests');

  console.log('\n⏳ Keeping browser open for 15 seconds...');
  await page.waitForTimeout(15000);

  await browser.close();

  // Print summary
  console.log('\n\n╔════════════════════════════════════════════════╗');
  console.log('║   CRUD Test Results Summary                    ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Skipped (Not Implemented): ${results.skipped.length}\n`);

  if (results.passed.length > 0) {
    console.log('✅ Passed Tests:');
    results.passed.forEach((test, i) => {
      console.log(`   ${i + 1}. ${test}`);
    });
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log('❌ Failed Tests:');
    results.failed.forEach((test, i) => {
      console.log(`   ${i + 1}. ${test}`);
    });
    console.log('');
  }

  if (results.skipped.length > 0) {
    console.log('⚠️  Skipped Tests (Feature Not Implemented):');
    results.skipped.forEach((test, i) => {
      console.log(`   ${i + 1}. ${test}`);
    });
    console.log('\n📋 Implementation Roadmap:');
    console.log('   1. Create Trip Modal (Dashboard.tsx)');
    console.log('   2. Add Activity Modal (TripDetail.tsx)');
    console.log('   3. Edit Activity Modal (TripDetail.tsx)');
    console.log('   4. Delete Activity Confirmation (TripDetail.tsx)');
    console.log('   5. Service functions in trip.service.ts\n');
  }

  const exitCode = results.failed.length > 0 ? 1 : 0;
  console.log(`\n${exitCode === 0 ? '✅ Tests completed' : '❌ Some tests failed'}\n`);
  process.exit(exitCode);
}

// Run the suite
runCRUDTestSuite().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
