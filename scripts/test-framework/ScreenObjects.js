/**
 * Screen Object Pattern - Reusable page/screen interactions
 * Each screen provides high-level methods for user actions
 */

export class DashboardScreen {
  constructor(page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('http://localhost:3001');
  }

  async waitForLoad() {
    // Wait for dashboard to load - increased timeout for Firebase data loading
    await this.page.waitForSelector('text=My Trips', { timeout: 15000 });
    // Also wait a bit for trips to load
    await this.page.waitForTimeout(2000);
  }

  async getTripCards() {
    return await this.page.locator('[data-testid="trip-card"]').all();
  }

  async findTripByTitle(title) {
    return await this.page.locator(`[data-testid="trip-card"]:has-text("${title}")`).first();
  }

  async findTripById(tripId) {
    return await this.page.locator(`[data-trip-id="${tripId}"]`).first();
  }

  async clickCreateTrip() {
    await this.page.click('button:has-text("Create Trip")');
  }

  async viewTrip(tripId) {
    const tripCard = await this.findTripById(tripId);
    await tripCard.locator('button:has-text("View Trip")').click();
  }

  async editTrip(tripId) {
    const tripCard = await this.findTripById(tripId);
    await tripCard.locator('button:has-text("Edit")').click();
  }

  async deleteTrip(tripId) {
    const tripCard = await this.findTripById(tripId);
    // Delete button only has emoji, use title attribute
    await tripCard.locator('button[title="Delete trip"]').click();
  }

  async getTripCount() {
    const cards = await this.getTripCards();
    return cards.length;
  }

  async verifyTripExists(tripId) {
    const trip = await this.findTripById(tripId);
    return await trip.isVisible();
  }

  async verifyTripDoesNotExist(tripId) {
    const count = await this.page.locator(`[data-trip-id="${tripId}"]`).count();
    return count === 0;
  }
}

export class TripDetailScreen {
  constructor(page) {
    this.page = page;
  }

  async waitForLoad() {
    // Wait for trip detail to load - increased timeout for Firebase data loading
    await this.page.waitForSelector('[data-testid="back-button"]', { timeout: 15000 });
    // Wait for activities to load
    await this.page.waitForTimeout(2000);
  }

  async goBack() {
    await this.page.click('[data-testid="back-button"]');
  }

  async getTripTitle() {
    return await this.page.textContent('h1');
  }

  async getDays() {
    return await this.page.locator('.card:has(h3:has-text("Day"))').all();
  }

  async findDayByTitle(title) {
    return await this.page.locator(`.card:has-text("${title}")`).first();
  }

  async addActivityToDay(dayIndex = 0) {
    const days = await this.getDays();
    if (dayIndex < days.length) {
      await days[dayIndex].locator('button:has-text("+ Add Activity")').click();
    }
  }

  async getActivities() {
    return await this.page.locator('[data-activity-id]').all();
  }

  async findActivityByTitle(title) {
    return await this.page.locator(`h4:has-text("${title}")`).first();
  }

  async editActivity(activityTitle) {
    const activity = await this.page.locator(`h4:has-text("${activityTitle}")`).first();
    const activityContainer = await activity.locator('xpath=../..').first();
    await activityContainer.locator('button:has-text("✏️ Edit")').click();
  }

  async deleteActivity(activityTitle) {
    const activity = await this.page.locator(`h4:has-text("${activityTitle}")`).first();
    const activityContainer = activity.locator('xpath=../..').first();
    await activityContainer.locator('button:has-text("🗑️ Delete")').click();
  }

  async verifyActivityExists(title) {
    const activity = await this.findActivityByTitle(title);
    return await activity.isVisible();
  }

  async verifyActivityDoesNotExist(title) {
    const count = await this.page.locator(`h4:has-text("${title}")`).count();
    return count === 0;
  }

  async getActivityCount() {
    const activities = await this.getActivities();
    return activities.length;
  }
}

export class CreateTripModal {
  constructor(page) {
    this.page = page;
  }

  async waitForOpen() {
    await this.page.waitForSelector('[data-testid="create-trip-modal"]', { timeout: 3000 });
  }

  async fillForm({ title, description, startDate, endDate }) {
    if (title) await this.page.fill('input[name="title"]', title);
    if (description) await this.page.fill('textarea[name="description"]', description);
    if (startDate) await this.page.fill('input[name="startDate"]', startDate);
    if (endDate) await this.page.fill('input[name="endDate"]', endDate);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async cancel() {
    await this.page.click('button:has-text("Cancel")');
  }

  async createTrip(tripData) {
    await this.waitForOpen();
    await this.fillForm(tripData);
    await this.submit();
    await this.page.waitForTimeout(2000); // Wait for creation
  }
}

export class EditTripModal {
  constructor(page) {
    this.page = page;
  }

