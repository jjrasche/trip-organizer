/**
 * BDD Test Helpers
 * Reusable Given/When/Then patterns for E2E testing
 */
import { getFirestore, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

// Test configuration
export const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001',
  userId: 'test-user-415-301-8471',
  defaultTimeout: 5000,
};

// ============================================================================
// GIVEN - Database Preconditions
// ============================================================================

/**
 * GIVEN: User exists in database
 */
export async function givenUserExistsInDatabase(db) {
  const userDoc = await getDoc(doc(db, 'users', TEST_CONFIG.userId));

  if (!userDoc.exists()) {
    throw new Error(
      `PRECONDITION FAILED: Test user "${TEST_CONFIG.userId}" not found in database.\n` +
      'Run: npm run seed'
    );
  }

  const user = userDoc.data();
  console.log(`   ✓ User exists: ${user.displayName} (${user.phoneNumber})`);
  return user;
}

/**
 * GIVEN: User has trips in database
 */
export async function givenUserHasTrips(db, userId, minTrips = 1) {
  const tripsQuery = query(
    collection(db, 'trips'),
    where('createdBy', '==', userId)
  );
  const snapshot = await getDocs(tripsQuery);
  const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (trips.length < minTrips) {
    throw new Error(
      `PRECONDITION FAILED: User has ${trips.length} trip(s), expected at least ${minTrips}.\n` +
      'Run: npm run seed'
    );
  }

  console.log(`   ✓ User has ${trips.length} trip(s)`);
  trips.forEach(trip => {
    console.log(`     - ${trip.title}`);
  });

  return trips;
}

/**
 * GIVEN: Trip exists with specific data
 */
export async function givenTripExists(db, tripId, expectedData = {}) {
  const tripDoc = await getDoc(doc(db, 'trips', tripId));

  if (!tripDoc.exists()) {
    throw new Error(`PRECONDITION FAILED: Trip "${tripId}" not found in database`);
  }

  const trip = tripDoc.data();

  // Validate expected data if provided
  if (expectedData.title && trip.title !== expectedData.title) {
    throw new Error(
      `PRECONDITION FAILED: Trip title is "${trip.title}", expected "${expectedData.title}"`
    );
  }

  if (expectedData.minDays && trip.days.length < expectedData.minDays) {
    throw new Error(
      `PRECONDITION FAILED: Trip has ${trip.days.length} days, expected at least ${expectedData.minDays}`
    );
  }

  console.log(`   ✓ Trip exists: "${trip.title}"`);
  console.log(`     Days: ${trip.days.length}, Participants: ${trip.participants.length}`);

  return trip;
}

// ============================================================================
// WHEN - User Actions (DOM Interactions)
// ============================================================================

/**
 * WHEN: User navigates to application
 */
export async function whenUserNavigatesToApp(page, options = {}) {
  const url = options.url || TEST_CONFIG.baseUrl;
  const waitUntil = options.waitUntil || 'domcontentloaded';
  const timeout = options.timeout || 10000;

  try {
    await page.goto(url, { waitUntil, timeout });
    await page.waitForTimeout(2000); // Wait for React
    console.log(`   ✓ Navigated to ${url}`);
    return true;
  } catch (error) {
    throw new Error(`DOM ACTION FAILED: Could not navigate to ${url}\n   ${error.message}`);
  }
}

/**
 * WHEN: User clicks on a trip card
 */
export async function whenUserClicksTripCard(page, tripTitle = null) {
  try {
    let card;

    if (tripTitle) {
      // Click specific trip by title
      card = page.locator(`[data-testid="trip-card"]:has-text("${tripTitle}")`);
    } else {
      // Click first trip card
      card = page.locator('[data-testid="trip-card"]').first();
    }

    const count = await card.count();
    if (count === 0) {
      const title = tripTitle ? `"${tripTitle}"` : 'any';
      throw new Error(`Trip card ${title} not found on page`);
    }

    await card.click();
    console.log(`   ✓ Clicked trip card${tripTitle ? `: "${tripTitle}"` : ''}`);

    // Wait for navigation
    await page.waitForSelector('[data-testid="back-button"]', {
      timeout: TEST_CONFIG.defaultTimeout
    });
    console.log(`   ✓ Trip detail page loaded`);

    return true;
  } catch (error) {
    throw new Error(`DOM ACTION FAILED: Could not click trip card\n   ${error.message}`);
  }
}

/**
 * WHEN: User clicks back button
 */
