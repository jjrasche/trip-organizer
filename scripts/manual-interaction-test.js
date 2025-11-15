/**
 * Manual Interaction Test
 * Claude manually interacts with the app and reports what happens
 */
import { chromium } from '@playwright/test';

async function manualTest() {
  console.log('🧑‍💻 Starting Manual Interaction Test\n');
  console.log('I will interact with the app like a real user and report what I see.\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000 // Very slow so we can "see" what's happening
  });

  const page = await browser.newContext().then(ctx => ctx.newPage());

  try {
    // Step 1: Load the page
    console.log('📱 STEP 1: Opening http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const pageTitle = await page.title();
    console.log(`   ✓ Page loaded. Title: "${pageTitle}"\n`);

    // Step 2: Look at what's on screen
    console.log('👀 STEP 2: Looking at the dashboard...');
    const headerText = await page.locator('text=My Trips').textContent();
    console.log(`   ✓ I see the header: "${headerText}"`);

    const userName = await page.locator('text=Test User').textContent();
    console.log(`   ✓ I see the user: "${userName}"`);

    // Step 3: Count the trips
    const tripCards = await page.locator('[data-testid="trip-card"]').count();
    console.log(`   ✓ I see ${tripCards} trip card(s)\n`);

    // Step 4: Read the trip titles
    if (tripCards > 0) {
      console.log('📋 STEP 3: Reading trip titles...');
      const titles = await page.locator('[data-testid="trip-title"]').allTextContents();
      titles.forEach((title, i) => {
        console.log(`   ${i + 1}. "${title}"`);
      });
      console.log('');

      // Step 5: Click on the first trip
      console.log('🖱️  STEP 4: Clicking on the first trip...');
      await page.locator('[data-testid="trip-card"]').first().click();

      // Wait and see what happens
      await page.waitForTimeout(2000);

      // Check if we're on trip detail
      const hasBackButton = await page.locator('[data-testid="back-button"]').count() > 0;

      if (hasBackButton) {
        console.log('   ✓ Navigation successful! I\'m now on the trip detail page.\n');

        // Step 6: Look at the trip details
        console.log('📖 STEP 5: Reading trip details...');
        const tripTitle = await page.locator('h1').first().textContent();
        console.log(`   Trip Title: "${tripTitle}"`);

        // Look for days
        const dayHeaders = await page.locator('text=/Day \\d+/').allTextContents();
        console.log(`   Days visible: ${dayHeaders.length}`);
        dayHeaders.forEach(day => {
          console.log(`     - ${day}`);
        });

        // Look for activities
        const activities = await page.locator('h4').allTextContents();
        console.log(`   Activities found: ${activities.length}`);
        activities.slice(0, 3).forEach((activity, i) => {
          console.log(`     ${i + 1}. ${activity}`);
        });
        console.log('');

        // Step 7: Take a screenshot
        await page.screenshot({ path: 'manual-test-trip-detail.png', fullPage: true });
        console.log('📸 Screenshot saved: manual-test-trip-detail.png\n');

        // Step 8: Click back button
        console.log('⬅️  STEP 6: Clicking back button...');
        await page.locator('[data-testid="back-button"]').click();
        await page.waitForTimeout(1500);

        const backOnDashboard = await page.locator('text=My Trips').count() > 0;
        if (backOnDashboard) {
          console.log('   ✓ Successfully returned to dashboard\n');
        } else {
          console.log('   ✗ Something went wrong - not back on dashboard\n');
        }

      } else {
        console.log('   ✗ Navigation failed - no back button found\n');
      }

    } else {
      console.log('   ⚠️  No trips found to interact with\n');
    }

    // Step 9: Try clicking Create Trip button
    console.log('➕ STEP 7: Trying to click "Create Trip" button...');
    const createButton = page.locator('button:has-text("Create Trip")').first();
    await createButton.click();
    await page.waitForTimeout(1500);

    // Check if modal opened or anything changed
    const modalAppeared = await page.locator('[role="dialog"], .modal').count() > 0;
    if (modalAppeared) {
      console.log('   ✓ Modal opened!\n');
    } else {
      console.log('   ⚠️  Button clicked but no modal appeared (feature not implemented yet)\n');
    }

    // Final screenshot
    await page.screenshot({ path: 'manual-test-final.png', fullPage: true });
    console.log('📸 Final screenshot saved: manual-test-final.png\n');

    console.log('═══════════════════════════════════════');
    console.log('✅ Manual interaction test complete!');
    console.log('═══════════════════════════════════════\n');

    console.log('Keeping browser open for 10 seconds...\n');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error during manual test:', error.message);
    await page.screenshot({ path: 'manual-test-error.png' });
    console.log('📸 Error screenshot saved\n');
  } finally {
    await browser.close();
  }
}

manualTest();
