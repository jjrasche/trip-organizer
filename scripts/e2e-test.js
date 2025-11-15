/**
 * End-to-End Testing Suite
 * Tests UI interactions AND verifies database changes
 */
import { chromium } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize Firebase for verification
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

const BASE_URL = 'http://localhost:3001';
const TEST_USER_ID = 'test-user-415-301-8471';

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

function logTest(name, status, details = '') {
  const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${emoji} ${name}`);
  if (details) console.log(`   ${details}`);

  if (status === 'pass') results.passed.push(name);
  else if (status === 'fail') results.failed.push(name);
  else results.warnings.push(name);
}

async function verifyUserInDB() {
  console.log('\n🔍 Database Verification: User');
  try {
    const userDoc = await getDoc(doc(db, 'users', TEST_USER_ID));
    if (userDoc.exists()) {
      const user = userDoc.data();
      logTest('User exists in Firestore', 'pass', `Display: ${user.displayName}, Phone: ${user.phoneNumber}`);
      return user;
    } else {
      logTest('User exists in Firestore', 'fail', 'User document not found');
      return null;
    }
  } catch (error) {
    logTest('User exists in Firestore', 'fail', error.message);
    return null;
  }
}

async function verifyTripsInDB(userId) {
  console.log('\n🔍 Database Verification: Trips');
  try {
    const tripsQuery = query(
      collection(db, 'trips'),
      where('createdBy', '==', userId)
    );
    const snapshot = await getDocs(tripsQuery);
    const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    logTest('User has trips in Firestore', 'pass', `Found ${trips.length} trip(s)`);

    trips.forEach(trip => {
      console.log(`   📍 ${trip.title} (${trip.days?.length || 0} days, ${trip.participants?.length || 0} participants)`);
    });

    return trips;
  } catch (error) {
    logTest('User has trips in Firestore', 'fail', error.message);
    return [];
  }
}

async function testPageLoad(page) {
  console.log('\n🌐 Test: Page Load');

  try {
    // Use 'load' instead of 'networkidle' - less strict
    await page.goto(BASE_URL, {
      waitUntil: 'load',
      timeout: 15000
    });
    logTest('Page loads', 'pass');

    // Wait for React to render
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'e2e-screenshots/01-page-load.png', fullPage: true });
    logTest('Screenshot captured', 'pass', 'e2e-screenshots/01-page-load.png');

    return true;
  } catch (error) {
    logTest('Page loads', 'fail', error.message);
    return false;
  }
}

async function testDashboardElements(page) {
  console.log('\n🏠 Test: Dashboard Elements');

  try {
    // Check for key elements
    const elements = {
      'My Trips header': 'text=My Trips',
      'User display name': 'text=Test User',
      'Create Trip button': 'button:has-text("Create Trip")',
      'Sign Out button': 'button:has-text("Sign Out")',
    };

    for (const [name, selector] of Object.entries(elements)) {
      const exists = await page.locator(selector).count() > 0;
      if (exists) {
        logTest(`Dashboard has ${name}`, 'pass');
      } else {
        logTest(`Dashboard has ${name}`, 'fail');
      }
    }

    await page.screenshot({ path: 'e2e-screenshots/02-dashboard.png', fullPage: true });

    return true;
  } catch (error) {
    logTest('Dashboard elements check', 'fail', error.message);
    return false;
  }
}

async function testTripCards(page) {
  console.log('\n🗺️  Test: Trip Cards');

  try {
    // Use data-testid for more reliable selection
    const tripCards = await page.locator('[data-testid="trip-card"]').count();

    if (tripCards > 0) {
      logTest('Trip cards visible', 'pass', `Found ${tripCards} card(s)`);

      // Check trip titles using data-testid
      const tripTitles = await page.locator('[data-testid="trip-title"]').allTextContents();
      console.log(`   Trip titles found: ${tripTitles.join(', ')}`);

      // Verify specific trips
      const parisTrip = tripTitles.some(title => title.includes('Paris'));
      const tokyoTrip = tripTitles.some(title => title.includes('Tokyo'));

      if (parisTrip) logTest('Paris trip visible', 'pass');
      else logTest('Paris trip visible', 'warn', 'Card exists but Paris title not found');

      if (tokyoTrip) logTest('Tokyo trip visible', 'pass');
      else logTest('Tokyo trip visible', 'warn', 'Card exists but Tokyo title not found');

      return tripCards;
    } else {
      // Check if "No trips yet" message is showing
      const noTrips = await page.locator('text=No trips yet').count();
      if (noTrips > 0) {
        logTest('Trip cards visible', 'fail', 'Shows "No trips yet" - data not loading');
      } else {
        logTest('Trip cards visible', 'fail', 'No cards or empty state found');
      }
      return 0;
    }
  } catch (error) {
    logTest('Trip cards check', 'fail', error.message);
    return 0;
  }
}

async function testTripDetailNavigation(page) {
  console.log('\n🧭 Test: Trip Detail Navigation');

  try {
    // Find first trip card using data-testid
    const firstCard = page.locator('[data-testid="trip-card"]').first();
    const cardExists = await firstCard.count() > 0;

    if (!cardExists) {
      logTest('Navigate to trip detail', 'fail', 'No trip cards to click');
      return false;
    }

    await firstCard.click();
    logTest('Click trip card', 'pass');

    // Wait for navigation - use back button as indicator
    try {
      await page.waitForSelector('[data-testid="back-button"]', { timeout: 5000 });
      logTest('Trip detail page loaded', 'pass', 'Back button found');
    } catch {
      logTest('Trip detail page loaded', 'fail', 'Back button not found after 5s');
      await page.screenshot({ path: 'e2e-screenshots/03-trip-detail-failed.png', fullPage: true });
      return false;
    }

    await page.screenshot({ path: 'e2e-screenshots/03-trip-detail.png', fullPage: true });

    return true;
  } catch (error) {
    logTest('Trip detail navigation', 'fail', error.message);
    return false;
  }
}

async function testTripDetailContent(page) {
  console.log('\n📋 Test: Trip Detail Content');

  try {
    // Check for day sections
    const days = await page.locator('text=Day').count();
    if (days > 0) {
      logTest('Days section visible', 'pass', `Found ${days} day label(s)`);
    } else {
      logTest('Days section visible', 'warn', 'No day labels found');
    }

    // Check for activities
    const activities = await page.locator('text=:').count(); // Time format indicator
    if (activities > 0) {
      logTest('Activities visible', 'pass', `Found ${activities} time(s)`);
    } else {
      logTest('Activities visible', 'warn', 'No activity times found');
    }

    // Check for AI chat
    const chatInput = await page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]').count();
    if (chatInput > 0) {
      logTest('AI chat interface present', 'pass');
    } else {
      logTest('AI chat interface present', 'warn', 'No chat input found');
    }

    return true;
  } catch (error) {
    logTest('Trip detail content check', 'fail', error.message);
    return false;
  }
}

async function testBackNavigation(page) {
  console.log('\n⬅️  Test: Back Navigation');

  try {
    const backButton = page.locator('[data-testid="back-button"]');
    await backButton.click();
    logTest('Click back button', 'pass');

    // Wait for dashboard to load
    try {
      await page.waitForSelector('text=My Trips', { timeout: 3000 });
      logTest('Return to dashboard', 'pass');
    } catch {
      logTest('Return to dashboard', 'fail', 'My Trips header not found after 3s');
      await page.screenshot({ path: 'e2e-screenshots/04-back-failed.png', fullPage: true });
      return false;
    }

    await page.screenshot({ path: 'e2e-screenshots/04-back-to-dashboard.png', fullPage: true });

    return true;
  } catch (error) {
    logTest('Back navigation', 'fail', error.message);
    return false;
  }
}

async function testConsoleErrors(page) {
  console.log('\n🐛 Test: Console Errors');

  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    // Filter out noise
    if (text.includes('[vite]') || text.includes('DevTools')) return;

    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning') {
      warnings.push(text);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  // Let it run for a bit to collect errors
  await page.waitForTimeout(2000);

  if (errors.length === 0) {
    logTest('No console errors', 'pass');
  } else {
    logTest('No console errors', 'fail', `Found ${errors.length} error(s)`);
    errors.slice(0, 3).forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.substring(0, 100)}`);
    });
  }

  if (warnings.length > 0) {
    logTest('Console warnings', 'warn', `Found ${warnings.length} warning(s)`);
  }

  return { errors, warnings };
}