export async function whenUserClicksBackButton(page) {
  try {
    const backButton = page.locator('[data-testid="back-button"]');

    const count = await backButton.count();
    if (count === 0) {
      throw new Error('Back button not found');
    }

    await backButton.click();
    console.log(`   ✓ Clicked back button`);

    // Wait for dashboard
    await page.waitForSelector('text=My Trips', {
      timeout: TEST_CONFIG.defaultTimeout
    });
    console.log(`   ✓ Returned to dashboard`);

    return true;
  } catch (error) {
    throw new Error(`DOM ACTION FAILED: Could not click back button\n   ${error.message}`);
  }
}

/**
 * WHEN: User opens AI chat
 */
export async function whenUserOpensAIChat(page) {
  try {
    const aiButton = page.locator('button:has-text("🤖")');

    const count = await aiButton.count();
    if (count === 0) {
      throw new Error('AI chat button not found');
    }

    await aiButton.click();
    console.log(`   ✓ Clicked AI chat button`);

    // Wait for chat panel
    await page.waitForSelector('text=AI Assistant', {
      timeout: TEST_CONFIG.defaultTimeout
    });
    console.log(`   ✓ AI chat panel opened`);

    return true;
  } catch (error) {
    throw new Error(`DOM ACTION FAILED: Could not open AI chat\n   ${error.message}`);
  }
}

/**
 * WHEN: User types in AI chat
 */
export async function whenUserTypesInAIChat(page, message) {
  try {
    const input = page.locator('input[placeholder*="Ask"]');
    await input.fill(message);
    console.log(`   ✓ Typed message: "${message}"`);

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    console.log(`   ✓ Clicked send`);

    return true;
  } catch (error) {
    throw new Error(`DOM ACTION FAILED: Could not type in AI chat\n   ${error.message}`);
  }
}

// ============================================================================
// THEN - UI Assertions
// ============================================================================

/**
 * THEN: Dashboard shows user info
 */
export async function thenDashboardShowsUserInfo(page, expectedUser) {
  try {
    // Check user name
    const nameVisible = await page.locator(`text=${expectedUser.displayName}`).isVisible();
    if (!nameVisible) {
      throw new Error(`User name "${expectedUser.displayName}" not visible`);
    }
    console.log(`   ✓ User name visible: ${expectedUser.displayName}`);

    // Check sign out button
    const signOutVisible = await page.locator('button:has-text("Sign Out")').isVisible();
    if (!signOutVisible) {
      throw new Error('Sign Out button not visible');
    }
    console.log(`   ✓ Sign Out button visible`);

    return true;
  } catch (error) {
    throw new Error(`UI ASSERTION FAILED: Dashboard user info incorrect\n   ${error.message}`);
  }
}

/**
 * THEN: Dashboard shows trip cards
 */
export async function thenDashboardShowsTripCards(page, expectedCount) {
  try {
    const cards = await page.locator('[data-testid="trip-card"]').count();

    if (cards !== expectedCount) {
      throw new Error(`Expected ${expectedCount} trip cards, found ${cards}`);
    }

    console.log(`   ✓ Dashboard shows ${cards} trip card(s)`);
    return true;
  } catch (error) {
    throw new Error(`UI ASSERTION FAILED: Trip card count incorrect\n   ${error.message}`);
  }
}

/**
 * THEN: Dashboard shows specific trip
 */
export async function thenDashboardShowsTrip(page, tripTitle) {
  try {
    const tripCard = page.locator(`[data-testid="trip-title"]:has-text("${tripTitle}")`);
    const count = await tripCard.count();

    if (count === 0) {
      throw new Error(`Trip "${tripTitle}" not found on dashboard`);
    }

    console.log(`   ✓ Trip visible: "${tripTitle}"`);
    return true;
  } catch (error) {
    throw new Error(`UI ASSERTION FAILED: Trip not visible\n   ${error.message}`);
  }
}

/**
 * THEN: Trip detail shows correct title
 */
export async function thenTripDetailShowsTitle(page, expectedTitle) {
  try {
    const titleElement = page.locator('h1').first();
    const actualTitle = await titleElement.textContent();

    if (!actualTitle.includes(expectedTitle)) {
      throw new Error(`Expected title "${expectedTitle}", found "${actualTitle}"`);
    }

    console.log(`   ✓ Trip title correct: "${expectedTitle}"`);
    return true;
  } catch (error) {
    throw new Error(`UI ASSERTION FAILED: Trip title incorrect\n   ${error.message}`);
  }
}

/**
 * THEN: Trip detail shows days
 */
export async function thenTripDetailShowsDays(page, expectedDayCount) {
  try {
    // Count day sections - look for "Add Activity" buttons which appear once per day
    const addActivityButtons = await page.locator('button:has-text("Add Activity")').count();

    if (addActivityButtons !== expectedDayCount) {
      throw new Error(`Expected ${expectedDayCount} days, found ${addActivityButtons}`);
    }

    console.log(`   ✓ Trip shows ${addActivityButtons} day(s)`);
    return true;
  } catch (error) {
    throw new Error(`UI ASSERTION FAILED: Day count incorrect\n   ${error.message}`);
  }
}

