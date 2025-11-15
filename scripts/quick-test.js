/**
 * Quick test - simpler loading strategy
 * Doesn't wait for networkidle, just loads and screenshots
 */
import { chromium } from '@playwright/test';

async function quickTest() {
  console.log('🔍 Quick Test - Simple Loading\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const errors = [];
  const warnings = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error' && !text.includes('[vite]')) {
      errors.push(text);
      console.log(`❌ ${text.substring(0, 150)}`);
    } else if (type === 'warning' && !text.includes('DevTools')) {
      warnings.push(text);
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.log(`🔴 PAGE ERROR: ${error.message}`);
  });

  try {
    console.log('📱 Loading http://localhost:3001...\n');

    // Don't wait for networkidle - just wait for domcontentloaded
    await page.goto('http://localhost:3001', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    console.log('✅ Page loaded (DOM ready)\n');

    // Wait a bit for React to render
    await page.waitForTimeout(3000);

    // Get page text
    const bodyText = await page.textContent('body');
    console.log(`📄 Page Content Preview:`);
    console.log(bodyText.substring(0, 200).replace(/\s+/g, ' '));
    console.log('\n');

    // Take screenshot
    await page.screenshot({ path: 'quick-test.png', fullPage: true });
    console.log('📸 Screenshot: quick-test.png\n');

    // Try to find specific elements
    const hasCreateButton = await page.locator('button:has-text("Create Trip")').count() > 0;
    const hasMyTrips = await page.locator('text=My Trips').count() > 0;
    const hasUserInfo = await page.locator('text=Test User').count() > 0;

    console.log('🔍 Elements Found:');
    console.log(`  ${hasMyTrips ? '✅' : '❌'} "My Trips" header`);
    console.log(`  ${hasUserInfo ? '✅' : '❌'} User info (Test User)`);
    console.log(`  ${hasCreateButton ? '✅' : '❌'} Create Trip button`);
    console.log('\n');

    if (errors.length > 0) {
      console.log(`🔴 Errors Found: ${errors.length}`);
      errors.slice(0, 3).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.substring(0, 150)}`);
      });
      console.log('\n');
    }

    if (warnings.length > 0) {
      console.log(`⚠️  Warnings: ${warnings.length}`);
      console.log('\n');
    }

    if (errors.length === 0 && hasMyTrips) {
      console.log('✅ Basic app structure looks good!');
    } else if (errors.length > 0) {
      console.log('⚠️  App loaded but has errors');
    } else {
      console.log('❌ App may not have loaded correctly');
    }

    console.log('\nBrowser will stay open for 10 seconds...\n');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

quickTest();
