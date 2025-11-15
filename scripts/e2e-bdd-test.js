/**
 * BDD-Style E2E Test Suite
 * Tests complete user flows from browser to database
 */
import { chromium } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

// Import BDD helpers
import {
  TEST_CONFIG,
  givenUserExistsInDatabase,
  givenUserHasTrips,
  givenTripExists,
  whenUserNavigatesToApp,
  whenUserClicksTripCard,
  whenUserClicksBackButton,
  thenDashboardShowsUserInfo,
  thenDashboardShowsTripCards,
  thenDashboardShowsTrip,
  thenTripDetailShowsTitle,
  thenTripDetailShowsDays,
  thenTripDetailShowsActivities,
  thenNoConsoleErrors,
  thenTripExistsInDatabase,
  thenUserTripListContains,
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
} catch (e) {
  // Directory already exists
}

// Test results tracker
const results = {
  passed: [],
  failed: [],
  errors: [],
};

function recordResult(testName, passed, error = null) {
  if (passed) {
    results.passed.push(testName);
  } else {
    results.failed.push(testName);
    if (error) {
      results.errors.push({ test: testName, error: error.message });
    }
  }
}

// ============================================================================
// Scenario 1: User Login and View Dashboard
// ============================================================================

async function scenario_UserLoginAndViewDashboard(page, consoleTracker) {
  const testName = 'Scenario 1: User Login and View Dashboard';
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║ ' + testName.padEnd(38) + ' ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // GIVEN
    printBDDSection('GIVEN', 'User exists in database');
    const user = await givenUserExistsInDatabase(db);

    printBDDSection('GIVEN', 'User has trips in database');
    const trips = await givenUserHasTrips(db, TEST_CONFIG.userId, 2);

    // WHEN
    printBDDSection('WHEN', 'User navigates to application');
    await whenUserNavigatesToApp(page);
    await takeScreenshot(page, '01-dashboard-loaded', 'After navigation');

    // THEN - UI Assertions
    printBDDSection('THEN', 'Dashboard shows user information');
    await thenDashboardShowsUserInfo(page, user);

    printBDDSection('THEN', 'Dashboard shows trip cards');
    await thenDashboardShowsTripCards(page, 2);

    printBDDSection('THEN', 'Dashboard shows Paris trip');
    await thenDashboardShowsTrip(page, 'Paris Adventure');

    printBDDSection('THEN', 'Dashboard shows Tokyo trip');
    await thenDashboardShowsTrip(page, 'Tokyo Trip');

    printBDDSection('THEN', 'No console errors');
    await thenNoConsoleErrors(consoleTracker.errors);

    // THEN - Database Verification
    printBDDSection('THEN', 'User has trips in database');
    await thenUserTripListContains(db, TEST_CONFIG.userId, trips[0].tripId);

    printTestResult(testName, true);
    recordResult(testName, true);
    return true;
  } catch (error) {
    await takeScreenshot(page, '01-dashboard-FAILED', 'Test failed');
    printTestResult(testName, false, error);
    recordResult(testName, false, error);
    return false;
  }
}

// ============================================================================
// Scenario 2: Navigate to Trip Detail
// ============================================================================

async function scenario_NavigateToTripDetail(page, consoleTracker) {
  const testName = 'Scenario 2: Navigate to Trip Detail';
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║ ' + testName.padEnd(38) + ' ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // GIVEN
    printBDDSection('GIVEN', 'User is on dashboard');
    const trips = await givenUserHasTrips(db, TEST_CONFIG.userId, 1);
    const testTrip = trips[0];

    printBDDSection('GIVEN', 'Trip exists in database');
    const tripData = await givenTripExists(db, testTrip.tripId, {
      title: testTrip.title,
      minDays: 1,
    });

    // WHEN
    printBDDSection('WHEN', 'User clicks on trip card');
    await whenUserClicksTripCard(page, testTrip.title);
    await takeScreenshot(page, '02-trip-detail-loaded', testTrip.title);

    // THEN - UI Assertions
    printBDDSection('THEN', 'Trip detail shows correct title');
    await thenTripDetailShowsTitle(page, testTrip.title);

    printBDDSection('THEN', 'Trip detail shows days');
    await thenTripDetailShowsDays(page, tripData.days.length);

    printBDDSection('THEN', 'Trip detail shows activities');
    await thenTripDetailShowsActivities(page, 0, 1); // At least 1 activity

    printBDDSection('THEN', 'No console errors');
    await thenNoConsoleErrors(consoleTracker.errors);

    // THEN - Database Verification
    printBDDSection('THEN', 'Trip data correct in database');
    await thenTripExistsInDatabase(db, testTrip.tripId, {
      title: testTrip.title,
      dayCount: tripData.days.length,
      participantCount: 1,
    });

    printTestResult(testName, true);
    recordResult(testName, true);
    return true;
  } catch (error) {
    await takeScreenshot(page, '02-trip-detail-FAILED', 'Test failed');
    printTestResult(testName, false, error);
    recordResult(testName, false, error);
    return false;
  }
}

// ============================================================================
// Scenario 3: Navigate Back to Dashboard
// ============================================================================