/**
 * THEN: Trip detail shows activities
 */
export async function thenTripDetailShowsActivities(page, dayIndex, expectedActivityCount) {
  try {
    // This is a simplified check - in real implementation,
    // you'd target specific day cards more precisely
    const activities = await page.locator('text=⏰').count();

    if (activities < expectedActivityCount) {
      throw new Error(
        `Expected at least ${expectedActivityCount} activities, found ${activities} time indicators`
      );
    }

    console.log(`   ✓ Activities visible (found ${activities} time indicators)`);
    return true;
  } catch (error) {
    throw new Error(`UI ASSERTION FAILED: Activity count incorrect\n   ${error.message}`);
  }
}

/**
 * THEN: No console errors
 */
export async function thenNoConsoleErrors(consoleErrors) {
  try {
    const filteredErrors = consoleErrors.filter(err => {
      // Filter out known harmless errors
      return !err.includes('[vite]') && !err.includes('DevTools');
    });

    if (filteredErrors.length > 0) {
      throw new Error(
        `Found ${filteredErrors.length} console error(s):\n` +
        filteredErrors.slice(0, 3).map((err, i) => `   ${i + 1}. ${err.substring(0, 100)}`).join('\n')
      );
    }

    console.log(`   ✓ No console errors`);
    return true;
  } catch (error) {
    throw new Error(`UI ASSERTION FAILED: Console errors detected\n   ${error.message}`);
  }
}

// ============================================================================
// THEN - Database Assertions
// ============================================================================

/**
 * THEN: Trip exists in database with correct data
 */
export async function thenTripExistsInDatabase(db, tripId, expectedData = {}) {
  try {
    const tripDoc = await getDoc(doc(db, 'trips', tripId));

    if (!tripDoc.exists()) {
      throw new Error(`Trip "${tripId}" not found in database`);
    }

    const trip = tripDoc.data();

    // Verify title
    if (expectedData.title && trip.title !== expectedData.title) {
      throw new Error(`Trip title is "${trip.title}", expected "${expectedData.title}"`);
    }

    // Verify participant count
    if (expectedData.participantCount && trip.participants.length !== expectedData.participantCount) {
      throw new Error(
        `Trip has ${trip.participants.length} participants, expected ${expectedData.participantCount}`
      );
    }

    // Verify day count
    if (expectedData.dayCount && trip.days.length !== expectedData.dayCount) {
      throw new Error(`Trip has ${trip.days.length} days, expected ${expectedData.dayCount}`);
    }

    console.log(`   ✓ Trip exists in database: "${trip.title}"`);
    console.log(`     Days: ${trip.days.length}, Participants: ${trip.participants.length}`);

    return trip;
  } catch (error) {
    throw new Error(`DB ASSERTION FAILED: Trip verification failed\n   ${error.message}`);
  }
}

/**
 * THEN: User trip list contains trip
 */
export async function thenUserTripListContains(db, userId, tripId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      throw new Error(`User "${userId}" not found`);
    }

    const user = userDoc.data();
    if (!user.tripIds || !user.tripIds.includes(tripId)) {
      throw new Error(`User's tripIds does not include "${tripId}"`);
    }

    console.log(`   ✓ User trip list contains: "${tripId}"`);
    return true;
  } catch (error) {
    throw new Error(`DB ASSERTION FAILED: User trip list check failed\n   ${error.message}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Take screenshot with descriptive name
 */
export async function takeScreenshot(page, name, description = '') {
  const filename = `e2e-screenshots/${name}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`   📸 Screenshot: ${filename}${description ? ` - ${description}` : ''}`);
  return filename;
}

/**
 * Setup console error tracking
 */
export function setupConsoleErrorTracking(page) {
  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning') {
      warnings.push(text);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  return { errors, warnings };
}

/**
 * Print BDD section header
 */
export function printBDDSection(section, title) {
  const emoji = {
    'GIVEN': '📋',
    'WHEN': '🎬',
    'THEN': '✅',
    'AND': '➕',
  }[section] || '🔹';

  console.log(`\n${emoji} ${section}: ${title}`);
}

/**
 * Print test result
 */
export function printTestResult(testName, passed, error = null) {
  const emoji = passed ? '✅' : '❌';
  console.log(`\n${emoji} ${testName} - ${passed ? 'PASSED' : 'FAILED'}`);

  if (error) {
    console.log(`   Error: ${error.message}`);
  }
}
