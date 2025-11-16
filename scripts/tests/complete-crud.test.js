import { TestSuite } from '../test-framework/TestRunner.js';

/**
 * Complete CRUD Test Suite
 * Tests all Create, Read, Update, Delete operations using the test harness
 */

const suite = new TestSuite('Complete CRUD Operations');

// ==================== CREATE OPERATIONS ====================

suite.addTest('CREATE: New trip with valid data', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();
  await runner.screenshot('01-dashboard-initial');

  const initialCount = await app.dashboard.getTripCount();

  await app.dashboard.clickCreateTrip();
  await app.createTripModal.createTrip({
    title: 'Complete Test Trip',
    description: 'Full CRUD test suite trip',
    startDate: '2025-08-01',
    endDate: '2025-08-10',
  });

  await runner.screenshot('02-after-create-trip');

  // Verify - After creating trip, we're redirected to trip detail page
  await runner.verifyConsoleErrors(0);
  // Wait for trip detail to load
  await app.tripDetail.waitForLoad();

  // Verify we're on the trip detail page
  const tripTitle = await app.tripDetail.getTripTitle();
  if (!tripTitle.includes('Complete Test Trip')) {
    throw new Error(`Expected trip title to contain 'Complete Test Trip', got '${tripTitle}'`);
  }

  // Navigate back to dashboard to verify count
  await app.tripDetail.goBack();
  await app.dashboard.waitForLoad();

  const newCount = await app.dashboard.getTripCount();
  if (newCount !== initialCount + 1) {
    throw new Error(`Expected ${initialCount + 1} trips, got ${newCount}`);
  }
});

suite.addTest('CREATE: Add activity to trip', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();
  await app.dashboard.viewTrip('trip-paris-2025');
  await app.tripDetail.waitForLoad();

  await runner.screenshot('03-trip-detail-before-add');

  const initialCount = await app.tripDetail.getActivityCount();

  await app.tripDetail.addActivityToDay(0);
  await app.addActivityModal.addActivity({
    title: 'Complete Test Activity',
    type: 'restaurant',
    startTime: '19:00',
    endTime: '21:00',
    location: 'Test Restaurant',
    description: 'Created by complete CRUD suite',
    cost: 95.00,
    currency: 'USD',
  });

  await runner.screenshot('04-after-add-activity');

  // Verify
  await runner.verifyConsoleErrors(0);
  const activityExists = await app.tripDetail.verifyActivityExists('Complete Test Activity');
  if (!activityExists) throw new Error('Activity not created');
});

// ==================== READ OPERATIONS ====================

suite.addTest('READ: View trip details', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();
  await app.dashboard.viewTrip('trip-paris-2025');
  await app.tripDetail.waitForLoad();

  await runner.screenshot('05-view-trip-detail');

  // Verify trip loaded correctly
  const title = await app.tripDetail.getTripTitle();
  if (!title.includes('Paris')) {
    throw new Error(`Expected trip title to contain 'Paris', got '${title}'`);
  }

  const days = await app.tripDetail.getDays();
  if (days.length === 0) {
    throw new Error('No days found in trip');
  }

  await runner.verifyConsoleErrors(0);
});

suite.addTest('READ: View all trips on dashboard', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();

  await runner.screenshot('06-dashboard-view');

  const count = await app.dashboard.getTripCount();
  if (count === 0) {
    throw new Error('No trips found on dashboard');
  }

  console.log(`   ℹ️  Found ${count} trips on dashboard`);
  await runner.verifyConsoleErrors(0);
});

// ==================== UPDATE OPERATIONS ====================

suite.addTest('UPDATE: Edit trip details', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();

  await app.dashboard.editTrip('trip-paris-2025');
  await app.editTripModal.updateTrip({
    title: 'Paris Adventure 2025 - Complete Test',
    description: 'Updated by complete CRUD suite',
  });

  await runner.screenshot('07-after-edit-trip');

  // Verify
  await runner.verifyConsoleErrors(0);
  const updated = await app.page.locator('text=Paris Adventure 2025 - Complete Test').isVisible();
  if (!updated) throw new Error('Trip not updated');

  await runner.verifyDatabase(
    'trips',
    'trip-paris-2025',
    'title',
    'Paris Adventure 2025 - Complete Test'
  );
});

suite.addTest('UPDATE: Edit activity details', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();
  await app.dashboard.viewTrip('trip-paris-2025');
  await app.tripDetail.waitForLoad();

  await app.tripDetail.editActivity('Complete Test Activity');
  await app.editActivityModal.updateActivity({
    title: 'Complete Test Activity - UPDATED',
    description: 'Edited by complete CRUD suite',
    cost: 150.00,
  });

  await runner.screenshot('08-after-edit-activity');

  // Verify
  await runner.verifyConsoleErrors(0);
  const updated = await app.tripDetail.verifyActivityExists('Complete Test Activity - UPDATED');
  if (!updated) throw new Error('Activity not updated');
});

// ==================== DELETE OPERATIONS ====================

suite.addTest('DELETE: Remove activity from trip', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();
  await app.dashboard.viewTrip('trip-paris-2025');
  await app.tripDetail.waitForLoad();

  await app.tripDetail.deleteActivity('Complete Test Activity - UPDATED');
  await app.confirmDialog.waitForOpen();
  await runner.screenshot('09-delete-activity-confirm');
  await app.confirmDialog.confirm();

  await app.waitFor(2000);
  await runner.screenshot('10-after-delete-activity');

  // Verify
  await runner.verifyConsoleErrors(0);
  const deleted = await app.tripDetail.verifyActivityDoesNotExist('Complete Test Activity - UPDATED');
  if (!deleted) throw new Error('Activity still exists after deletion');
});

suite.addTest('DELETE: Remove entire trip', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();

  const initialCount = await app.dashboard.getTripCount();

  // Find and delete the first test trip we created
  const tripCard = await app.page.locator('[data-testid="trip-card"]:has-text("Complete Test Trip")').first();
  const testTripExists = await tripCard.isVisible().catch(() => false);
  if (!testTripExists) {
    console.log('   ⚠️  Test trip not found, might have been deleted in previous run');
    return;
  }

  // We need to get the trip ID - let's use a data attribute selector
  const tripId = await tripCard.getAttribute('data-trip-id');

  await app.dashboard.deleteTrip(tripId);
  await app.confirmDialog.waitForOpen();
  await runner.screenshot('11-delete-trip-confirm');
  await app.confirmDialog.confirm();

  await app.waitFor(2000);
  await runner.screenshot('12-after-delete-trip');

  // Verify
  await runner.verifyConsoleErrors(0);
  const deleted = await app.dashboard.verifyTripDoesNotExist(tripId);
  if (!deleted) throw new Error('Trip still exists after deletion');

  const newCount = await app.dashboard.getTripCount();
  if (newCount !== initialCount - 1) {
    throw new Error(`Expected ${initialCount - 1} trips, got ${newCount}`);
  }
});

// Run the complete suite
console.log('\n🚀 Running Complete CRUD Test Suite...\n');
suite.run().then((results) => {
  console.log('\n✨ Test suite completed!\n');
  process.exit(results.failed > 0 ? 1 : 0);
});