async function scenario_NavigateBackToDashboard(page, consoleTracker) {
  const testName = 'Scenario 3: Navigate Back to Dashboard';
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║ ' + testName.padEnd(38) + ' ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // GIVEN
    printBDDSection('GIVEN', 'User is viewing trip detail');
    // (Already on trip detail from previous scenario)

    // WHEN
    printBDDSection('WHEN', 'User clicks back button');
    await whenUserClicksBackButton(page);
    await takeScreenshot(page, '03-back-to-dashboard', 'After navigation');

    // THEN - UI Assertions
    printBDDSection('THEN', 'Dashboard shows trip cards');
    await thenDashboardShowsTripCards(page, 2);

    printBDDSection('THEN', 'Dashboard shows Paris trip');
    await thenDashboardShowsTrip(page, 'Paris Adventure');

    printBDDSection('THEN', 'No console errors');
    await thenNoConsoleErrors(consoleTracker.errors);

    printTestResult(testName, true);
    recordResult(testName, true);
    return true;
  } catch (error) {
    await takeScreenshot(page, '03-back-to-dashboard-FAILED', 'Test failed');
    printTestResult(testName, false, error);
    recordResult(testName, false, error);
    return false;
  }
}

// ============================================================================
// Scenario 4: View Second Trip
// ============================================================================

async function scenario_ViewSecondTrip(page, consoleTracker) {
  const testName = 'Scenario 4: View Second Trip (Tokyo)';
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║ ' + testName.padEnd(38) + ' ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // GIVEN
    printBDDSection('GIVEN', 'User is on dashboard');
    const trips = await givenUserHasTrips(db, TEST_CONFIG.userId, 2);
    const tokyoTrip = trips.find(t => t.title.includes('Tokyo'));

    if (!tokyoTrip) {
      throw new Error('Tokyo trip not found in database');
    }

    // WHEN
    printBDDSection('WHEN', 'User clicks Tokyo trip card');
    await whenUserClicksTripCard(page, tokyoTrip.title);
    await takeScreenshot(page, '04-tokyo-trip-detail', tokyoTrip.title);

    // THEN - UI Assertions
    printBDDSection('THEN', 'Trip detail shows Tokyo title');
    await thenTripDetailShowsTitle(page, tokyoTrip.title);

    printBDDSection('THEN', 'No console errors');
    await thenNoConsoleErrors(consoleTracker.errors);

    // THEN - Database Verification
    printBDDSection('THEN', 'Tokyo trip exists in database');
    await thenTripExistsInDatabase(db, tokyoTrip.tripId, {
      title: tokyoTrip.title,
    });

    printTestResult(testName, true);
    recordResult(testName, true);
    return true;
  } catch (error) {
    await takeScreenshot(page, '04-tokyo-trip-FAILED', 'Test failed');
    printTestResult(testName, false, error);
    recordResult(testName, false, error);
    return false;
  }
}

// ============================================================================
// Main Test Suite Runner
// ============================================================================

async function runBDDTestSuite() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   BDD E2E Test Suite - Trip Organizer         ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\nBehavior-Driven Development Testing');
  console.log('Testing: Browser → UI → Services → Database\n');

  // Setup browser
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300, // Slow down for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  // Setup console error tracking
  const consoleTracker = setupConsoleErrorTracking(page);

  let allPassed = true;

  try {
    // Run scenarios in sequence
    const s1 = await scenario_UserLoginAndViewDashboard(page, consoleTracker);
    if (!s1) allPassed = false;

    const s2 = await scenario_NavigateToTripDetail(page, consoleTracker);
    if (!s2) allPassed = false;

    const s3 = await scenario_NavigateBackToDashboard(page, consoleTracker);
    if (!s3) allPassed = false;

    const s4 = await scenario_ViewSecondTrip(page, consoleTracker);
    if (!s4) allPassed = false;

    // Final screenshot
    await takeScreenshot(page, '05-final-state', 'End of test suite');

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    allPassed = false;
  }

  // Keep browser open for inspection
  console.log('\n⏳ Keeping browser open for 15 seconds for inspection...');
  await page.waitForTimeout(15000);

  await browser.close();

  // Print summary
  console.log('\n\n╔════════════════════════════════════════════════╗');
  console.log('║   Test Results Summary                         ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}\n`);

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

    if (results.errors.length > 0) {
      console.log('📋 Error Details:');
      results.errors.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.test}`);
        console.log(`      ${item.error}\n`);
      });
    }
  }

  if (consoleTracker.errors.length > 0) {
    console.log('🐛 Console Errors Detected:');
    const filtered = consoleTracker.errors.filter(
      err => !err.includes('[vite]') && !err.includes('DevTools')
    );
    filtered.slice(0, 5).forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.substring(0, 150)}`);
    });
    console.log('');
  }

  console.log('📸 Screenshots saved to: e2e-screenshots/\n');

  // Exit with appropriate code
  const exitCode = allPassed ? 0 : 1;
  console.log(`\n${allPassed ? '✅ All tests PASSED' : '❌ Some tests FAILED'}\n`);
  process.exit(exitCode);
}

// Run the suite
runBDDTestSuite().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
