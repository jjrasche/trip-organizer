/**
 * Interactive testing script for Trip Organizer
 * Tests UI interactions, state changes, and AI chat functionality
 */
import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';
const HEADLESS = process.env.HEADLESS === 'true';
const SLOW_MO = parseInt(process.env.SLOW_MO || '500');

async function testDashboard(page) {
  console.log('\n📊 Testing Dashboard...');

  // Wait for dashboard to load
  await page.waitForSelector('text=My Trips', { timeout: 5000 });
  console.log('  ✅ Dashboard loaded');

  // Check for trip cards
  const tripCards = await page.locator('[data-testid="trip-card"]').count();
  console.log(`  ✅ Found ${tripCards} trip card(s)`);

  // Take screenshot
  await page.screenshot({ path: 'test-screenshots/dashboard.png' });
  console.log('  📸 Screenshot saved: dashboard.png');

  return tripCards;
}

async function testCreateTrip(page) {
  console.log('\n➕ Testing Create Trip...');

  // Click create trip button
  const createButton = page.locator('button:has-text("Create Trip")');
  const exists = await createButton.count() > 0;

  if (exists) {
    console.log('  ✅ Create Trip button found');
    await createButton.click();

    // Wait a moment to see if modal opens
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/create-trip-modal.png' });
    console.log('  📸 Screenshot saved: create-trip-modal.png');

    return true;
  } else {
    console.log('  ⚠️  Create Trip button not found');
    return false;
  }
}

async function testTripDetail(page, tripNumber = 0) {
  console.log('\n🗺️  Testing Trip Detail View...');

  // Click on first trip card
  const tripCards = page.locator('[data-testid="trip-card"]');
  const count = await tripCards.count();

  if (count === 0) {
    console.log('  ⚠️  No trips found to view');
    return false;
  }

  await tripCards.nth(tripNumber).click();
  await page.waitForTimeout(1000);

  // Check if we're on trip detail page
  const hasBackButton = await page.locator('button:has-text("Back")').count() > 0;
  const hasAIChat = await page.locator('[data-testid="ai-chat"]').count() > 0;

  console.log(`  ${hasBackButton ? '✅' : '❌'} Back button present`);
  console.log(`  ${hasAIChat ? '✅' : '❌'} AI Chat component present`);

  // Take screenshot
  await page.screenshot({ path: 'test-screenshots/trip-detail.png', fullPage: true });
  console.log('  📸 Screenshot saved: trip-detail.png');

  return hasBackButton && hasAIChat;
}

async function testAIChat(page) {
  console.log('\n🤖 Testing AI Chat...');

  const chatInput = page.locator('[data-testid="chat-input"]');
  const sendButton = page.locator('[data-testid="chat-send"]');

  const hasInput = await chatInput.count() > 0;
  const hasSend = await sendButton.count() > 0;

  console.log(`  ${hasInput ? '✅' : '❌'} Chat input found`);
  console.log(`  ${hasSend ? '✅' : '❌'} Send button found`);

  if (hasInput && hasSend) {
    // Try sending a message
    await chatInput.fill('What activities do we have on day 1?');
    await page.screenshot({ path: 'test-screenshots/ai-chat-input.png' });
    console.log('  📸 Screenshot saved: ai-chat-input.png');

    await sendButton.click();
    console.log('  ✅ Sent test message to AI');

    // Wait for response (or error)
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/ai-chat-response.png' });
    console.log('  📸 Screenshot saved: ai-chat-response.png');

    return true;
  }

  return false;
}

async function checkConsoleErrors(page) {
  const errors = [];
  const warnings = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });

  return { errors, warnings };
}

async function runAllTests() {
  console.log('🧪 Interactive Testing Suite');
  console.log('═══════════════════════════════════════\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Headless: ${HEADLESS}`);
  console.log(`Slow Motion: ${SLOW_MO}ms`);

  const browser = await chromium.launch({
    headless: HEADLESS,
    slowMo: SLOW_MO
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // Track errors
  const errorTracker = checkConsoleErrors(page);
  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error' && !text.includes('[vite]')) {
      consoleErrors.push(text);
      console.log(`  ❌ ${text.substring(0, 100)}...`);
    } else if (type === 'warning') {
      consoleWarnings.push(text);
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
    console.log(`  🔴 PAGE ERROR: ${error.message}`);
  });

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    console.log('\n📱 Navigating to application...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });
    console.log('  ✅ Page loaded');

    // Test 1: Dashboard
    try {
      const tripCount = await testDashboard(page);
      results.passed.push(`Dashboard loaded with ${tripCount} trips`);
    } catch (error) {
      results.failed.push(`Dashboard test failed: ${error.message}`);
    }

    // Test 2: Create Trip (if dashboard loaded)
    if (results.passed.length > 0) {
      try {
        const created = await testCreateTrip(page);
        if (created) {
          results.passed.push('Create Trip button functional');
        } else {
          results.warnings.push('Create Trip button not implemented');
        }

        // Go back to dashboard
        await page.goto(BASE_URL);
        await page.waitForTimeout(1000);
      } catch (error) {
        results.failed.push(`Create Trip test failed: ${error.message}`);
      }
    }

    // Test 3: Trip Detail
    try {
      const tripCount = await page.locator('[data-testid="trip-card"]').count();
      if (tripCount > 0) {
        const success = await testTripDetail(page);
        if (success) {
          results.passed.push('Trip detail view functional');
        } else {
          results.failed.push('Trip detail view missing components');
        }
      } else {
        results.warnings.push('No trips available to test detail view');
      }
    } catch (error) {
      results.failed.push(`Trip detail test failed: ${error.message}`);
    }

    // Test 4: AI Chat (if on trip detail page)
    try {
      const onTripPage = await page.locator('button:has-text("Back")').count() > 0;
      if (onTripPage) {
        const success = await testAIChat(page);
        if (success) {
          results.passed.push('AI Chat interface functional');
        } else {
          results.failed.push('AI Chat missing components');
        }
      }
    } catch (error) {
      results.failed.push(`AI Chat test failed: ${error.message}`);
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    results.failed.push(`Suite error: ${error.message}`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════\n');

  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach((msg, i) => {
    console.log(`   ${i + 1}. ${msg}`);
  });

  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg}`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg}`);
    });
  }

  if (consoleErrors.length > 0) {
    console.log(`\n🔴 Console Errors: ${consoleErrors.length}`);
    consoleErrors.slice(0, 5).forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg.substring(0, 150)}...`);
    });
    if (consoleErrors.length > 5) {
      console.log(`   ... and ${consoleErrors.length - 5} more`);
    }
  }

  console.log('\n═══════════════════════════════════════\n');
  console.log('Screenshots saved to test-screenshots/');

  if (!HEADLESS) {
    console.log('\nBrowser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);
  }

  await browser.close();

  // Exit with appropriate code
  const exitCode = results.failed.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Create screenshots directory
import { mkdirSync } from 'fs';
try {
  mkdirSync('test-screenshots', { recursive: true });
} catch (e) {
  // Directory already exists
}

runAllTests();
