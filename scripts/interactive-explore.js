/**
 * Interactive Exploration
 * I'll explore and report everything I see, step by step
 */
import { chromium } from '@playwright/test';

async function explore() {
  console.log('🔍 Interactive Exploration Starting...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 800
  });

  const page = await browser.newContext().then(ctx => ctx.newPage());

  try {
    console.log('1️⃣  Loading dashboard...');
    await page.goto('http://localhost:3001', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Explore dashboard
    console.log('\n📊 DASHBOARD VIEW:');
    const allText = await page.locator('body').textContent();
    console.log('   All visible text:', allText.replace(/\s+/g, ' ').substring(0, 300) + '...');

    // Click first trip
    console.log('\n2️⃣  Clicking first trip card...');
    await page.locator('[data-testid="trip-card"]').first().click();
    await page.waitForTimeout(2500);

    // Explore trip detail
    console.log('\n📖 TRIP DETAIL VIEW:');
    const detailText = await page.locator('main').textContent();
    console.log('   Main content:', detailText.replace(/\s+/g, ' ').substring(0, 400));

    // Look for specific elements
    console.log('\n🔎 Looking for specific elements...');

    const h3Tags = await page.locator('h3').allTextContents();
    console.log(`   Found ${h3Tags.length} <h3> tags:`);
    h3Tags.forEach((text, i) => console.log(`     ${i + 1}. "${text}"`));

    const h4Tags = await page.locator('h4').allTextContents();
    console.log(`\n   Found ${h4Tags.length} <h4> tags (activities):`);
    h4Tags.forEach((text, i) => console.log(`     ${i + 1}. "${text}"`));

    // Check cards
    const cards = await page.locator('.card').count();
    console.log(`\n   Found ${cards} .card elements`);

    // Screenshot everything
    await page.screenshot({ path: 'explore-trip-detail.png', fullPage: true });
    console.log('\n📸 Full page screenshot saved');

    console.log('\n3️⃣  Testing navigation back...');
    await page.locator('[data-testid="back-button"]').click();
    await page.waitForTimeout(1500);

    const backOnDash = await page.locator('text=My Trips').count() > 0;
    console.log(`   Back on dashboard: ${backOnDash ? 'YES ✓' : 'NO ✗'}`);

    console.log('\n✅ Exploration complete! Browser will close in 8 seconds...\n');
    await page.waitForTimeout(8000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'explore-error.png' });
  } finally {
    await browser.close();
  }
}

explore();