  async waitForOpen() {
    await this.page.waitForSelector('[data-testid="edit-trip-modal"]', { timeout: 3000 });
  }

  async fillForm({ title, description, startDate, endDate }) {
    if (title !== undefined) await this.page.fill('input[name="title"]', title);
    if (description !== undefined) await this.page.fill('textarea[name="description"]', description);
    if (startDate) await this.page.fill('input[name="startDate"]', startDate);
    if (endDate) await this.page.fill('input[name="endDate"]', endDate);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async cancel() {
    await this.page.click('button:has-text("Cancel")');
  }

  async updateTrip(tripData) {
    await this.waitForOpen();
    await this.fillForm(tripData);
    await this.submit();
    await this.page.waitForTimeout(2000); // Wait for update
  }
}

export class AddActivityModal {
  constructor(page) {
    this.page = page;
  }

  async waitForOpen() {
    await this.page.waitForSelector('[data-testid="add-activity-modal"]', { timeout: 3000 });
  }

  async fillForm({ title, type, startTime, endTime, location, address, description, cost, currency }) {
    if (title) await this.page.fill('input[name="title"]', title);
    if (type) await this.page.selectOption('select[name="type"]', type);
    if (startTime) await this.page.fill('input[name="startTime"]', startTime);
    if (endTime) await this.page.fill('input[name="endTime"]', endTime);
    if (location) await this.page.fill('input[name="location"]', location);
    if (address) await this.page.fill('input[name="address"]', address);
    if (description) await this.page.fill('textarea[name="description"]', description);
    if (cost) await this.page.fill('input[name="cost"]', String(cost));
    if (currency) await this.page.selectOption('select[name="currency"]', currency);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async cancel() {
    await this.page.click('button:has-text("Cancel")');
  }

  async addActivity(activityData) {
    await this.waitForOpen();
    await this.fillForm(activityData);
    await this.submit();
    await this.page.waitForTimeout(2000); // Wait for creation
  }
}

export class EditActivityModal {
  constructor(page) {
    this.page = page;
  }

  async waitForOpen() {
    await this.page.waitForSelector('[data-testid="edit-activity-modal"]', { timeout: 3000 });
  }

  async fillForm({ title, type, startTime, endTime, location, address, description, cost, currency }) {
    if (title !== undefined) await this.page.fill('input[name="title"]', title);
    if (type) await this.page.selectOption('select[name="type"]', type);
    if (startTime !== undefined) await this.page.fill('input[name="startTime"]', startTime);
    if (endTime !== undefined) await this.page.fill('input[name="endTime"]', endTime);
    if (location !== undefined) await this.page.fill('input[name="location"]', location);
    if (address !== undefined) await this.page.fill('input[name="address"]', address);
    if (description !== undefined) await this.page.fill('textarea[name="description"]', description);
    if (cost !== undefined) await this.page.fill('input[name="cost"]', String(cost));
    if (currency) await this.page.selectOption('select[name="currency"]', currency);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async cancel() {
    await this.page.click('button:has-text("Cancel")');
  }

  async updateActivity(activityData) {
    await this.waitForOpen();
    await this.fillForm(activityData);
    await this.submit();
    await this.page.waitForTimeout(2000); // Wait for update
  }
}

export class ConfirmDialog {
  constructor(page) {
    this.page = page;
  }

  async waitForOpen() {
    await this.page.waitForSelector('[data-testid="confirm-dialog"]', { timeout: 5000 });
  }

  async confirm() {
    // Wait for dialog to be open first
    await this.waitForOpen();
    // Find the dialog container
    const dialog = await this.page.locator('[data-testid="confirm-dialog"]');
    // Click the second button (confirm button) - first is Cancel, second is Confirm
    await dialog.locator('button').nth(1).click();
  }

  async cancel() {
    await this.waitForOpen();
    const dialog = await this.page.locator('[data-testid="confirm-dialog"]');
    // Click the first button (cancel button)
    await dialog.locator('button').nth(0).click();
  }
}

/**
 * Application - High-level test harness combining all screens
 */
export class Application {
  constructor(page) {
    this.page = page;
    this.dashboard = new DashboardScreen(page);
    this.tripDetail = new TripDetailScreen(page);
    this.createTripModal = new CreateTripModal(page);
    this.editTripModal = new EditTripModal(page);
    this.addActivityModal = new AddActivityModal(page);
    this.editActivityModal = new EditActivityModal(page);
    this.confirmDialog = new ConfirmDialog(page);
  }

  async screenshot(name) {
    await this.page.screenshot({ path: `test-screenshots/${name}.png` });
  }

  async waitFor(ms) {
    await this.page.waitForTimeout(ms);
  }

  async getConsoleErrors() {
    // This would be populated by a listener set up in test initialization
    return [];
  }
}
