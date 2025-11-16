import { TestSuite } from '../test-framework/TestRunner.js';

/**
 * CRUD Operations Test Suite
 * Using reusable screen objects for clean, maintainable tests
 */

const suite = new TestSuite('CRUD Operations');

// CREATE TRIP
suite.addTest('Create new trip with valid data', async (runner) => {
  const { app } = runner;

  // Navigate and create trip
  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();
  await runner.screenshot('dashboard-initial');

  await app.dashboard.clickCreateTrip();
  await app.createTripModal.createTrip({
    title: 'Automated Test Trip',
    description: 'Created by test harness',
    startDate: '2025-07-01',
    endDate: '2025-07-07',
  });

  await runner.screenshot('after-create-trip');

  // Verify
  await runner.verifyConsoleErrors(0);
  await app.dashboard.waitForLoad();
  const tripExists = await app.page.locator('text=Automated Test Trip').isVisible();
  if (!tripExists) throw new Error('Trip not created');
});

// EDIT TRIP
suite.addTest('Edit existing trip details', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();

  // Edit Paris trip
  await app.dashboard.editTrip('trip-paris-2025');
  await app.editTripModal.updateTrip({
    title: 'Paris 2025 - Edited by Harness',
    description: 'Updated via test framework',
  });

  await runner.screenshot('after-edit-trip');

  // Verify
  await runner.verifyConsoleErrors(0);
  const updated = await app.page.locator('text=Paris 2025 - Edited by Harness').isVisible();
  if (!updated) throw new Error('Trip not updated');

  await runner.verifyDatabase('trips', 'trip-paris-2025', 'title', 'Paris 2025 - Edited by Harness');
});

// ADD ACTIVITY
suite.addTest('Add activity to trip', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();
  await app.dashboard.viewTrip('trip-paris-2025');
  await app.tripDetail.waitForLoad();

  await runner.screenshot('trip-detail-before-add');

  // Add activity to first day
  await app.tripDetail.addActivityToDay(0);
  await app.addActivityModal.addActivity({
    title: 'Harness Test Activity',
    type: 'restaurant',
    startTime: '18:00',
    endTime: '20:00',
    location: 'Test Restaurant',
    description: 'Added by test harness',
    cost: 85.50,
    currency: 'USD',
  });

  await runner.screenshot('after-add-activity');

  // Verify
  await runner.verifyConsoleErrors(0);
  const activityExists = await app.tripDetail.verifyActivityExists('Harness Test Activity');
  if (!activityExists) throw new Error('Activity not created');
});

// EDIT ACTIVITY
suite.addTest('Edit existing activity', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();
  await app.dashboard.viewTrip('trip-paris-2025');
  await app.tripDetail.waitForLoad();

  // Edit the activity we just created
  await app.tripDetail.editActivity('Harness Test Activity');
  await app.editActivityModal.updateActivity({
    title: 'Harness Test Activity - EDITED',
    description: 'Updated by test framework',
    cost: 125.00,
  });

  await runner.screenshot('after-edit-activity');

  // Verify
  await runner.verifyConsoleErrors(0);
  const updated = await app.tripDetail.verifyActivityExists('Harness Test Activity - EDITED');
  if (!updated) throw new Error('Activity not updated');
});

// DELETE ACTIVITY
suite.addTest('Delete activity from trip', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();
  await app.dashboard.viewTrip('trip-paris-2025');
  await app.tripDetail.waitForLoad();

  // Delete an activity
  await app.tripDetail.deleteActivity('Harness Test Activity - EDITED');
  await app.confirmDialog.waitForOpen();
  await runner.screenshot('delete-activity-confirm');
  await app.confirmDialog.confirm();

  await app.waitFor(2000); // Wait for deletion

  await runner.screenshot('after-delete-activity');

  // Verify
  await runner.verifyConsoleErrors(0);
  const deleted = await app.tripDetail.verifyActivityDoesNotExist('Harness Test Activity - EDITED');
  if (!deleted) throw new Error('Activity not deleted');
});

// DELETE TRIP
suite.addTest('Delete entire trip', async (runner) => {
  const { app } = runner;

  await app.dashboard.navigate();
  await app.dashboard.waitForLoad();

  const initialCount = await app.dashboard.getTripCount();

  // Delete the test trip
  await app.dashboard.deleteTrip('WX6NDXcJ6oJUz7PLP0ou');
  await app.confirmDialog.waitForOpen();
  await runner.screenshot('delete-trip-confirm');
  await app.confirmDialog.confirm();

  await app.waitFor(2000); // Wait for deletion

  await runner.screenshot('after-delete-trip');

  // Verify
  await runner.verifyConsoleErrors(0);
  const deleted = await app.dashboard.verifyTripDoesNotExist('WX6NDXcJ6oJUz7PLP0ou');
  if (!deleted) throw new Error('Trip not deleted');

  const newCount = await app.dashboard.getTripCount();
  if (newCount !== initialCount - 1) {
    throw new Error(`Expected ${initialCount - 1} trips, got ${newCount}`);
  }
});

// Run the suite
suite.run().then((results) => {
  process.exit(results.failed > 0 ? 1 : 0);
});