async function runE2ETests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   End-to-End Testing Suite            ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Step 1: Verify database state
  const user = await verifyUserInDB();
  const trips = await verifyTripsInDB(TEST_USER_ID);

  if (!user || trips.length === 0) {
    console.log('\n❌ CRITICAL: Test data not found in database');
    console.log('Run: npm run seed');
    process.exit(1);
  }

  // Step 2: Browser tests
  console.log('\n🌐 Starting browser tests...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300 // Slow down for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // Set up error monitoring
  const { errors, warnings } = await testConsoleErrors(page);

  try {
    // Test sequence
    const pageLoaded = await testPageLoad(page);
    if (!pageLoaded) {
      console.log('\n❌ CRITICAL: Page failed to load');
      await browser.close();
      process.exit(1);
    }

    await testDashboardElements(page);
    const tripCount = await testTripCards(page);

    if (tripCount > 0) {
      const detailLoaded = await testTripDetailNavigation(page);

      if (detailLoaded) {
        await testTripDetailContent(page);
        await testBackNavigation(page);
      }
    } else {
      console.log('\n⚠️  Skipping trip detail tests (no trip cards found)');
    }

    // Final screenshot
    await page.screenshot({ path: 'e2e-screenshots/05-final-state.png', fullPage: true });

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    results.failed.push('Test suite execution');
  }

  // Keep browser open for manual inspection
  console.log('\n📸 All screenshots saved to e2e-screenshots/');
  console.log('\n⏳ Keeping browser open for 15 seconds for inspection...\n');
  await page.waitForTimeout(15000);

  await browser.close();

  // Print summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Test Summary                         ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach((test, i) => {
      console.log(`   ${i + 1}. ${test}`);
    });
  }

  if (errors.length > 0) {
    console.log('\n🐛 Console Errors:');
    errors.slice(0, 5).forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.substring(0, 150)}`);
    });
  }

  console.log('\n');

  // Exit code
  const exitCode = results.failed.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Create screenshots directory
import { mkdirSync } from 'fs';
try {
  mkdirSync('e2e-screenshots', { recursive: true });
} catch (e) {
  // Directory already exists
}

runE2ETests();
